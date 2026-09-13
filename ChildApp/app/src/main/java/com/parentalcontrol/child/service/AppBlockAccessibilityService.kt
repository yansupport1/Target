package com.parentalcontrol.child.service

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.view.accessibility.AccessibilityEvent
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.ValueEventListener
import com.parentalcontrol.child.ui.LockScreenActivity

/**
 * Mendengarkan setiap kali app di foreground berganti (window state changed).
 * Kalau package name termasuk yang diblokir orang tua, langsung tampilkan
 * layar lock/blokir dan kembali ke home.
 */
class AppBlockAccessibilityService : AccessibilityService() {

    private var blockedApps: Set<String> = emptySet()
    private var deviceStatus: String = "active"
    private lateinit var prefs: SharedPreferences
    private var dbListener: ValueEventListener? = null

    override fun onServiceConnected() {
        super.onServiceConnected()
        prefs = getSharedPreferences(UsageMonitorService.PREFS_NAME, Context.MODE_PRIVATE)
        val childId = prefs.getString(UsageMonitorService.KEY_CHILD_ID, null) ?: return

        val ref = FirebaseDatabase.getInstance().reference.child("devices").child(childId)
        dbListener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                blockedApps = snapshot.child("blockedApps").children
                    .filter { it.getValue(Boolean::class.java) == true }
                    .mapNotNull { it.key }
                    .toSet()
                deviceStatus = snapshot.child("status").getValue(String::class.java) ?: "active"
            }
            override fun onCancelled(error: DatabaseError) {}
        }
        ref.addValueEventListener(dbListener as ValueEventListener)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val packageName = event.packageName?.toString() ?: return

        if (deviceStatus == "locked") {
            openLockScreen()
            return
        }

        if (blockedApps.contains(packageName)) {
            // Tutup app yang diblokir dengan kembali ke home screen
            performGlobalAction(GLOBAL_ACTION_HOME)
        }
    }

    private fun openLockScreen() {
        val intent = Intent(this, LockScreenActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        startActivity(intent)
    }

    override fun onInterrupt() {}

    override fun onDestroy() {
        super.onDestroy()
        val childId = prefs.getString(UsageMonitorService.KEY_CHILD_ID, null)
        if (childId != null && dbListener != null) {
            FirebaseDatabase.getInstance().reference
                .child("devices").child(childId)
                .removeEventListener(dbListener as ValueEventListener)
        }
    }
}
