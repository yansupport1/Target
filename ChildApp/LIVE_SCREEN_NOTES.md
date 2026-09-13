## Firebase Storage Rules (tambahan untuk live screen monitoring)

Selain Realtime Database rules yang sudah ada di README Parent App, kamu juga
perlu set rules untuk **Storage** (tempat frame layar anak disimpan). Buka
Firebase Console → Storage → Rules, lalu pakai ini sebagai dasar:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /live_screens/{childId}/{fileName} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Catatan: rules di atas masih longgar (siapa saja yang login bisa
baca/tulis semua folder anak). Untuk versi production yang lebih aman,
sebaiknya tambahkan pengecekan bahwa `childId` benar-benar terdaftar di
bawah `parentId` milik user yang login — tapi itu butuh Firestore/RTDB
lookup dalam rules yang agak lebih kompleks. Untuk pemakaian pribadi
(1 keluarga, tidak dipublikasikan luas), rules di atas cukup aman.

## Cara kerja live screen (ringkas)

1. Parent klik "Mulai Pantau Layar" → command `REQUEST_SCREEN` terkirim
2. Child App terima command → buka `ScreenCapturePermissionActivity`
   (activity transparan yang memicu dialog izin sistem Android
   "Mulai merekam layar Anda?")
3. **Anak akan melihat dialog ini** — ini kotak dialog resmi Android,
   tidak bisa dilewati/disembunyikan (ketentuan sistem, sama seperti
   izin kamera/mikrofon)
4. Kalau anak/HP setuju → `ScreenCaptureService` mulai ambil screenshot
   tiap 5 detik, upload ke Storage sebagai `live_screens/{childId}/latest.jpg`
5. Parent App menampilkan gambar itu, auto-refresh tiap 5 detik

**Kalau anak menolak dialog itu**, live screen tidak akan aktif — ini
bukan bug, tapi memang cara Android melindungi privasi pengguna device.
Tidak ada cara teknis untuk melewati dialog persetujuan ini.
