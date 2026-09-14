/**
 * models.config.js
 * ---------------------------------------------------
 * File ini AMAN di-commit ke GitHub — isinya cuma daftar model AI
 * & alamat endpoint provider, TIDAK ADA API key atau secret apapun
 * di sini. Ini yang kamu edit tiap mau nambah/ubah model AI.
 *
 * Secret (API key, Firebase config) ada di tempat terpisah:
 * Environment Variables di Vercel -> dibaca oleh /api/config.js
 * saat app dibuka. Lihat README.md untuk cara isinya.
 * ---------------------------------------------------
 */

module.exports = {
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
  // Kalau provider barunya butuh API key baru, tambahkan juga env var-nya
  // di Vercel dan baca di /api/config.js (lihat komentar di file itu).
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
  // "desc"     -> deskripsi singkat, tampil di bawah nama model.
  // "badge"    -> label kecil (mis. "Free", "Pro", "Beta").
  //
  // NAMBAH MODEL BARU = tinggal tambah 1 objek baru di array ini,
  // lalu commit & push seperti biasa (file ini aman, tanpa secret).
  // Urutan array = urutan tampil di UI.
  // -------------------------------------------------
  MODELS: [
    {
      id: "coder-noyt-0-1",
      label: "Coder Noyt 0.1",
      provider: "gemini",
      apiModel: "gemini-3.6-flash",
      desc: "Model pertama Ryvexis AI, fokus ngoding & tanya jawab umum",
      badge: "Free",
    },

    { id: "ryvexis-ai-space",
      label: "Ryvexis Space Flash",
      provider: "groq",
     apiModel: "llama-3.3-70b-versatile",
      desc: "model terbagus vexis",
      badge: "Gege",

    // ===== CONTOH NAMBAH MODEL LAIN (hapus komentar & sesuaikan) =====
    // {
    //   id: "gpt-mini",
    //   label: "GPT Mini",
    //   provider: "openai",
    //   apiModel: "gpt-4o-mini",
    //   desc: "Model OpenAI ringan & cepat",
    //   badge: "Pro",
    // },
    // {
    //   id: "claude-haiku",
    //   label: "Claude Haiku",
    //   provider: "anthropic",
    //   apiModel: "claude-haiku-4-5",
    //   desc: "Model Claude yang ringan & responsif",
    //   badge: "Pro",
    // },
    // {
    //   id: "groq-llama",
    //   label: "Llama Groq",
    //   provider: "groq",
    //   apiModel: "llama-3.3-70b-versatile",
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
