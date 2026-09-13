package com.parentalcontrol.child.ui

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.parentalcontrol.child.receiver.ChildDeviceAdminReceiver
import com.parentalcontrol.child.service.UsageMonitorService

/**
 * Menu satu-pintu untuk mengaktifkan semua izin sistem yang dibutuhkan:
 * 1. Usage Access (hitung durasi pemakaian)
 * 2. Overlay / Draw over other apps (tampilkan lock screen)
 * 3. Accessibility Service (deteksi & blokir app)
 * 4. Device Admin (cegah uninstall sembarangan)
 * 5. Notification (Android 13+)
 *
 * Setiap izin ini butuh dialog sistem Android sendiri-sendiri —
 * tidak bisa diminta sekaligus dalam satu request seperti runtime
 * permission biasa, karena semuanya "special permission".
 */
class PermissionSetupActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                PermissionSetupScreen(
                    onAllGranted = { startMonitoringAndFinish() }
                )
            }
        }
    }

    private fun startMonitoringAndFinish() {
        val serviceIntent = Intent(this, UsageMonitorService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
        finish()
    }
}

@Composable
private fun PermissionSetupScreen(onAllGranted: () -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current

    var usageGranted by remember { mutableStateOf(hasUsageAccess(context)) }
    var overlayGranted by remember { mutableStateOf(Settings.canDrawOverlays(context)) }
    var accessibilityGranted by remember { mutableStateOf(isAccessibilityEnabled(context)) }
    var deviceAdminGranted by remember { mutableStateOf(isDeviceAdminActive(context)) }

    // Re-check tiap kali activity ini kembali ke foreground (setelah user balik dari Settings)
    val lifecycleOwner = androidx.lifecycle.compose.LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) {
                usageGranted = hasUsageAccess(context)
                overlayGranted = Settings.canDrawOverlays(context)
                accessibilityGranted = isAccessibilityEnabled(context)
                deviceAdminGranted = isDeviceAdminActive(context)
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val allGranted = usageGranted && overlayGranted && accessibilityGranted && deviceAdminGranted

    Scaffold(topBar = { TopAppBar(title = { Text("Izinkan Akses") }) }) { padding ->
        Column(modifier = Modifier.padding(padding).padding(20.dp)) {
            Text(
                "Supaya fitur pembatasan waktu & pemantauan bisa jalan, aktifkan 4 izin berikut:",
                style = MaterialTheme.typography.bodyMedium
            )
            Spacer(Modifier.height(16.dp))

            PermissionRow(
                title = "Akses Penggunaan (Usage Access)",
                granted = usageGranted,
                onClick = { context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)) }
            )
            PermissionRow(
                title = "Tampil di Atas Aplikasi Lain",
                granted = overlayGranted,
                onClick = {
                    context.startActivity(
                        Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
                    )
                }
            )
            PermissionRow(
                title = "Layanan Aksesibilitas",
                granted = accessibilityGranted,
                onClick = { context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }
            )
            PermissionRow(
                title = "Admin Perangkat",
                granted = deviceAdminGranted,
                onClick = {
                    val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                        putExtra(
                            DevicePolicyManager.EXTRA_DEVICE_ADMIN,
                            ComponentName(context, ChildDeviceAdminReceiver::class.java)
                        )
                        putExtra(
                            DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                            "Diperlukan supaya aplikasi tidak bisa dihapus sembarangan"
                        )
                    }
                    context.startActivity(intent)
                }
            )

            Spacer(Modifier.height(24.dp))
            Button(
                onClick = onAllGranted,
                enabled = allGranted,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(if (allGranted) "Selesai, Mulai Pemantauan" else "Lengkapi Semua Izin Dulu")
            }
        }
    }
}

@Composable
private fun PermissionRow(title: String, granted: Boolean, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
        ) {
            Icon(
                if (granted) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                contentDescription = null,
                tint = if (granted) Color(0xFF16A34A) else Color.Gray
            )
            Spacer(Modifier.width(12.dp))
            Text(title, modifier = Modifier.weight(1f))
        }
    }
}

private fun hasUsageAccess(context: Context): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as android.app.AppOpsManager
    val mode = appOps.checkOpNoThrow(
        android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
        android.os.Process.myUid(), context.packageName
    )
    return mode == android.app.AppOpsManager.MODE_ALLOWED
}

private fun isAccessibilityEnabled(context: Context): Boolean {
    val enabledServices = Settings.Secure.getString(
        context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
    ) ?: return false
    return enabledServices.contains(context.packageName)
}

private fun isDeviceAdminActive(context: Context): Boolean {
    val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    return dpm.isAdminActive(ComponentName(context, ChildDeviceAdminReceiver::class.java))
}
