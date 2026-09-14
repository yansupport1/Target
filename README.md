# Ryvexis AI

Aplikasi chat AI — tema liquid glass, login Google (Firebase Auth), chat log realtime (Firebase Realtime Database), multi-provider AI (Gemini/OpenAI/Anthropic/Groq/dll).

## Cara pakai

1. Upload semua file & folder ini (`index.html`, `style.css`, `config.js`, `app.js`, folder `assets/`) ke hosting kamu (Vercel, dll), satu folder yang sama — jangan pisah lokasinya.
2. Buka `index.html` (atau domain hosting-nya). Selama Firebase belum lengkap dikonfigurasi, app tetap jalan penuh pakai penyimpanan lokal (localStorage) — tinggal pakai tombol "Lanjutkan tanpa akun".

## Setup Firebase (biar login Google + chat realtime aktif)

Config Firebase kamu **sudah ditempel** di `config.js` (`FIREBASE_CONFIG`). Yang masih perlu disiapkan manual di Firebase Console:

1. **Aktifkan Realtime Database**
   - Firebase Console → project `my-ai-f857a` → menu **Realtime Database** → **Create Database**
   - Pilih lokasi server terdekat, mode bebas (aktifkan security rules setelahnya, lihat poin 4)
   - Setelah dibuat, salin **URL** yang muncul di atas (bentuknya `https://my-ai-f857a-default-rtdb.<region>.firebasedatabase.app`)
   - Tempel URL itu ke `databaseURL` di `config.js`, gantikan `"GANTI_DENGAN_DATABASE_URL_KAMU"`

2. **Aktifkan provider login**
   - Firebase Console → **Authentication** → **Sign-in method**
   - Aktifkan **Google**
   - Aktifkan juga **Anonymous** (dipakai tombol "Lanjutkan tanpa akun" biar tetap tersinkron ke cloud, bukan cuma localStorage)

3. **Tambahkan domain hosting kamu**
   - Firebase Console → **Authentication** → **Settings** → **Authorized domains**
   - Tambahkan domain tempat app ini di-hosting, misal `ryvexis-ai.vercel.app`

4. **Amankan Realtime Database** (penting, jangan dilewati)
   - Firebase Console → **Realtime Database** → tab **Rules**
   - Pakai rules berikut supaya tiap user cuma bisa baca/tulis chat miliknya sendiri:
   ```json
   {
     "rules": {
       "users": {
         "$uid": {
           ".read": "$uid === auth.uid",
           ".write": "$uid === auth.uid"
         }
       }
     }
   }
   ```

Setelah `databaseURL` diisi dan langkah di atas selesai, refresh app — sidebar akan menampilkan indikator **"Realtime tersambung"** dan semua chat otomatis tersimpan &tersinkron di Firebase (bisa dibuka dari perangkat lain, tidak hilang walau cache browser dibersihkan).

## Nambah model AI baru

Buka `config.js`, tambah objek baru di array `MODELS` (sudah ada contoh untuk OpenAI, Anthropic, dan Groq — tinggal hapus komentar & isi API key-nya di `PROVIDER_KEYS`). Tidak perlu ubah `app.js` sama sekali selama provider-nya `gemini`, `openai-compatible`, atau `anthropic`.

## Struktur

- `index.html` — halaman login + struktur app
- `style.css` — tema liquid glass (violet–cyan, panel kaca berlapis)
- `config.js` — Firebase config, API key AI, daftar model AI (edit di sini)
- `app.js` — logika login, chat realtime, panggil API AI
- `assets/` — logo Ryvexis AI (icon + favicon)
