package com.parentalcontrol.child.ui

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.parentalcontrol.child.data.ChildFirebaseRepository
import com.parentalcontrol.child.service.UsageMonitorService
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val prefs = getSharedPreferences(UsageMonitorService.PREFS_NAME, Context.MODE_PRIVATE)
        val alreadyPaired = prefs.getString(UsageMonitorService.KEY_CHILD_ID, null) != null

        if (alreadyPaired) {
            // Sudah pairing sebelumnya -> langsung ke pengecekan izin & jalankan service
            startActivity(Intent(this, PermissionSetupActivity::class.java))
            finish()
            return
        }

        setContent {
            MaterialTheme {
                PairingInputScreen(
                    onPaired = {
                        startActivity(Intent(this, PermissionSetupActivity::class.java))
                        finish()
                    }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PairingInputScreen(onPaired: () -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val repo = remember { ChildFirebaseRepository() }
    val scope = rememberCoroutineScope()

    var code by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Scaffold(topBar = { TopAppBar(title = { Text("Hubungkan ke Orang Tua") }) }) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                "Masukkan kode 6 digit yang muncul di aplikasi orang tua",
                textAlign = TextAlign.Center,
                style = MaterialTheme.typography.bodyLarge
            )
            Spacer(Modifier.height(24.dp))
            OutlinedTextField(
                value = code,
                onValueChange = { if (it.length <= 6) code = it.filter { c -> c.isDigit() } },
                label = { Text("Kode Pairing") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            errorMessage?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, color = MaterialTheme.colorScheme.error, textAlign = TextAlign.Center)
            }
            Spacer(Modifier.height(24.dp))
            Button(
                onClick = {
                    isLoading = true
                    errorMessage = null
                    scope.launch {
                        val result = repo.pairWithSessionCode(
                            sessionCode = code,
                            deviceName = "HP Anak",
                            deviceModel = "${Build.MANUFACTURER} ${Build.MODEL}"
                        )
                        isLoading = false
                        if (result.success && result.childId != null) {
                            context.getSharedPreferences(UsageMonitorService.PREFS_NAME, Context.MODE_PRIVATE)
                                .edit()
                                .putString(UsageMonitorService.KEY_CHILD_ID, result.childId)
                                .apply()
                            onPaired()
                        } else {
                            errorMessage = "Kode tidak valid atau sudah kedaluwarsa. Minta kode baru dari orang tua."
                        }
                    }
                },
                enabled = code.length == 6 && !isLoading,
                modifier = Modifier.fillMaxWidth()
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp))
                } else {
                    Text("Hubungkan")
                }
            }
        }
    }
}
