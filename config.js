/**
 * config.js
 * ---------------------------------------------------
 * Semua pengaturan AI ada di sini. Kalau mau ganti API key
 * atau nambah/ubah model, cukup edit file ini saja —
 * tidak perlu sentuh app.js atau index.html.
 * ---------------------------------------------------
 */

const AI_CONFIG = {
  // API key Google AI Studio (Gemini). Ganti di sini kalau perlu.
  API_KEY: "AIzaSyDjeCLygb7hyGGDhkNWx_RmiRluaVgqmqk",

  // Endpoint dasar Gemini API. Biasanya tidak perlu diubah.
  BASE_URL: "https://generativelanguage.googleapis.com/v1beta/models",

  // Daftar model yang muncul di dropdown pemilih model.
  // "id"       -> dipakai internal, harus unik.
  // "label"    -> nama yang tampil di UI.
  // "apiModel" -> nama model asli yang dikirim ke Gemini API.
  // "desc"     -> deskripsi singkat, tampil di bawah nama model.
  // "badge"    -> label kecil (mis. "Free", "Pro", "Beta").
  //
  // DEVELOPER: tambah model baru cukup copy salah satu blok
  // di bawah, lalu ubah value-nya. Urutan array = urutan di UI.
  MODELS: [
    {
      id: "coder-noyt-0-1",
      label: "Coder Noyt 0.1",
      apiModel: "gemini-2.0-flash",
      desc: "Model pertama Noyt AI, fokus ngoding & tanya jawab umum",
      badge: "Free",
    },
    // Contoh menambah model baru (tinggal hapus komentar & sesuaikan):
    // {
    //   id: "noyt-vision-1",
    //   label: "Noyt Vision 1.0",
    //   apiModel: "gemini-2.0-flash",
    //   desc: "Model dengan kemampuan memahami gambar",
    //   badge: "Beta",
    // },
  ],

  // Model default yang dipakai saat aplikasi pertama kali dibuka
  DEFAULT_MODEL_ID: "coder-noyt-0-1",

  // Instruksi sistem (persona) yang dikirim ke setiap model
  SYSTEM_INSTRUCTION:
    "Kamu adalah Noyt AI, asisten AI yang ramah, jelas, dan to the point. " +
    "Jawab dalam bahasa yang sama dengan pertanyaan pengguna. " +
    "Untuk pertanyaan teknis/koding, berikan contoh kode yang rapi memakai blok kode markdown.",
};
