package com.parentalcontrol.child.service

import android.app.*
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.parentalcontrol.child.data.ChildFirebaseRepository
import com.parentalcontrol.child.ui.LockScreenActivity
import kotlinx.coroutines.*
import java.util.Calendar

/**
 * Foreground service yang jalan terus untuk:
 * 1. Menghitung total menit pemakaian hari ini via UsageStatsManager
 * 2. Sinkron angka itu ke Firebase supaya Parent App bisa lihat realtime
 * 3. Kalau usedMinutes >= dailyLimitMinutes -> trigger lock screen otomatis
 * 4. Dengarkan command dari parent (LOCK/UNLOCK/SET_LIMIT/dst) dan eksekusi
 */
class UsageMonitorService : Service() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val repo = ChildFirebaseRepository()
    private lateinit var prefs: SharedPreferences

    companion object {
        const val CHANNEL_ID = "usage_monitor_channel"
        const val NOTIFICATION_ID = 1001
        const val PREFS_NAME = "child_prefs"
        const val KEY_CHILD_ID = "child_id"
        const val POLL_INTERVAL_MS = 60_000L // cek tiap 1 menit
    }

    override fun onCreate() {
        super.onCreate()
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val childId = prefs.getString(KEY_CHILD_ID, null)
        if (childId != null) {
            startUsagePolling(childId)
            listenParentCommands(childId)
        }
        return START_STICKY
    }

    private fun startUsagePolling(childId: String) {
        scope.launch {
            while (isActive) {
                val minutesToday = calculateUsageMinutesToday()
                repo.updateUsedMinutes(childId, minutesToday)

                val snapshot = repo.getDeviceOnce(childId)
                val limit = snapshot.child("dailyLimitMinutes").getValue(Int::class.java) ?: 120
                val status = snapshot.child("status").getValue(String::class.java) ?: "active"
                if (minutesToday >= limit && status != "locked") {
                    repo.setStatus(childId, "locked")
                    triggerLockScreen()
                }

                delay(POLL_INTERVAL_MS)
            }
        }
    }

    private fun listenParentCommands(childId: String) {
        scope.launch {
            repo.listenCommands(childId).collect { (key, snapshot) ->
                val type = snapshot.child("type").getValue(String::class.java) ?: return@collect
                when (type) {
                    "LOCK" -> triggerLockScreen()
                    "UNLOCK" -> dismissLockScreen()
                    "REQUEST_SCREEN" -> {
                        val permIntent = Intent(this@UsageMonitorService, com.parentalcontrol.child.ui.ScreenCapturePermissionActivity::class.java).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(permIntent)
                    }
                    "STOP_SCREEN" -> {
                        stopService(Intent(this@UsageMonitorService, ScreenCaptureService::class.java))
                    }
                    // SET_LIMIT dan TOGGLE_APP_BLOCK sudah auto-sync lewat listenLimitAndBlockedApps
                    // dan dibaca langsung oleh AppBlockAccessibilityService
                }
                repo.clearCommand(childId, key)
            }
        }
    }

    /** Hitung total menit layar aktif hari ini (dari jam 00:00) */
    private fun calculateUsageMinutesToday(): Int {
        val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val cal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
        }
        val startTime = cal.timeInMillis
        val endTime = System.currentTimeMillis()

        val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime)
        val totalMs = stats?.sumOf { it.totalTimeInForeground } ?: 0L
        return (totalMs / 1000 / 60).toInt()
    }

    private fun triggerLockScreen() {
        val intent = Intent(this, LockScreenActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        startActivity(intent)
    }

    private fun dismissLockScreen() {
        // LockScreenActivity mendengarkan perubahan status "active" langsung dari Firebase
        // dan menutup dirinya sendiri (lihat LockScreenActivity).
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, "Pemantauan Waktu Layar", NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Waktu Sehat aktif")
            .setContentText("Memantau waktu pemakaian layar")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
