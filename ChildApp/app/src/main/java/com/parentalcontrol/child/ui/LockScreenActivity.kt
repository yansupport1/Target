package com.parentalcontrol.child.ui

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.ValueEventListener
import com.parentalcontrol.child.service.UsageMonitorService

/**
 * Ditampilkan full-screen saat status device = "locked" (waktu habis atau
 * dikunci manual oleh parent). Otomatis menutup diri saat parent unlock
 * dari dashboard (listener realtime ke Firebase).
 */
class LockScreenActivity : ComponentActivity() {

    private var listener: ValueEventListener? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val prefs = getSharedPreferences(UsageMonitorService.PREFS_NAME, Context.MODE_PRIVATE)
        val childId = prefs.getString(UsageMonitorService.KEY_CHILD_ID, null)

        setContent {
            LockScreenContent()
        }

        if (childId != null) {
            val ref = FirebaseDatabase.getInstance().reference.child("devices").child(childId).child("status")
            listener = object : ValueEventListener {
                override fun onDataChange(snapshot: DataSnapshot) {
                    val status = snapshot.getValue(String::class.java)
                    if (status == "active") {
                        finish()
                    }
                }
                override fun onCancelled(error: DatabaseError) {}
            }
            ref.addValueEventListener(listener as ValueEventListener)
        }
    }

    override fun onBackPressed() {
        // Sengaja diabaikan: tombol back tidak menutup lock screen.
    }

    override fun onDestroy() {
        super.onDestroy()
        val prefs = getSharedPreferences(UsageMonitorService.PREFS_NAME, Context.MODE_PRIVATE)
        val childId = prefs.getString(UsageMonitorService.KEY_CHILD_ID, null)
        if (childId != null && listener != null) {
            FirebaseDatabase.getInstance().reference
                .child("devices").child(childId).child("status")
                .removeEventListener(listener as ValueEventListener)
        }
    }
}

@Composable
private fun LockScreenContent() {
    MaterialTheme {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF111827)),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                Icons.Default.Lock,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(72.dp)
            )
            Spacer(Modifier.height(24.dp))
            Text(
                "Waktu bermain HP hari ini sudah habis",
                color = Color.White,
                style = MaterialTheme.typography.headlineSmall,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 32.dp)
            )
            Spacer(Modifier.height(12.dp))
            Text(
                "Minta orang tua untuk membuka kunci dari aplikasinya ya.",
                color = Color(0xFF9CA3AF),
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 32.dp)
            )
        }
    }
}
