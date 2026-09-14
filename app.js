/**
 * app.js
 * Logika utama Ryvexis AI:
 * - Login via Firebase Auth (Google popup / anonymous "tamu")
 * - Chat log tersimpan realtime di Firebase Realtime Database
 *   (fallback otomatis ke localStorage kalau databaseURL belum diisi)
 * - Panggil AI API multi-provider (config.js)
 * - Render pesan bubble kanan (user) / kiri (AI)
 */

(function () {
  "use strict";

  /* ============ STATE ============ */
  const LOCAL_CHATS_KEY = "ryvexis_ai_chats_v1";
  const LOCAL_AUTH_KEY = "ryvexis_ai_local_auth_v1";

  let chats = [];            // [{id, title, modelId, messages:[{role,text}], updatedAt}]
  let activeChatId = null;
  let isSending = false;
  let currentUser = null;    // {name, email, picture, guest}

  let auth = null;
  let db = null;
  let googleProvider = null;
  let useFirebaseStorage = false;
  let chatsRef = null;

  /* ============ ELEMENTS ============ */
  const el = {
    loginView: document.getElementById("loginView"),
    appView: document.getElementById("appView"),
    btnGoogleLogin: document.getElementById("btnGoogleLogin"),
    btnGuestLogin: document.getElementById("btnGuestLogin"),
    firebaseWarning: document.getElementById("firebaseWarning"),

    sidebar: document.getElementById("sidebar"),
    sidebarScrim: document.getElementById("sidebarScrim"),
    btnMenu: document.getElementById("btnMenu"),
    chatList: document.getElementById("chatList"),
    btnNewChat: document.getElementById("btnNewChat"),
    btnClearAll: document.getElementById("btnClearAll"),
    sidebarModelName: document.getElementById("sidebarModelName"),

    syncDot: document.getElementById("syncDot"),
    syncLabel: document.getElementById("syncLabel"),

    userAvatarImg: document.getElementById("userAvatarImg"),
    userAvatarFallback: document.getElementById("userAvatarFallback"),
    userNameLabel: document.getElementById("userNameLabel"),
    userEmailLabel: document.getElementById("userEmailLabel"),
    btnLogout: document.getElementById("btnLogout"),

    modelPickerBtn: document.getElementById("modelPickerBtn"),
    modelDropdown: document.getElementById("modelDropdown"),
    activeModelLabel: document.getElementById("activeModelLabel"),

    btnRenameChat: document.getElementById("btnRenameChat"),
    btnDeleteChat: document.getElementById("btnDeleteChat"),

    chatArea: document.getElementById("chatArea"),
    emptyState: document.getElementById("emptyState"),
    suggestions: document.getElementById("suggestions"),
    messages: document.getElementById("messages"),

    promptInput: document.getElementById("promptInput"),
    btnSend: document.getElementById("btnSend"),
  };

  /* ============ UTIL ============ */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* =========================================================
     FIREBASE: init, auth (Google / tamu), status sinkron
     ========================================================= */

  function isFirebaseFullyConfigured() {
    const cfg = AI_CONFIG.FIREBASE_CONFIG || {};
    const hasCore = cfg.apiKey && cfg.apiKey.indexOf("GANTI_DENGAN_") !== 0;
    const hasDbUrl = cfg.databaseURL && cfg.databaseURL.indexOf("GANTI_DENGAN_") !== 0;
    return { hasCore: !!hasCore, hasDbUrl: !!hasDbUrl };
  }

  function updateSyncStatus(connected) {
    if (!el.syncDot) return;
    if (connected) {
      el.syncDot.classList.add("live");
      el.syncLabel.textContent = "Realtime tersambung";
    } else {
      el.syncDot.classList.remove("live");
      el.syncLabel.textContent = "Mode lokal";
    }
  }

  function initFirebase() {
    const status = isFirebaseFullyConfigured();

    if (!status.hasCore) {
      // Firebase sama sekali belum dikonfigurasi -> mode lokal penuh.
      el.firebaseWarning.classList.add("show");
      setupLocalOnlyAuth();
      return;
    }

    firebase.initializeApp(AI_CONFIG.FIREBASE_CONFIG);
    auth = firebase.auth();
    googleProvider = new firebase.auth.GoogleAuthProvider();

    if (status.hasDbUrl) {
      db = firebase.database();
    } else {
      // Auth siap, tapi Realtime Database belum dikonfigurasi -> chat
      // tetap disimpan lokal sampai databaseURL diisi.
      el.firebaseWarning.classList.add("show");
    }

    // Tangani hasil login setelah redirect kembali dari Google.
    // (signInWithRedirect dipakai alih-alih signInWithPopup karena popup
    // sering diblokir / force-close di browser mobile seperti Chrome Android.)
    auth.getRedirectResult().catch((err) => {
      if (err && err.code) {
        alert("Login Google gagal: " + err.message);
      }
    });

    auth.onAuthStateChanged((user) => {
      if (user) {
        currentUser = {
          name: user.isAnonymous ? "Tamu" : (user.displayName || "Pengguna Google"),
          email: user.isAnonymous ? "" : (user.email || ""),
          picture: user.photoURL || "",
          guest: user.isAnonymous,
        };
        enterApp(currentUser);

        if (db) {
          attachChatsListener(user.uid);
        } else {
          useFirebaseStorage = false;
          loadChatsLocal();
          renderChatList();
          renderActiveChat();
          updateSyncStatus(false);
        }
      } else {
        detachChatsListener();
        currentUser = null;
        showLoginView();
      }
    });

    el.btnGoogleLogin.addEventListener("click", () => {
      auth.signInWithRedirect(googleProvider).catch((err) => {
        alert("Login Google gagal: " + err.message);
      });
    });
    el.btnGuestLogin.addEventListener("click", () => {
      auth.signInAnonymously().catch((err) => {
        alert("Gagal masuk sebagai tamu: " + err.message);
      });
    });
    el.btnLogout.addEventListener("click", () => {
      if (!confirm("Keluar dari Ryvexis AI?")) return;
      auth.signOut();
    });
  }

  // Mode fallback total: dipakai kalau config.js Firebase belum diisi
  // sama sekali. App tetap berfungsi penuh dengan localStorage.
  function setupLocalOnlyAuth() {
    el.btnGoogleLogin.classList.add("disabled");
    el.btnGoogleLogin.disabled = true;
    el.btnGoogleLogin.title = "Firebase belum dikonfigurasi di config.js";

    const saved = loadLocalAuth();
    if (saved) {
      enterApp(saved);
      loadChatsLocal();
      renderChatList();
      renderActiveChat();
      updateSyncStatus(false);
    } else {
      showLoginView();
    }

    el.btnGuestLogin.addEventListener("click", () => {
      const guestUser = { name: "Tamu", email: "", picture: "", guest: true };
      saveLocalAuth(guestUser);
      enterApp(guestUser);
      loadChatsLocal();
      renderChatList();
      renderActiveChat();
      updateSyncStatus(false);
    });

    el.btnLogout.addEventListener("click", () => {
      if (!confirm("Keluar dari Ryvexis AI?")) return;
      clearLocalAuth();
      currentUser = null;
      showLoginView();
    });
  }

  function loadLocalAuth() {
    try {
      const raw = localStorage.getItem(LOCAL_AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function saveLocalAuth(user) {
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
  }
  function clearLocalAuth() {
    localStorage.removeItem(LOCAL_AUTH_KEY);
  }

  function enterApp(user) {
    currentUser = user;
    el.loginView.style.display = "none";
    el.appView.classList.add("show");

    el.userNameLabel.textContent = user.guest ? "Tamu" : user.name;
    el.userEmailLabel.textContent = user.guest ? "Mode tanpa akun" : user.email;

    if (user.picture) {
      el.userAvatarImg.src = user.picture;
      el.userAvatarImg.style.display = "block";
      el.userAvatarFallback.style.display = "none";
    } else {
      el.userAvatarImg.style.display = "none";
      el.userAvatarFallback.style.display = "block";
    }

    activeChatId = null;
    setSendEnabled();
  }

  function showLoginView() {
    el.appView.classList.remove("show");
    el.loginView.style.display = "flex";
    chats = [];
    activeChatId = null;
  }

  /* =========================================================
     REALTIME DATABASE: chat log per user
     ========================================================= */

  function attachChatsListener(uid) {
    useFirebaseStorage = true;
    chatsRef = db.ref("users/" + uid + "/chats");

    chatsRef.on("value", (snap) => {
      const val = snap.val() || {};
      chats = Object.keys(val).map((id) => Object.assign({ id: id }, val[id]));

      renderChatList();

      const stillExists = chats.some((c) => c.id === activeChatId);
      if (!stillExists) {
        activeChatId = chats.length
          ? chats.slice().sort((a, b) => b.updatedAt - a.updatedAt)[0].id
          : null;
      }
      if (!isSending) renderActiveChat();
    });

    db.ref(".info/connected").on("value", (snap) => {
      updateSyncStatus(snap.val() === true);
    });
  }

  function detachChatsListener() {
    if (chatsRef) chatsRef.off();
    chatsRef = null;
    useFirebaseStorage = false;
    chats = [];
  }

  function persistChat(chat) {
    if (useFirebaseStorage && chatsRef) {
      const data = {
        title: chat.title,
        modelId: chat.modelId,
        messages: chat.messages,
        updatedAt: chat.updatedAt,
      };
      chatsRef.child(chat.id).set(data);
    } else {
      saveChatsLocal();
    }
  }

  function persistDeleteChat(chatId) {
    if (useFirebaseStorage && chatsRef) {
      chatsRef.child(chatId).remove();
    } else {
      saveChatsLocal();
    }
  }

  function persistClearAll() {
    if (useFirebaseStorage && chatsRef) {
      chatsRef.remove();
    } else {
      chats = [];
      saveChatsLocal();
    }
  }

  function saveChatsLocal() {
    localStorage.setItem(LOCAL_CHATS_KEY, JSON.stringify(chats));
  }
  function loadChatsLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_CHATS_KEY);
      chats = raw ? JSON.parse(raw) : [];
    } catch (e) {
      chats = [];
    }
    if (chats.length) {
      activeChatId = chats.slice().sort((a, b) => b.updatedAt - a.updatedAt)[0].id;
    }
  }

  function getModelById(id) {
    return (
      AI_CONFIG.MODELS.find((m) => m.id === id) ||
      AI_CONFIG.MODELS.find((m) => m.id === AI_CONFIG.DEFAULT_MODEL_ID) ||
      AI_CONFIG.MODELS[0]
    );
  }

  function getActiveChat() {
    return chats.find((c) => c.id === activeChatId) || null;
  }

  /* ============ MARKDOWN RINGAN (blok kode, list, bold) ============ */
  function renderMarkdown(raw) {
    const text = raw || "";
    const codeBlocks = [];

    let working = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push({ lang: lang || "text", code: code.replace(/\n$/, "") });
      return `%%CODEBLOCK_${idx}%%`;
    });

    working = escapeHtml(working);
    working = working.replace(/`([^`]+)`/g, "<code>$1</code>");
    working = working.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    const lines = working.split("\n");
    let html = "";
    let inList = false;
    let paraBuffer = [];

    function flushPara() {
      if (paraBuffer.length) {
        html += `<p>${paraBuffer.join("<br>")}</p>`;
        paraBuffer = [];
      }
    }

    lines.forEach((line) => {
      const isListItem = /^\s*[-*]\s+/.test(line);
      if (isListItem) {
        flushPara();
        if (!inList) { html += "<ul>"; inList = true; }
        html += `<li>${line.replace(/^\s*[-*]\s+/, "")}</li>`;
      } else {
        if (inList) { html += "</ul>"; inList = false; }
        if (line.trim() === "") flushPara();
        else paraBuffer.push(line);
      }
    });
    if (inList) html += "</ul>";
    flushPara();

    codeBlocks.forEach((block, idx) => {
      const safeCode = escapeHtml(block.code);
      const blockHtml = `
        <div class="code-block">
          <div class="code-block-head">
            <span>${escapeHtml(block.lang)}</span>
            <button class="code-copy-btn" data-code-idx="${idx}">
              <i class="fa-regular fa-copy"></i><span>Salin</span>
            </button>
          </div>
          <pre><code>${safeCode}</code></pre>
        </div>`;
      html = html.replace(`<p>%%CODEBLOCK_${idx}%%</p>`, blockHtml);
      html = html.replace(`%%CODEBLOCK_${idx}%%`, blockHtml);
    });

    return { html };
  }

  /* ============ SIDEBAR: DAFTAR CHAT ============ */
  function renderChatList() {
    el.chatList.innerHTML = "";

    if (chats.length === 0) {
      const empty = document.createElement("div");
      empty.className = "chat-list-empty";
      empty.textContent = "Belum ada obrolan.";
      el.chatList.appendChild(empty);
      return;
    }

    chats
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .forEach((chat) => {
        const item = document.createElement("div");
        item.className = "chat-item" + (chat.id === activeChatId ? " active" : "");
        item.innerHTML = `<i class="fa-regular fa-message"></i><span>${escapeHtml(chat.title)}</span>`;
        item.addEventListener("click", () => switchChat(chat.id));
        el.chatList.appendChild(item);
      });
  }

  /* ============ MODEL PICKER ============ */
  function renderModelDropdown() {
    el.modelDropdown.innerHTML = "";
    const chat = getActiveChat();
    const currentModelId = chat ? chat.modelId : AI_CONFIG.DEFAULT_MODEL_ID;

    AI_CONFIG.MODELS.forEach((model) => {
      const opt = document.createElement("div");
      opt.className = "model-option" + (model.id === currentModelId ? " selected" : "");
      opt.innerHTML = `
        <i class="fa-solid fa-microchip model-icon"></i>
        <div class="model-option-text">
          <div class="model-option-title">
            <span>${escapeHtml(model.label)}</span>
            <span class="model-badge">${escapeHtml(model.badge || "")}</span>
          </div>
          <div class="model-option-desc">${escapeHtml(model.desc || "")}</div>
        </div>`;
      opt.addEventListener("click", () => {
        setActiveModel(model.id);
        closeModelDropdown();
      });
      el.modelDropdown.appendChild(opt);
    });
  }

  function setActiveModel(modelId) {
    const model = getModelById(modelId);
    let chat = getActiveChat();
    if (!chat) chat = createChat();
    chat.modelId = model.id;
    chat.updatedAt = Date.now();
    persistChat(chat);
    updateModelLabels(model);
    renderModelDropdown();
  }

  function updateModelLabels(model) {
    el.activeModelLabel.textContent = model.label;
    el.sidebarModelName.textContent = model.label;
  }

  function openModelDropdown() {
    el.modelDropdown.classList.add("open");
    el.modelPickerBtn.classList.add("open");
  }
  function closeModelDropdown() {
    el.modelDropdown.classList.remove("open");
    el.modelPickerBtn.classList.remove("open");
  }

  el.modelPickerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    el.modelDropdown.classList.contains("open") ? closeModelDropdown() : (renderModelDropdown(), openModelDropdown());
  });
  document.addEventListener("click", (e) => {
    if (!el.modelDropdown.contains(e.target) && e.target !== el.modelPickerBtn) {
      closeModelDropdown();
    }
  });

  /* ============ CHAT LIFECYCLE ============ */
  function createChat() {
    const chat = {
      id: uid(),
      title: "Obrolan Baru",
      modelId: AI_CONFIG.DEFAULT_MODEL_ID,
      messages: [],
      updatedAt: Date.now(),
    };
    chats.push(chat);
    activeChatId = chat.id;
    persistChat(chat);
    return chat;
  }

  function switchChat(id) {
    activeChatId = id;
    renderChatList();
    renderActiveChat();
    closeSidebarOnMobile();
  }

  function deleteActiveChat() {
    const chat = getActiveChat();
    if (!chat) return;
    if (!confirm(`Hapus obrolan "${chat.title}"?`)) return;
    chats = chats.filter((c) => c.id !== chat.id);
    activeChatId = chats.length ? chats[0].id : null;
    persistDeleteChat(chat.id);
    renderChatList();
    renderActiveChat();
  }

  function renameActiveChat() {
    const chat = getActiveChat();
    if (!chat) return;
    const name = prompt("Nama obrolan baru:", chat.title);
    if (name && name.trim()) {
      chat.title = name.trim();
      chat.updatedAt = Date.now();
      persistChat(chat);
      renderChatList();
    }
  }

  el.btnNewChat.addEventListener("click", () => {
    createChat();
    renderChatList();
    renderActiveChat();
    closeSidebarOnMobile();
  });
  el.btnClearAll.addEventListener("click", () => {
    if (!chats.length) return;
    if (!confirm("Hapus semua riwayat obrolan?")) return;
    chats = [];
    activeChatId = null;
    persistClearAll();
    renderChatList();
    renderActiveChat();
  });
  el.btnRenameChat.addEventListener("click", renameActiveChat);
  el.btnDeleteChat.addEventListener("click", deleteActiveChat);

  /* ============ RENDER PESAN ============ */
  function renderActiveChat() {
    const chat = getActiveChat();
    el.messages.innerHTML = "";

    if (!chat) {
      el.emptyState.style.display = "flex";
      el.messages.style.display = "none";
      updateModelLabels(getModelById(AI_CONFIG.DEFAULT_MODEL_ID));
      return;
    }

    updateModelLabels(getModelById(chat.modelId));

    if (!chat.messages || chat.messages.length === 0) {
      el.emptyState.style.display = "flex";
      el.messages.style.display = "none";
      return;
    }

    el.emptyState.style.display = "none";
    el.messages.style.display = "flex";

    chat.messages.forEach((msg) => appendMessageEl(msg.role, msg.text));
    scrollToBottom();
  }

  function avatarInnerHtml(role) {
    if (role === "user") {
      if (currentUser && currentUser.picture) {
        return `<img src="${escapeHtml(currentUser.picture)}" alt="" />`;
      }
      return '<i class="fa-regular fa-user"></i>';
    }
    return '<img src="assets/logo-icon.png" alt="" />';
  }

  function appendMessageEl(role, text, opts) {
    opts = opts || {};
    const wrap = document.createElement("div");
    wrap.className = "msg " + role;

    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.innerHTML = avatarInnerHtml(role);

    const body = document.createElement("div");
    body.className = "msg-body";

    const roleLabel = document.createElement("div");
    roleLabel.className = "msg-role";
    roleLabel.textContent = role === "user" ? "Kamu" : "Ryvexis AI";

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";

    const content = document.createElement("div");
    content.className = "msg-content";

    if (opts.typing) {
      content.classList.add("typing");
      content.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    } else if (opts.error) {
      content.innerHTML = `<div class="msg-error"><i class="fa-solid fa-triangle-exclamation"></i><span>${escapeHtml(text)}</span></div>`;
    } else {
      const { html } = renderMarkdown(text);
      content.innerHTML = html;
    }

    bubble.appendChild(content);
    body.appendChild(roleLabel);
    body.appendChild(bubble);
    wrap.appendChild(avatar);
    wrap.appendChild(body);
    el.messages.appendChild(wrap);

    return wrap;
  }

  function scrollToBottom() {
    el.chatArea.scrollTop = el.chatArea.scrollHeight;
  }

  el.messages.addEventListener("click", (e) => {
    const btn = e.target.closest(".code-copy-btn");
    if (!btn) return;
    const pre = btn.closest(".code-block").querySelector("code");
    navigator.clipboard.writeText(pre.textContent).then(() => {
      const span = btn.querySelector("span");
      const original = span.textContent;
      span.textContent = "Tersalin";
      setTimeout(() => (span.textContent = original), 1400);
    });
  });

  /* ============ KIRIM PESAN & PANGGIL API ============ */
  async function sendPrompt(text) {
    if (isSending) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    let chat = getActiveChat();
    if (!chat) chat = createChat();
    if (!chat.messages) chat.messages = [];

    if (chat.messages.length === 0) {
      chat.title = trimmed.length > 38 ? trimmed.slice(0, 38) + "…" : trimmed;
    }

    chat.messages.push({ role: "user", text: trimmed });
    chat.updatedAt = Date.now();
    persistChat(chat);
    renderChatList();

    el.emptyState.style.display = "none";
    el.messages.style.display = "flex";
    appendMessageEl("user", trimmed);
    scrollToBottom();

    el.promptInput.value = "";
    autoResizeInput();

    const typingEl = appendMessageEl("ai", "", { typing: true });
    scrollToBottom();

    isSending = true;
    setSendEnabled();

    try {
      const model = getModelById(chat.modelId);
      const replyText = await callAI(model, chat.messages);

      chat.messages.push({ role: "ai", text: replyText });
      chat.updatedAt = Date.now();
      persistChat(chat);

      typingEl.remove();
      appendMessageEl("ai", replyText);
    } catch (err) {
      typingEl.remove();
      appendMessageEl("ai", err.message || "Terjadi kesalahan saat menghubungi AI.", { error: true });
    } finally {
      isSending = false;
      setSendEnabled();
      scrollToBottom();
      renderChatList();
    }
  }

  /**
   * Dispatcher utama: baca provider dari model, lalu panggil fungsi
   * yang sesuai. Nambah provider baru di config.js otomatis kepakai
   * selama type-nya salah satu dari: gemini, openai-compatible,
   * anthropic. Type baru bisa ditambah dengan nambah case baru di bawah.
   */
  async function callAI(model, messages) {
    const providerCfg = AI_CONFIG.PROVIDERS[model.provider];
    if (!providerCfg) {
      throw new Error(`Provider "${model.provider}" belum ada di PROVIDERS (config.js).`);
    }

    const apiKey = (model.apiKey && model.apiKey.trim()) || AI_CONFIG.PROVIDER_KEYS[model.provider] || "";
    if (!apiKey) {
      throw new Error(`API key untuk provider "${model.provider}" belum diisi di config.js.`);
    }

    switch (providerCfg.type) {
      case "gemini": return callGemini(providerCfg, model, messages, apiKey);
      case "openai-compatible": return callOpenAICompatible(providerCfg, model, messages, apiKey);
      case "anthropic": return callAnthropic(providerCfg, model, messages, apiKey);
      default: throw new Error(`Tipe provider "${providerCfg.type}" belum didukung di app.js.`);
    }
  }

  async function safeFetchJson(url, options) {
    let res;
    try {
      res = await fetch(url, options);
    } catch (networkErr) {
      throw new Error("Tidak bisa terhubung ke server AI. Periksa koneksi internet kamu.");
    }
    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error("Respons dari server AI tidak valid.");
    }
    if (!res.ok) {
      const apiMsg = (data && data.error && (data.error.message || data.error)) || `HTTP ${res.status}`;
      throw new Error(`AI API error: ${typeof apiMsg === "string" ? apiMsg : JSON.stringify(apiMsg)}`);
    }
    return data;
  }

  async function callGemini(providerCfg, model, messages, apiKey) {
    const url = `${providerCfg.baseUrl}/${model.apiModel}:generateContent?key=${apiKey}`;
    const contents = messages.map((m) => ({
      role: m.role === "ai" ? "model" : "user",
      parts: [{ text: m.text }],
    }));
    const body = {
      contents,
      systemInstruction: { parts: [{ text: AI_CONFIG.SYSTEM_INSTRUCTION }] },
    };
    const data = await safeFetchJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const candidate = data && data.candidates && data.candidates[0];
    const parts = candidate && candidate.content && candidate.content.parts;
    const answer = parts && parts.map((p) => p.text || "").join("").trim();
    if (!answer) throw new Error("AI tidak mengembalikan jawaban. Coba lagi.");
    return answer;
  }

  async function callOpenAICompatible(providerCfg, model, messages, apiKey) {
    const chatMessages = [
      { role: "system", content: AI_CONFIG.SYSTEM_INSTRUCTION },
      ...messages.map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text })),
    ];
    const body = { model: model.apiModel, messages: chatMessages };
    const data = await safeFetchJson(providerCfg.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    const answer = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!answer) throw new Error("AI tidak mengembalikan jawaban. Coba lagi.");
    return answer.trim();
  }

  async function callAnthropic(providerCfg, model, messages, apiKey) {
    const anthMessages = messages.map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
    const body = { model: model.apiModel, max_tokens: 1024, system: AI_CONFIG.SYSTEM_INSTRUCTION, messages: anthMessages };
    const data = await safeFetchJson(providerCfg.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });
    const block = data && data.content && data.content.find((c) => c.type === "text");
    const answer = block && block.text;
    if (!answer) throw new Error("AI tidak mengembalikan jawaban. Coba lagi.");
    return answer.trim();
  }

  function setSendEnabled() {
    el.btnSend.disabled = isSending || el.promptInput.value.trim() === "";
  }

  /* ============ INPUT HANDLERS ============ */
  function autoResizeInput() {
    el.promptInput.style.height = "auto";
    el.promptInput.style.height = Math.min(el.promptInput.scrollHeight, 200) + "px";
  }

  el.promptInput.addEventListener("input", () => {
    autoResizeInput();
    setSendEnabled();
  });
  el.promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt(el.promptInput.value);
    }
  });
  el.btnSend.addEventListener("click", () => sendPrompt(el.promptInput.value));
  el.suggestions.addEventListener("click", (e) => {
    const card = e.target.closest(".suggestion-card");
    if (!card) return;
    sendPrompt(card.querySelector("span").textContent);
  });

  /* ============ SIDEBAR MOBILE ============ */
  function openSidebar() {
    el.sidebar.classList.add("open");
    el.sidebarScrim.classList.add("show");
  }
  function closeSidebarOnMobile() {
    el.sidebar.classList.remove("open");
    el.sidebarScrim.classList.remove("show");
  }
  el.btnMenu.addEventListener("click", openSidebar);
  el.sidebarScrim.addEventListener("click", closeSidebarOnMobile);

  /* ============ INIT ============ */
  initFirebase();
})();
