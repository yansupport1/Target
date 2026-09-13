package com.parentalcontrol.child

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions

/**
 * Inisialisasi Firebase secara manual pakai config Web SDK yang diberikan.
 * Ini alternatif dari google-services.json (yang butuh app Android terdaftar
 * terpisah di Firebase Console). Cara ini valid dan tetap connect ke project
 * Firebase yang sama, hanya FCM push notification butuh setup tambahan
 * (lihat README bagian "Push Notification / FCM").
 *
 * PENTING: databaseUrl di bawah HARUS kamu isi sendiri sesuai region database-mu.
 * Cek di Firebase Console -> Realtime Database -> lihat URL di bagian atas,
 * biasanya format: https://control-anak-ec236-default-rtdb.asia-southeast1.firebasedatabase.app
 * atau https://control-anak-ec236-default-rtdb.firebaseio.com
 */
class ChildApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        val options = FirebaseOptions.Builder()
            .setApiKey("AIzaSyD7T70xDcGwzsJNwJAN6FqJCYpUZf5PEk4")
            .setApplicationId("1:221212113463:web:9910372a35c57b94e79db2")
            .setProjectId("control-anak-ec236")
            .setStorageBucket("control-anak-ec236.firebasestorage.app")
            .setGcmSenderId("221212113463")
            // GANTI dengan Realtime Database URL asli project kamu:
            .setDatabaseUrl("https://control-anak-ec236-default-rtdb.firebaseio.com")
            .build()

        if (FirebaseApp.getApps(this).isEmpty()) {
            FirebaseApp.initializeApp(this, options)
        }
    }
}
