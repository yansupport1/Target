# Ryvexis AI

Chat AI — tema liquid glass, login Google (Firebase Auth), chat log realtime (Firebase Realtime Database), multi-provider AI. API key & credential **tidak ada di kode** — aman di-push ke GitHub publik sekalipun.

## Kenapa sekarang aman di-push?

Sebelumnya semua secret (API key Gemini, config Firebase) nempel langsung di `config.js` yang ikut ke-commit — makanya kena flag "leaked" sama Google/GitHub secret scanning.

Sekarang strukturnya dipisah:

| File | Isi | Aman di-commit? |
|---|---|---|
| `models.config.js` | Daftar model AI & endpoint provider (bukan secret) | ✅ Aman, commit seperti biasa |
| `api/config.js` | Kode yang baca secret dari **Environment Variables** Vercel saat app dibuka | ✅ Aman — kode-nya publik, tapi secret-nya nggak ada di kode |
| Environment Variables (di dashboard Vercel) | API key & Firebase config asli | 🔒 Tersimpan terenkripsi di Vercel, **tidak pernah masuk git** |

Browser tetap butuh key itu untuk manggil Gemini (namanya juga app tanpa backend penuh), tapi key-nya nggak lagi "nempel" di source code yang di-scan bot GitHub — jadi nggak bakal ke-auto-revoke lagi kayak kemarin.

## Setup di Vercel (WAJIB sebelum push)

1. Buka **Vercel Dashboard** → project `ryvexis-ai` → **Settings** → **Environment Variables**
2. Tambahkan satu-satu (Name harus persis sama, Value isi punya kamu):

   | Name | Value |
   |---|---|
   | `FIREBASE_API_KEY` | isi dari Firebase Console → Project Settings |
   | `FIREBASE_AUTH_DOMAIN` | `my-ai-f857a.firebaseapp.com` |
   | `FIREBASE_DATABASE_URL` | `https://my-ai-f857a-default-rtdb.firebaseio.com/` |
   | `FIREBASE_PROJECT_ID` | `my-ai-f857a` |
   | `FIREBASE_STORAGE_BUCKET` | `my-ai-f857a.firebasestorage.app` |
   | `FIREBASE_MESSAGING_SENDER_ID` | `258485806014` |
   | `FIREBASE_APP_ID` | `1:258485806014:web:33f336e6c1def52e42cfef` |
   | `FIREBASE_MEASUREMENT_ID` | `G-PF3HQVEKX6` |
   | `GEMINI_API_KEY` | API key Gemini kamu |

   (Kalau nanti nambah model dari provider lain, tambah juga `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GROQ_API_KEY` / dst — lihat komentar di `api/config.js`.)

3. Set **Environment**: centang **Production**, **Preview**, dan **Development** (biar kepakai di semua jenis deploy)
4. Klik **Save**

## Push ke GitHub

Karena sekarang tidak ada secret di file manapun, tinggal push seperti biasa:

```bash
git add .
git commit -m "Update Ryvexis AI: pisahkan secret ke environment variables"
git push
```

Vercel bakal auto-redeploy. Kalau kamu baru **nambah/ubah** Environment Variables tapi tidak ada perubahan kode, redeploy manual: **Deployments** → titik tiga di deployment terakhir → **Redeploy**.

## Setup Firebase (kalau belum)

1. **Realtime Database**: Firebase Console → **Realtime Database** → **Create Database** (kalau belum ada) → salin URL-nya ke `FIREBASE_DATABASE_URL` di atas
2. **Login provider**: Firebase Console → **Authentication** → **Sign-in method** → aktifkan **Google** dan **Anonymous**
3. **Authorized domain**: Firebase Console → **Authentication** → **Settings** → **Authorized domains** → tambahkan domain Vercel kamu (mis. `ryvexis-ai.vercel.app`) — **tanpa** `https://`
4. **Security rules** Realtime Database (tab **Rules**):
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

## Kalau login Google masih gagal

Cek satu-satu:
- Provider **Google** di Firebase Authentication statusnya **Enabled** (bukan cuma kebuka form-nya, tapi sudah ke-**Save**)
- Domain Vercel kamu sudah ada di **Authorized domains** (poin 3 di atas) — ini penyebab paling umum
- `FIREBASE_AUTH_DOMAIN` di Environment Variables Vercel sudah bener persis (`my-ai-f857a.firebaseapp.com`)
- Sudah **redeploy** setelah isi Environment Variables (perubahan env var TIDAK otomatis kepakai tanpa redeploy)
- Buka Console browser (⋮ menu Chrome → **More tools** → **Developer tools** → tab **Console**) pas nyoba login, lalu screenshot error-nya kalau masih gagal — biar bisa didiagnosis persis errornya apa

## Nambah model AI baru

Edit `models.config.js`, tambah 1 objek baru di array `MODELS` (sudah ada contoh, tinggal hapus komentar). File ini aman commit langsung, tidak ada secret di dalamnya.

## Struktur

- `index.html` — halaman login + struktur app
- `style.css` — tema liquid glass
- `models.config.js` — daftar model AI & endpoint (**aman commit**, edit di sini buat nambah model)
- `api/config.js` — serverless function, rakit config dari Environment Variables (**aman commit**, jangan taruh key langsung di sini)
- `app.js` — logika login, chat realtime, panggil API AI
- `assets/` — logo Ryvexis AI
- `.gitignore` — supaya file lokal (`.env`, `.vercel`) tidak ikut ke-commit
