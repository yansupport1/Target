/**
 * config.js
 * ---------------------------------------------------
 * Semua pengaturan ada di sini: Firebase (login + database realtime)
 * dan daftar model AI. Nambah model atau ganti key TIDAK perlu
 * sentuh app.js / index.html.
 * ---------------------------------------------------
 */

const AI_CONFIG = {
  // -------------------------------------------------
  // FIREBASE (Login Google + Realtime Database)
  // Konfigurasi ini didapat dari Firebase Console -> Project Settings.
  // -------------------------------------------------
  //
  // databaseURL WAJIB diisi manual (belum otomatis kedeteksi dari config
  // di atas). Caranya:
  //   1. Buka Firebase Console -> project ini -> menu "Realtime Database"
  //   2. Klik "Create Database" kalau belum ada, pilih lokasi server
  //   3. Setelah dibuat, salin URL yang tampil di bagian atas halaman
  //      (bentuknya: https://NAMA-PROJECT-default-rtdb.REGION.firebasedatabase.app)
  //   4. Tempel di bawah, gantikan placeholder-nya
  //
  // Selama databaseURL belum diisi, chat tetap jalan & tersimpan otomatis
  // di penyimpanan lokal (localStorage) sebagai fallback — begitu
  // databaseURL diisi, chat otomatis realtime & tersimpan di cloud.
  //
  // Juga jangan lupa aktifkan provider login di Firebase Console ->
  // Authentication -> Sign-in method -> aktifkan "Google" dan "Anonymous".
  // Lalu di Authentication -> Settings -> Authorized domains, tambahkan
  // domain hosting kamu (mis. ryvexis-ai.vercel.app).
  // -------------------------------------------------
  FIREBASE_CONFIG: {
    const firebaseConfig = {
  apiKey: "AIzaSyAirO8vLQA6Z_JMDHFYndkLxgrsh84NrGk",
  authDomain: "my-ai-f857a.firebaseapp.com",
  databaseURL: "https://my-ai-f857a-default-rtdb.firebaseio.com",
  projectId: "my-ai-f857a",
  storageBucket: "my-ai-f857a.firebasestorage.app",
  messagingSenderId: "258485806014",
  appId: "1:258485806014:web:33f336e6c1def52e42cfef",
  measurementId: "G-PF3HQVEKX6"
}

  // -------------------------------------------------
  // API KEY per provider AI. Taruh key kamu di sini.
  // Kosongin ("") kalau provider itu belum dipakai.
  // Model bisa juga punya API key sendiri (lihat MODELS di bawah,
  // field "apiKey") kalau mau override key default provider-nya.
  // -------------------------------------------------
  PROVIDER_KEYS: {
    gemini: "AQ.Ab8RN6IFOcE3YAEh01VOqtmThbJ0NvEfKgpdQZUOriwh5OxPuA",
    openai: "",
    anthropic: "",
    groq: "",
    openrouter: "",
    deepseek: "",
  },

  // -------------------------------------------------
  // Alamat endpoint tiap provider + tipe format request-nya.
  // type:
  //   "gemini"             -> format native Google Gemini
  //   "openai-compatible"  -> format chat/completions ala OpenAI
  //                           (dipakai juga oleh Groq, OpenRouter,
  //                           DeepSeek, dan banyak provider lain)
  //   "anthropic"          -> format native Anthropic Messages API
  //
  // DEVELOPER: mau nambah provider baru yang formatnya OpenAI-compatible?
  // Tinggal tambah baris baru di sini, tidak perlu ubah app.js.
  // -------------------------------------------------
  PROVIDERS: {
    gemini: {
      type: "gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/models",
    },
    openai: {
      type: "openai-compatible",
      baseUrl: "https://api.openai.com/v1/chat/completions",
    },
    anthropic: {
      type: "anthropic",
      baseUrl: "https://api.anthropic.com/v1/messages",
    },
    groq: {
      type: "openai-compatible",
      baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    },
    openrouter: {
      type: "openai-compatible",
      baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    },
    deepseek: {
      type: "openai-compatible",
      baseUrl: "https://api.deepseek.com/chat/completions",
    },
  },

  // -------------------------------------------------
  // Daftar model yang muncul di dropdown pemilih model.
  // "id"       -> dipakai internal, harus unik.
  // "label"    -> nama yang tampil di UI.
  // "provider" -> harus cocok dengan salah satu key di PROVIDERS di atas.
  // "apiModel" -> nama model asli yang dikirim ke API provider tsb.
  // "apiKey"   -> (opsional) isi kalau model ini pakai key sendiri,
  //               beda dari PROVIDER_KEYS. Kosongkan "" kalau ikut default.
  // "desc"     -> deskripsi singkat, tampil di bawah nama model.
  // "badge"    -> label kecil (mis. "Free", "Pro", "Beta").
  //
  // NAMBAH MODEL BARU = tinggal tambah 1 objek baru di array ini.
  // Urutan array = urutan tampil di UI.
  // -------------------------------------------------
  MODELS: [
    {
      id: "coder-noyt-0-1",
      label: "Coder Noyt 0.1",
      provider: "gemini",
      apiModel: "gemini-3.6-flash",
      apiKey: "",
      desc: "Model pertama Ryvexis AI, fokus ngoding & tanya jawab umum",
      badge: "Free",
    },

    // ===== CONTOH NAMBAH MODEL LAIN (hapus komentar & sesuaikan) =====

    // {
    //   id: "gpt-mini",
    //   label: "GPT Mini",
    //   provider: "openai",
    //   apiModel: "gpt-4o-mini",
    //   apiKey: "",
    //   desc: "Model OpenAI ringan & cepat",
    //   badge: "Pro",
    // },
    // {
    //   id: "claude-haiku",
    //   label: "Claude Haiku",
    //   provider: "anthropic",
    //   apiModel: "claude-haiku-4-5",
    //   apiKey: "",
    //   desc: "Model Claude yang ringan & responsif",
    //   badge: "Pro",
    // },
    // {
    //   id: "groq-llama",
    //   label: "Llama Groq",
    //   provider: "groq",
    //   apiModel: "llama-3.3-70b-versatile",
    //   apiKey: "",
    //   desc: "Llama 3.3 70B, jalan di Groq (super cepat)",
    //   badge: "Free",
    // },
  ],

  // Model default yang dipakai saat aplikasi pertama kali dibuka
  DEFAULT_MODEL_ID: "coder-noyt-0-1",

  // Instruksi sistem (persona) yang dikirim ke setiap model
  SYSTEM_INSTRUCTION:
    "Kamu adalah Ryvexis AI, asisten AI yang ramah, jelas, dan to the point. " +
    "Jawab dalam bahasa yang sama dengan pertanyaan pengguna. " +
    "Untuk pertanyaan teknis/koding, berikan contoh kode yang rapi memakai blok kode markdown, " +
    "dengan indentasi yang konsisten dan tanpa basa-basi berlebihan.",
};
