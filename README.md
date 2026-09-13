# Ryvexis AI

Aplikasi chat AI — glassmorphism, login via Google, multi-provider AI (Gemini/OpenAI/Anthropic/Groq/dll).

## Cara pakai

1. Upload 4 file ini (`index.html`, `style.css`, `config.js`, `app.js`) ke hosting kamu (Vercel, dll), satu folder yang sama.
2. **API key AI** sudah terisi untuk Gemini di `config.js` (`PROVIDER_KEYS.gemini`). Mau nambah model dari provider lain (OpenAI, Anthropic, Groq...) tinggal isi key-nya di `PROVIDER_KEYS` dan tambah objek model baru di `MODELS` — sudah ada contohnya (tinggal hapus komentar).
3. **Login Google**:
   - Buka https://console.cloud.google.com/apis/credentials
   - Buat **OAuth client ID** → tipe **Web application**
   - Di **Authorized JavaScript origins**, tambahkan domain hosting kamu, misal `https://ryvexis-ai.vercel.app`
   - Salin **Client ID**-nya, tempel ke `GOOGLE_CLIENT_ID` di `config.js`
   - Sebelum diisi, tombol Google akan menampilkan peringatan otomatis dan pengguna tetap bisa masuk lewat "Lanjutkan tanpa akun".
4. Buka `index.html` di browser (atau domain hosting-nya) — akan muncul halaman login dulu, lalu masuk ke chat.

## Struktur

- `index.html` — halaman login + struktur app
- `style.css` — semua styling (glassmorphism, tema violet–cyan)
- `config.js` — API key, daftar model AI, Google Client ID (edit di sini)
- `app.js` — logika login, chat, panggil API AI
