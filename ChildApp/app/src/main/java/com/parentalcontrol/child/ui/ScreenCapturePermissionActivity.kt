package com.parentalcontrol.child.ui

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import com.parentalcontrol.child.service.ScreenCaptureService

/**
 * Activity transparan/tak terlihat yang cuma bertugas memicu dialog izin
 * "Mulai merekam atau mentransmisikan layar Anda?" dari sistem Android,
 * lalu mengoper hasilnya (resultCode + data Intent) ke ScreenCaptureService.
 *
 * Ini tidak bisa disatukan ke dalam Service karena hasil izin MediaProjection
 * HANYA bisa diterima lewat startActivityForResult/ActivityResult API,
 * yang notabene cuma tersedia di Activity — ketentuan API Android, bukan
 * pilihan desain.
 */
class ScreenCapturePermissionActivity : ComponentActivity() {

    private val requestCapture = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            val serviceIntent = Intent(this, ScreenCaptureService::class.java).apply {
                putExtra(ScreenCaptureService.EXTRA_RESULT_CODE, result.resultCode)
                putExtra(ScreenCaptureService.EXTRA_RESULT_DATA, result.data)
            }
            startForegroundService(serviceIntent)
        }
        finish()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        requestCapture.launch(projectionManager.createScreenCaptureIntent())
    }
}
