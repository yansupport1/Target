/**
 * api/config.js  (Vercel Serverless Function)
 * ---------------------------------------------------
 * File ini JALAN DI SERVER Vercel, bukan di browser. Tugasnya:
 * baca API key & Firebase config dari Environment Variables (yang
 * kamu isi di dashboard Vercel, BUKAN di file ini), lalu gabungkan
 * dengan models.config.js (yang aman/publik) jadi satu AI_CONFIG,
 * dan kirim ke browser sebagai JavaScript biasa.
 *
 * Karena secret dibaca dari process.env (bukan ditulis di kode),
 * file ini AMAN di-commit ke GitHub — repo publik pun tidak akan
 * membocorkan API key kamu.
 *
 * -------------------------------------------------
 * CARA ISI ENVIRONMENT VARIABLES DI VERCEL:
 *   Vercel Dashboard -> project ini -> Settings -> Environment Variables
 *   Tambahkan satu-satu (Name = persis seperti di bawah, Value = key kamu):
 *
 *     FIREBASE_API_KEY
 *     FIREBASE_AUTH_DOMAIN
 *     FIREBASE_DATABASE_URL
 *     FIREBASE_PROJECT_ID
 *     FIREBASE_STORAGE_BUCKET
 *     FIREBASE_MESSAGING_SENDER_ID
 *     FIREBASE_APP_ID
 *     FIREBASE_MEASUREMENT_ID
 *     GEMINI_API_KEY
 *     OPENAI_API_KEY        (opsional, isi kalau nambah model OpenAI)
 *     ANTHROPIC_API_KEY     (opsional, isi kalau nambah model Claude)
 *     GROQ_API_KEY          (opsional)
 *     OPENROUTER_API_KEY    (opsional)
 *     DEEPSEEK_API_KEY      (opsional)
 *
 *   Setelah nambah/ubah Environment Variables, WAJIB redeploy
 *   (Deployments -> titik tiga pada deployment terakhir -> Redeploy)
 *   supaya perubahan kepakai.
 * -------------------------------------------------
 */

const modelsConfig = require("../models.config.js");

module.exports = (req, res) => {
  const AI_CONFIG = {
    FIREBASE_CONFIG: {
      apiKey: process.env.FIREBASE_API_KEY || "",
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
      databaseURL: process.env.FIREBASE_DATABASE_URL || "",
      projectId: process.env.FIREBASE_PROJECT_ID || "",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
      appId: process.env.FIREBASE_APP_ID || "",
      measurementId: process.env.FIREBASE_MEASUREMENT_ID || "",
    },

    PROVIDER_KEYS: {
      gemini: process.env.GEMINI_API_KEY || "",
      openai: process.env.OPENAI_API_KEY || "",
      anthropic: process.env.ANTHROPIC_API_KEY || "",
      groq: process.env.GROQ_API_KEY || "",
      openrouter: process.env.OPENROUTER_API_KEY || "",
      deepseek: process.env.DEEPSEEK_API_KEY || "",
    },

    PROVIDERS: modelsConfig.PROVIDERS,
    MODELS: modelsConfig.MODELS,
    DEFAULT_MODEL_ID: modelsConfig.DEFAULT_MODEL_ID,
    SYSTEM_INSTRUCTION: modelsConfig.SYSTEM_INSTRUCTION,
  };

  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  // Jangan di-cache CDN/browser supaya perubahan env var langsung kepakai.
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.status(200).send(`const AI_CONFIG = ${JSON.stringify(AI_CONFIG)};`);
};
