# Child App — "Waktu Sehat"

Aplikasi yang terpasang di HP anak. Terhubung ke project Firebase yang sama
dengan Parent App (`control-anak-ec236`), pakai Realtime Database untuk sync.

## Alur pemakaian

1. Anak buka app pertama kali → diminta masukkan **6-digit session code**
   dari Parent App
2. Setelah pairing berhasil → diarahkan ke layar **Izinkan Akses** untuk
   mengaktifkan 4 izin sistem (lihat tabel di bawah)
3. Setelah semua izin aktif → `UsageMonitorService` mulai jalan sebagai
   foreground service permanen (auto-restart setelah reboot)

## Izin yang dipakai & untuk fitur apa

| Izin | Untuk fitur |
|---|---|
| `PACKAGE_USAGE_STATS` (Usage Access) | Hitung total menit pemakaian harian |
| `SYSTEM_ALERT_WINDOW` (Overlay) | Tampilkan layar kunci full-screen |
| `BIND_ACCESSIBILITY_SERVICE` | Deteksi app aktif, force-close app yang diblokir |
| `BIND_DEVICE_ADMIN` | Cegah uninstall/disable app sembarangan oleh anak |
| `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_DATA_SYNC` | Service monitoring jalan terus di background |
| `FOREGROUND_SERVICE_MEDIA_PROJECTION` | Live screen monitoring |
| `POST_NOTIFICATIONS` | Notifikasi wajib Android 13+ untuk foreground service |
| `RECEIVE_BOOT_COMPLETED` | Auto-start monitoring setelah HP restart |

Semua ini "special permission" — Android sengaja mewajibkan user membuka
halaman Settings khusus satu-satu untuk approve (tidak bisa lewat dialog
permission biasa), makanya ada layar **PermissionSetupActivity** yang
mengarahkan ke tiap Settings page-nya.

## ⚠️ Bagian yang masih perlu kamu selesaikan

Saya jujur soal ini supaya tidak ada surprise saat testing:

1. **`ChildApplication.kt` — `databaseUrl`**: kamu WAJIB ganti value
   `setDatabaseUrl(...)` dengan URL Realtime Database asli project kamu.
   Cek di Firebase Console → Realtime Database → lihat URL persis di bagian
   atas halaman. Kalau salah/kosong, semua fitur Firebase di app ini gagal.

2. **`ScreenCaptureService.kt` — capture frame belum diisi**: struktur
   service (lifecycle, notifikasi wajib, sync status ke Firebase) sudah
   jadi, tapi bagian teknis `MediaProjection` + `VirtualDisplay` +
   `ImageReader` untuk ambil frame layar dan kirim ke server/Storage
   sengaja saya kosongkan — ini butuh testing di device fisik (banyak
   variasi antar merk HP) dan juga perlu activity terpisah untuk minta izin
   capture (`MediaProjectionManager.createScreenCaptureIntent()` mengembalikan
   hasil lewat `ActivityResult`, tidak bisa dipanggil dari Service langsung).
   Bilang aja kalau mau saya lanjutkan bagian ini.

3. **Auto-grant Accessibility Service**: Google **tidak mengizinkan** app
   mengaktifkan Accessibility Service sendiri secara otomatis (harus manual
   oleh user lewat Settings) — ini kebijakan keamanan Android, bukan
   keterbatasan kode. Makanya ada `PermissionSetupActivity` yang
   mengarahkan ke halaman itu.

## Testing sebelum dianggap "jadi"

Checklist yang wajib dicoba manual di device fisik (bukan cuma emulator,
karena beberapa OEM seperti Xiaomi/Oppo/Vivo punya battery optimization
yang bisa mematikan foreground service):

- [ ] Pairing dengan kode dari Parent App berhasil
- [ ] Semua 4 izin bisa diaktifkan dari `PermissionSetupActivity`
- [ ] Buka app yang di-blok dari Parent App → langsung ke-home otomatis
- [ ] Set limit waktu kecil (misal 2 menit) → lock screen muncul otomatis
      saat limit tercapai
- [ ] Parent klik Unlock dari dashboard → lock screen di HP anak hilang
      otomatis
- [ ] Restart HP → service tetap jalan tanpa perlu buka app manual
- [ ] Battery optimization di-disable untuk app ini (Settings → Apps →
      Waktu Sehat → Battery → Unrestricted), supaya tidak di-kill sistem

## Build via GitHub Actions

Sama seperti Parent App — push ke `main`, cek tab **Actions**, download
APK dari **Artifacts**. Child App ini tidak butuh secret Firebase karena
config-nya sudah tertanam langsung di `ChildApplication.kt` (config Web
SDK, bukan file kredensial rahasia — apiKey Firebase Web memang didesain
untuk publik, keamanan datanya ada di Firebase Security Rules, bukan
di kerahasiaan apiKey).
