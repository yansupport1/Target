/**
 * config.js
 * ---------------------------------------------------
 * Semua pengaturan AI ada di sini. Support BANYAK provider
 * AI sekaligus (Gemini, OpenAI, Anthropic, Groq, OpenRouter,
 * DeepSeek, dll). Nambah model atau ganti API key tidak perlu
 * sentuh app.js / index.html sama sekali.
 *
 * CARA NAMBAH MODEL BARU (3 langkah):
 * 1. Kalau providernya belum ada di PROVIDER_KEYS, isi key-nya di sana.
 * 2. Kalau providernya provider baru & belum ada di PROVIDERS, tambah
 *    baris baru (baseUrl + type). Provider yang formatnya sama kayak
 *    OpenAI (Groq, OpenRouter, DeepSeek, dst) tinggal pakai
 *    type: "openai-compatible".
 * 3. Tambah objek model baru di array MODELS.
 * ---------------------------------------------------
 */

const AI_CONFIG = {
  // -------------------------------------------------
  // LOGIN GOOGLE
  // Ambil Client ID di https://console.cloud.google.com/apis/credentials
  // (buat "OAuth client ID" tipe "Web application", lalu tambahkan domain
  // tempat app ini di-hosting ke "Authorized JavaScript origins",
  // contoh: https://ryvexis-ai.vercel.app).
  // Selama masih "GANTI_DENGAN_GOOGLE_CLIENT_ID_KAMU", tombol Google
  // Sign-In akan menampilkan pesan supaya diisi dulu, dan pengguna tetap
  // bisa masuk lewat tombol "Lanjutkan tanpa akun".
  // -------------------------------------------------
  GOOGLE_CLIENT_ID: "GANTI_DENGAN_GOOGLE_CLIENT_ID_KAMU.apps.googleusercontent.com",

  // -------------------------------------------------
  // API KEY per provider. Taruh key kamu di sini.
  // Kosongin ("") kalau provider itu belum dipakai.
  // Model bisa juga punya API key sendiri (lihat MODELS di bawah,
  // field "apiKey") kalau mau override key default provider-nya.
  // -------------------------------------------------
  PROVIDER_KEYS: {
    gemini: "AIzaSyDjeCLygb7hyGGDhkNWx_RmiRluaVgqmqk",
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
  // Urutan array = urutan tampil di UI.
  // -------------------------------------------------
  MODELS: [
    {
      id: "coder-noyt-0-1",
      label: "Coder Noyt 0.1",
      provider: "gemini",
      apiModel: "gemini-3.6-flash",
      apiKey: "",
      desc: "Model pertama Noyt AI, fokus ngoding & tanya jawab umum",
      badge: "Free",
    },

    // ===== CONTOH NAMBAH MODEL LAIN (hapus komentar & sesuaikan) =====

    // Contoh model OpenAI:
    // {
    //   id: "gpt-mini",
    //   label: "GPT Mini",
    //   provider: "openai",
    //   apiModel: "gpt-4o-mini",
    //   apiKey: "",
    //   desc: "Model OpenAI ringan & cepat",
    //   badge: "Pro",
    // },

    // Contoh model Anthropic (Claude):
    // {
    //   id: "claude-haiku",
    //   label: "Claude Haiku",
    //   provider: "anthropic",
    //   apiModel: "claude-haiku-4-5",
    //   apiKey: "",
    //   desc: "Model Claude yang ringan & responsif",
    //   badge: "Pro",
    // },

    // Contoh model dari provider OpenAI-compatible (Groq, gratis & ngebut):
    // {
    //   id: "groq-llama",
    //   label: "Llama Groq",
    //   provider: "groq",
    //   apiModel: "llama-3.3-70b-versatile",
    //   apiKey: "",
    //   desc: "Llama 3.3 70B, jalan di Groq (super cepat)",
    //   badge: "Free",
    // },

    // Contoh model dengan API key khusus (override PROVIDER_KEYS):
    // {
    //   id: "noyt-vision-1",
    //   label: "Noyt Vision 1.0",
    //   provider: "gemini",
    //   apiModel: "gemini-3.6-flash",
    //   apiKey: "AIza...key-lain-punya-project-lain",
    //   desc: "Model dengan kemampuan memahami gambar",
    //   badge: "Beta",
    // },
  ],

  // Model default yang dipakai saat aplikasi pertama kali dibuka
  DEFAULT_MODEL_ID: "coder-noyt-0-1",

  // Instruksi sistem (persona) yang dikirim ke setiap model
  SYSTEM_INSTRUCTION:
    "Kamu adalah Ryvexis AI, asisten AI yang ramah, jelas, dan to the point. " +
    "Jawab dalam bahasa yang sama dengan pertanyaan pengguna. " +
    "Untuk pertanyaan teknis/koding, berikan contoh kode yang rapi memakai blok kode markdown.",
};
