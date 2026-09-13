/**
 * app.js
 * Logika utama Noyt AI: kelola obrolan, panggil AI API (config.js),
 * render pesan (dengan blok kode), dan UI interaktif.
 */

(function () {
  "use strict";

  /* ============ STATE ============ */
  const STORAGE_KEY = "noyt_ai_chats_v1";
  let chats = [];          // [{id, title, modelId, messages:[{role,text}]}]
  let activeChatId = null;
  let isSending = false;

  /* ============ ELEMENTS ============ */
  const el = {
    sidebar: document.getElementById("sidebar"),
    sidebarScrim: document.getElementById("sidebarScrim"),
    btnMenu: document.getElementById("btnMenu"),
    chatList: document.getElementById("chatList"),
    btnNewChat: document.getElementById("btnNewChat"),
    btnClearAll: document.getElementById("btnClearAll"),
    sidebarModelName: document.getElementById("sidebarModelName"),

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

  function saveChats() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }

  function loadChats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      chats = raw ? JSON.parse(raw) : [];
    } catch (e) {
      chats = [];
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

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /* Render markdown ringan: blok kode ```, inline code, bold, list, paragraf */
  function renderMarkdown(raw) {
    const text = raw || "";
    const codeBlocks = [];

    // Ambil semua blok kode ``` dulu supaya isinya tidak diparsing lebih lanjut
    let working = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push({ lang: lang || "text", code: code.replace(/\n$/, "") });
      return `%%CODEBLOCK_${idx}%%`;
    });

    working = escapeHtml(working);

    // inline code
    working = working.replace(/`([^`]+)`/g, "<code>$1</code>");
    // bold
    working = working.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    // list sederhana (baris diawali - atau *)
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
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        html += `<li>${line.replace(/^\s*[-*]\s+/, "")}</li>`;
      } else {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        if (line.trim() === "") {
          flushPara();
        } else {
          paraBuffer.push(line);
        }
      }
    });
    if (inList) html += "</ul>";
    flushPara();

    // Sisipkan kembali blok kode sebagai HTML utuh
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

    return { html, codeBlocks };
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
    if (!chat) {
      chat = createChat();
    }
    chat.modelId = model.id;
    saveChats();
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
    saveChats();
    return chat;
  }

  function switchChat(id) {
    activeChatId = id;
    renderChatList();
    renderActiveChat();
  }

  function deleteActiveChat() {
    const chat = getActiveChat();
    if (!chat) return;
    if (!confirm(`Hapus obrolan "${chat.title}"?`)) return;
    chats = chats.filter((c) => c.id !== chat.id);
    activeChatId = chats.length ? chats[0].id : null;
    saveChats();
    renderChatList();
    renderActiveChat();
  }

  function renameActiveChat() {
    const chat = getActiveChat();
    if (!chat) return;
    const name = prompt("Nama obrolan baru:", chat.title);
    if (name && name.trim()) {
      chat.title = name.trim();
      saveChats();
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
    saveChats();
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

    if (chat.messages.length === 0) {
      el.emptyState.style.display = "flex";
      el.messages.style.display = "none";
      return;
    }

    el.emptyState.style.display = "none";
    el.messages.style.display = "flex";

    chat.messages.forEach((msg) => appendMessageEl(msg.role, msg.text));
    scrollToBottom();
  }

  function appendMessageEl(role, text, opts) {
    opts = opts || {};
    const wrap = document.createElement("div");
    wrap.className = "msg " + role;

    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.innerHTML =
      role === "user" ? '<i class="fa-regular fa-user"></i>' : '<i class="fa-solid fa-hexagon-nodes"></i>';

    const body = document.createElement("div");
    body.className = "msg-body";

    const roleLabel = document.createElement("div");
    roleLabel.className = "msg-role";
    roleLabel.textContent = role === "user" ? "Kamu" : "Noyt AI";

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

    body.appendChild(roleLabel);
    body.appendChild(content);
    wrap.appendChild(avatar);
    wrap.appendChild(body);
    el.messages.appendChild(wrap);

    return wrap;
  }

  function scrollToBottom() {
    el.chatArea.scrollTop = el.chatArea.scrollHeight;
  }

  // Delegasi klik tombol "Salin" pada blok kode
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

    if (chat.messages.length === 0) {
      chat.title = trimmed.length > 38 ? trimmed.slice(0, 38) + "…" : trimmed;
    }

    chat.messages.push({ role: "user", text: trimmed });
    chat.updatedAt = Date.now();
    saveChats();
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
      const replyText = await callGeminiAPI(model, chat.messages);

      chat.messages.push({ role: "ai", text: replyText });
      chat.updatedAt = Date.now();
      saveChats();

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

  async function callGeminiAPI(model, messages) {
    const url = `${AI_CONFIG.BASE_URL}/${model.apiModel}:generateContent?key=${AI_CONFIG.API_KEY}`;

    // Konversi riwayat pesan ke format Gemini (user / model)
    const contents = messages.map((m) => ({
      role: m.role === "ai" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

    const body = {
      contents,
      systemInstruction: {
        parts: [{ text: AI_CONFIG.SYSTEM_INSTRUCTION }],
      },
    };

    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
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
      const apiMsg = data && data.error && data.error.message ? data.error.message : `HTTP ${res.status}`;
      throw new Error(`AI API error: ${apiMsg}`);
    }

    const candidate = data && data.candidates && data.candidates[0];
    const parts = candidate && candidate.content && candidate.content.parts;
    const answer = parts && parts.map((p) => p.text || "").join("").trim();

    if (!answer) {
      throw new Error("AI tidak mengembalikan jawaban. Coba lagi.");
    }
    return answer;
  }

  function setSendEnabled() {
    el.btnSend.disabled = isSending || el.promptInput.value.trim() === "";
  }

  /* ============ INPUT HANDLERS ============ */
  function autoResizeInput() {
    el.promptInput.style.height = "auto";
    el.promptInput.style.height = Math.min(el.promptInput.scrollHeight, 180) + "px";
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
    const text = card.querySelector("span").textContent;
    sendPrompt(text);
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
  function init() {
    loadChats();
    if (chats.length) {
      activeChatId = chats.slice().sort((a, b) => b.updatedAt - a.updatedAt)[0].id;
    }
    renderChatList();
    renderActiveChat();
    setSendEnabled();
  }

  init();
})();
