package com.parentalcontrol.child.data

import com.google.firebase.database.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

data class PairingResult(val success: Boolean, val childId: String? = null, val parentId: String? = null)

class ChildFirebaseRepository {

    private val db = FirebaseDatabase.getInstance().reference

    /** Dipanggil saat anak memasukkan session code dari orang tua */
    suspend fun pairWithSessionCode(sessionCode: String, deviceName: String, deviceModel: String): PairingResult {
        val sessionSnap = db.child("pairing_sessions").child(sessionCode).get().await()
        if (!sessionSnap.exists()) return PairingResult(false)

        val parentId = sessionSnap.child("parentId").getValue(String::class.java) ?: return PairingResult(false)
        val used = sessionSnap.child("used").getValue(Boolean::class.java) ?: false
        val expiresAt = sessionSnap.child("expiresAt").getValue(Long::class.java) ?: 0L
        if (used || System.currentTimeMillis() > expiresAt) return PairingResult(false)

        val childId = db.child("devices").push().key ?: return PairingResult(false)

        // Buat entry device baru
        val deviceData = mapOf(
            "childId" to childId,
            "name" to deviceName,
            "deviceModel" to deviceModel,
            "status" to "active",
            "dailyLimitMinutes" to 120,
            "usedMinutesToday" to 0,
            "lastSeenAt" to System.currentTimeMillis(),
            "isScreenSharing" to false
        )
        db.child("devices").child(childId).setValue(deviceData).await()
        db.child("parents").child(parentId).child("children").child(childId).setValue(true).await()
        db.child("pairing_sessions").child(sessionCode).child("used").setValue(true).await()

        return PairingResult(true, childId, parentId)
    }

    fun listenCommands(childId: String): Flow<Pair<String, DataSnapshot>> = callbackFlow {
        val ref = db.child("devices").child(childId).child("commands")
        val listener = object : ChildEventListener {
            override fun onChildAdded(snapshot: DataSnapshot, previousChildName: String?) {
                trySend(snapshot.key.orEmpty() to snapshot)
            }
            override fun onChildChanged(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onChildRemoved(snapshot: DataSnapshot) {}
            override fun onChildMoved(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onCancelled(error: DatabaseError) { close(error.toException()) }
        }
        ref.addChildEventListener(listener)
        awaitClose { ref.removeEventListener(listener) }
    }

    /** Ambil snapshot device sekali saja (dipakai di loop polling, hindari listener menumpuk) */
    suspend fun getDeviceOnce(childId: String): DataSnapshot {
        return db.child("devices").child(childId).get().await()
    }

    fun listenLimitAndBlockedApps(childId: String): Flow<DataSnapshot> = callbackFlow {
        val ref = db.child("devices").child(childId)
        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) { trySend(snapshot) }
            override fun onCancelled(error: DatabaseError) { close(error.toException()) }
        }
        ref.addValueEventListener(listener)
        awaitClose { ref.removeEventListener(listener) }
    }

    suspend fun updateUsedMinutes(childId: String, minutes: Int) {
        db.child("devices").child(childId).child("usedMinutesToday").setValue(minutes).await()
        db.child("devices").child(childId).child("lastSeenAt").setValue(System.currentTimeMillis()).await()
    }

    suspend fun updateAppUsage(childId: String, packageName: String, appName: String, minutesToday: Int) {
        db.child("devices").child(childId).child("appUsage").child(packageName).setValue(
            mapOf("appName" to appName, "packageName" to packageName, "minutesToday" to minutesToday)
        ).await()
    }

    suspend fun setStatus(childId: String, status: String) {
        db.child("devices").child(childId).child("status").setValue(status).await()
    }

    suspend fun setScreenSharing(childId: String, sharing: Boolean) {
        db.child("devices").child(childId).child("isScreenSharing").setValue(sharing).await()
    }

    suspend fun clearCommand(childId: String, commandKey: String) {
        db.child("devices").child(childId).child("commands").child(commandKey).removeValue().await()
    }
}
