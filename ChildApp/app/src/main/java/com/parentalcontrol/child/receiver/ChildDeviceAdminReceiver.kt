package com.parentalcontrol.child.receiver

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.widget.Toast

class ChildDeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Toast.makeText(context, "Waktu Sehat: perlindungan aktif", Toast.LENGTH_SHORT).show()
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        // Pesan ini muncul saat anak mencoba menonaktifkan device admin
        return "Menonaktifkan ini akan menghentikan pemantauan waktu layar. Minta orang tua untuk PIN."
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
    }
}
