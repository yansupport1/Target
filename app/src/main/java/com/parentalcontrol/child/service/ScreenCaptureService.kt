package com.parentalcontrol.child.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.util.DisplayMetrics
import androidx.core.app.NotificationCompat
import com.google.firebase.storage.FirebaseStorage
import com.parentalcontrol.child.data.ChildFirebaseRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream

/**
 * Foreground service untuk live screen monitoring.
 *
 * PENTING (ketentuan sistem Android, bukan pilihan desain):
 * MediaProjection WAJIB menampilkan notifikasi persisten yang terlihat
 * oleh pengguna device selama sesi capture berjalan. Ini tidak bisa
 * disembunyikan — dan memang sebaiknya begitu, supaya anak selalu tahu
 * kapan layarnya sedang dipantau.
 *
 * Cara kerja: ambil screenshot tiap beberapa detik (bukan video streaming
 * penuh, supaya hemat kuota & baterai), lalu upload ke Firebase Storage.
 * Parent App tinggal baca URL gambar terbaru dari Storage.
 */
class ScreenCaptureService : Service() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val repo = ChildFirebaseRepository()
    private lateinit var prefs: SharedPreferences

    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var handlerThread: HandlerThread? = null
    private var captureHandler: Handler? = null
    private var captureJob: Job? = null

    private var screenWidth = 720
    private var screenHeight = 1280
    private var screenDensity = DisplayMetrics.DENSITY_DEFAULT

    companion object {
        const val CHANNEL_ID = "screen_capture_channel"
        const val NOTIFICATION_ID = 2001
        const val EXTRA_RESULT_CODE = "extra_result_code"
        const val EXTRA_RESULT_DATA = "extra_result_data"
        const val CAPTURE_INTERVAL_MS = 5000L // ambil 1 frame tiap 5 detik
    }

    override fun onCreate() {
        super.onCreate()
        prefs = getSharedPreferences(UsageMonitorService.PREFS_NAME, Context.MODE_PRIVATE)
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())

        val metrics = resources.displayMetrics
        screenWidth = metrics.widthPixels
        screenHeight = metrics.heightPixels
        screenDensity = metrics.densityDpi

        handlerThread = HandlerThread("ScreenCaptureThread").apply { start() }
        captureHandler = Handler(handlerThread!!.looper)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val resultCode = intent?.getIntExtra(EXTRA_RESULT_CODE, Activity_RESULT_CANCELED) ?: Activity_RESULT_CANCELED
        val resultData: Intent? = intent?.getParcelableExtra(EXTRA_RESULT_DATA)

        if (resultCode != Activity_RESULT_CANCELED && resultData != null && mediaProjection == null) {
            startCapture(resultCode, resultData)
        }
        return START_STICKY
    }

    private fun startCapture(resultCode: Int, resultData: Intent) {
        val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        mediaProjection = projectionManager.getMediaProjection(resultCode, resultData)

        imageReader = ImageReader.newInstance(screenWidth, screenHeight, android.graphics.PixelFormat.RGBA_8888, 2)

        virtualDisplay = mediaProjection?.createVirtualDisplay(
            "WaktuSehatScreenCapture",
            screenWidth, screenHeight, screenDensity,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader?.surface, null, captureHandler
        )

        val childId = prefs.getString(UsageMonitorService.KEY_CHILD_ID, null)
        if (childId != null) {
            scope.launch { repo.setScreenSharing(childId, true) }
        }

        // Loop ambil 1 frame tiap CAPTURE_INTERVAL_MS, lalu upload
        captureJob = scope.launch {
            while (mediaProjection != null) {
                captureFrameAndUpload(childId)
                kotlinx.coroutines.delay(CAPTURE_INTERVAL_MS)
            }
        }
    }

    private suspend fun captureFrameAndUpload(childId: String?) {
        if (childId == null) return
        val reader = imageReader ?: return

        val image: Image = reader.acquireLatestImage() ?: return
        try {
            val bitmap = imageToBitmap(image)
            val jpegBytes = bitmapToJpegBytes(bitmap)
            uploadFrame(childId, jpegBytes)
        } catch (e: Exception) {
            // Gagal satu frame bukan hal fatal — lanjut ke frame berikutnya
        } finally {
            image.close()
        }
    }

    private fun imageToBitmap(image: Image): Bitmap {
        val plane = image.planes[0]
        val buffer = plane.buffer
        val pixelStride = plane.pixelStride
        val rowStride = plane.rowStride
        val rowPadding = rowStride - pixelStride * screenWidth

        val bitmap = Bitmap.createBitmap(
            screenWidth + rowPadding / pixelStride, screenHeight, Bitmap.Config.ARGB_8888
        )
        bitmap.copyPixelsFromBuffer(buffer)
        return Bitmap.createBitmap(bitmap, 0, 0, screenWidth, screenHeight)
    }

    private fun bitmapToJpegBytes(bitmap: Bitmap): ByteArray {
        val stream = ByteArrayOutputStream()
        // Kompres cukup rendah (40%) — ini cuma untuk preview pemantauan, bukan arsip kualitas tinggi
        bitmap.compress(Bitmap.CompressFormat.JPEG, 40, stream)
        return stream.toByteArray()
    }

    private suspend fun uploadFrame(childId: String, jpegBytes: ByteArray) {
        val storageRef = FirebaseStorage.getInstance().reference
            .child("live_screens")
            .child(childId)
            .child("latest.jpg")
        storageRef.putBytes(jpegBytes).result
    }

    private fun stopCapture() {
        captureJob?.cancel()
        virtualDisplay?.release()
        imageReader?.close()
        mediaProjection?.stop()
        virtualDisplay = null
        imageReader = null
        mediaProjection = null
    }

    override fun onDestroy() {
        super.onDestroy()
        val childId = prefs.getString(UsageMonitorService.KEY_CHILD_ID, null)
        if (childId != null) {
            scope.launch { repo.setScreenSharing(childId, false) }
        }
        stopCapture()
        handlerThread?.quitSafely()
        scope.cancel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, "Pemantauan Layar Langsung", NotificationManager.IMPORTANCE_HIGH
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Layar sedang dipantau orang tua")
            .setContentText("Orang tua sedang melihat layar HP ini")
            .setSmallIcon(android.R.drawable.ic_menu_view)
            .setOngoing(true)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}

// Alias supaya tidak bentrok import Activity.RESULT_CANCELED di file Service (bukan Activity)
private const val Activity_RESULT_CANCELED = 0
