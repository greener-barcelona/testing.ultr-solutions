import {
  sb,
  ensureAppUser,
  createConversation,
  saveMessage,
  getAllConversations,
  getConversationMessages,
  renameConversation,
  deleteConversation,
  saveLocalSession,
} from "../Common/db.js";
import {
  MODE_KEY,
  user,
  logout,
  addMessageToConversationHistory,
  refreshCachedConversations,
  renderMessage,
  extractPDFText,
  imageToBase64,
  replaceWeirdChars,
  extractBodyContent,
  toggleElement,
  autoResizeTextarea,
  updateSharedUser,
} from "../Common/shared.js";
import {
  brieferCreativo,
  brieferTecnico,
  brieferInstruccionesCreativo,
  brieferInstruccionesTecnico,
} from "../Common/perfiles.js";

let cachedConversations = [];

let modeValue = "Briefer";
let activeConversationId = null;
let title = "";
let exportBtn = null;
let briefButton = null;
let sendBtn = null;
let briefDrop = null;
let contextDrop = null;
let briefInputs = [];
let contextInputs = [];
let lastBriefHumano = "";
let lastBriefIA = "";
let pendingAttachments = { brief: [], context: [] };

const conversationHistory = [];
let responseDiv = null;
let textarea = null;

//Conversaciones

async function startNewConversation(newTitle) {
  title = newTitle || "Nueva conversación";
  responseDiv.innerHTML = "";
  conversationHistory.length = 0;
  const savedMode = localStorage.getItem("mode") || "Brainstorming";
  const newConv = await createConversation(
    title || "Nueva conversación",
    "Briefer",
  );

  if (newConv) {
    activeConversationId = newConv.id;
    cachedConversations.push(newConv);
    cachedConversations[cachedConversations.length - 1]._messages = [];
  }
  await loadSidebarConversations();
}

function addConversationToSidebar(conv) {
  const list = document.getElementById("conversationsList");
  const div = document.createElement("div");
  div.className = "conversation-item";
  div.dataset.conversationId = conv.id;

  const icon = document.createElement("div");
  icon.className = "conversation-icon";
  const username = conv.created_by_email.split("@")[0];
  icon.textContent = username[0].toUpperCase();

  const text = document.createElement("div");
  text.className = "conversation-text";
  text.innerHTML = `
    <div class="title">${conv.title}</div>
    <div class="user">${username}</div>
  `;

  const menuButton = document.createElement("button");
  menuButton.className = "conv-menu-btn";
  menuButton.textContent = "⋮";

  const menu = document.createElement("div");
  menu.className = "conv-menu";
  menu.innerHTML = `
    <div class="conv-menu-item rename">Renombrar</div>
    <div class="conv-menu-item delete">Eliminar</div>
  `;

  menuButton.addEventListener("click", (e) => {
    e.stopPropagation();

    document.querySelectorAll(".conv-menu").forEach((m) => {
      if (m !== menu) m.classList.remove("active");
    });

    if (!div.contains(menu)) {
      div.appendChild(menu);
    }

    menu.classList.toggle("active");
  });

  menu.querySelector(".rename").addEventListener("click", async (e) => {
    e.stopPropagation();

    const newTitle = prompt("Nuevo nombre para la conversación:", conv.title);
    if (!newTitle || !newTitle.trim()) return;

    const ok = await renameConversation(conv.id, newTitle.trim());
    if (!ok) {
      alert("Error al renombrar");
      return;
    }

    cachedConversations = cachedConversations.map((conversation) =>
      conversation.id === conv.id
        ? { ...conversation, title: newTitle.trim() }
        : conversation,
    );

    if (activeConversationId === conv.id) {
      title = newTitle.trim();
    }

    await loadSidebarConversations();
  });

  menu.querySelector(".delete").addEventListener("click", async (e) => {
    e.stopPropagation();

    if (!confirm("¿Seguro que deseas eliminar esta conversación?")) return;

    const ok = await deleteConversation(conv.id);
    if (!ok) {
      alert("Error al eliminar");
      return;
    }

    cachedConversations = cachedConversations.filter(
      (conversation) => conversation.id !== conv.id,
    );

    if (activeConversationId === conv.id) {
      responseDiv.innerHTML = "";
      activeConversationId = null;
    }

    await loadSidebarConversations();
  });

  div.addEventListener("click", () => loadConversation(conv.id));

  div.appendChild(icon);
  div.appendChild(text);
  div.appendChild(menuButton);

  list.appendChild(div);
}

async function loadSidebarConversations() {
  const list = document.getElementById("conversationsList");
  list.innerHTML = "";
  const all = await getAllConversations();

  const ordered = [...all].sort(
    (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
  );

  ordered.forEach(addConversationToSidebar);
}

async function loadConversation(conversationId) {
  const mode = localStorage.getItem("mode") || "Brainstorming";
  const { data: convData, error } = await sb
    .from("conversations")
    .select("title, mode")
    .eq("id", conversationId)
    .single();

  if (!error && convData) {
    title = convData.title;
    const titleDiv = document.getElementById("conversationTitle");
    if (titleDiv) titleDiv.textContent = convData.title;
  }

  const messages = await getConversationMessages(conversationId);
  activeConversationId = conversationId;
  conversationHistory.length = 0;
  responseDiv.innerHTML = "";

  messages.forEach((msg) => {
    if (msg.creative_agent !== "system") {
      const rendered = renderMessage({
        author:
          msg.creative_agent || msg.author_name.split(" ")[0] || "Usuario",
        text: msg.text,
        userProfile: msg.author_avatar,
      });

      addMessageToConversationHistory(rendered, conversationHistory);

      responseDiv.appendChild(rendered);
    } else conversationHistory.push({ role: "user", content: msg.text });
  });

  responseDiv.scrollTop = responseDiv.scrollHeight;
}

//Mensajes

async function userSendMessage() {
  if (!textarea || !responseDiv) return;

  const text = textarea.value.trim();
  if (!text) return;

  if (!activeConversationId) {
    title = text.length > 40 ? text.slice(0, 40) + "..." : text;
    await startNewConversation(title);
  }

  if (title === "Nueva conversación") {
    title = text.length > 40 ? text.slice(0, 40) + "..." : text;
    await renameConversation(activeConversationId, title);
    cachedConversations = cachedConversations.map((conversation) =>
      conversation.id === activeConversationId
        ? { ...conversation, title: title }
        : conversation,
    );
    await loadSidebarConversations();
  }

  const uiMessage = renderMessage({
    author: user.name.split(" ")[0] || "Usuario",
    text: text,
    userProfile: user.profilePicture,
  });

  responseDiv.appendChild(uiMessage);
  responseDiv.scrollTop = responseDiv.scrollHeight;

  addMessageToConversationHistory(uiMessage, conversationHistory);

  textarea.value = "";
  cachedConversations = cachedConversations.map((conversation) =>
    conversation.id === activeConversationId
      ? {
          ...conversation,
          _messages: [...conversation._messages, uiMessage.textContent.trim()],
        }
      : conversation,
  );
  await saveMessage(activeConversationId, { text: text });
  setExportButtonsEnabled(false, false);
}

//Botones

async function sendMessageToBrieferButton(triggerBtn) {
  toggleElement(triggerBtn);
  await userSendMessage();

  if (!activeConversationId || conversationHistory.length <= 0) {
    toggleElement(triggerBtn);
    return alert("Primero inicia una conversación antes de briefear.");
  }

  const conversationIdAtStart = activeConversationId;

  await sendMessageToBriefer(conversationIdAtStart);

  toggleElement(triggerBtn);
}

function setBtnEnabled(btn, enabled) {
  if (!btn) return;
  btn.disabled = !enabled;
  btn.classList.toggle("disabled", !enabled);
  console.log(
    btn.id,
    "enabled?",
    enabled,
    "disabled attr?",
    btn.disabled,
    "class:",
    btn.className,
  );
}
console.log(
  "lastBriefIA len",
  lastBriefIA?.length,
  "disabled?",
  briefButton?.disabled,
);
function setExportButtonsEnabled(humanoEnabled, iaEnabled) {
  setBtnEnabled(exportBtn, !!humanoEnabled);
  setBtnEnabled(briefButton, !!iaEnabled);
}

//Archivos

function pushSystemDoc(kind, filename, content) {
  const tag = kind === "brief" ? "BRIEF_CLIENTE" : "CONTEXTO";
  conversationHistory.push({
    role: "user",
    content: `[${tag}] ${filename}\n\n${content}`,
  });
}

async function handleFiles(files, kind) {
  const arr = Array.from(files || []);

  const toStringContent = (v) => {
    if (typeof v === "string") return v;

    if (Array.isArray(v)) return v.join("\n");

    if (v && typeof v === "object") {
      if (typeof v.text === "string") return v.text;
      if (typeof v.content === "string") return v.content;
      if (typeof v.data === "string") return v.data;

      if (Array.isArray(v.pages)) return v.pages.join("\n");
      if (Array.isArray(v.items)) return v.items.join("\n");
    }
    return "";
  };

  for (const file of arr) {
    if (!file) continue;

    const isPdf = file.type === "application/pdf";
    const isImg = ["image/jpeg", "image/png", "image/jpg"].includes(file.type);
    const isTxt = file.type === "text/plain";
    const isDoc =
      [
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(file.type) || /\.docx?$/.test((file.name || "").toLowerCase());

    if (!isPdf && !isImg && !isTxt && !isDoc) continue;

    if (isPdf && file.size > 30 * 1024 * 1024) {
      alert("PDF > 30MB");
      continue;
    }
    if (isImg && file.size > 10 * 1024 * 1024) {
      alert("Imagen > 10MB");
      continue;
    }
    if (isTxt && file.size > 2 * 1024 * 1024) {
      alert("TXT > 2MB");
      continue;
    }

    try {
      let rawContent = "";

      if (isPdf) rawContent = await extractPDFText(file);
      else if (isImg) rawContent = await imageToBase64(file);
      else if (isTxt) rawContent = await file.text();
      else if (isDoc) {
        try {
          rawContent = await file.text();
        } catch (e) {
          try {
            const ab = await file.arrayBuffer();
            rawContent = new TextDecoder("utf-8").decode(ab);
          } catch (e2) {
            rawContent = "";
          }
        }
      }

      const fileContent = toStringContent(rawContent);
      console.log("PDF extract type:", typeof fileContent, fileContent);

      if (!fileContent || !fileContent.trim()) {
        const errorDiv = document.createElement("div");
        errorDiv.className = "message error text-content";
        errorDiv.textContent = `El archivo ${file.name} no tiene contenido.`;
        responseDiv.appendChild(errorDiv);
        continue;
      }
      if (!activeConversationId) {
        title =
          file.name.length > 40 ? file.name.slice(0, 40) + "..." : file.name;
        await startNewConversation(title);
      }

      // UI feedback
      const replyDiv = renderMessage({
        author: user.name.split(" ")[0] || "Usuario",
        text: `${file.name} cargado (${kind === "brief" ? "brief" : "contexto"}).`,
        userProfile: user.profilePicture,
      });
      responseDiv.appendChild(replyDiv);
      responseDiv.scrollTop = responseDiv.scrollHeight;

      if (kind === "brief")
        briefInputs.push({ name: file.name, content: fileContent });
      else contextInputs.push({ name: file.name, content: fileContent });

      pushSystemDoc(kind, file.name, fileContent);

      await saveMessage(activeConversationId, {
        text: replyDiv.textContent.trim(),
      });
      await saveMessage(activeConversationId, {
        text: fileContent,
        creativeAgent: "system",
      });
    } catch (err) {
      console.error(err);
      alert(`Error procesando ${file.name}`);
    }
  }

  setExportButtonsEnabled(false, false);
  responseDiv.scrollTop = responseDiv.scrollHeight;
}

function wireDropzone(zoneEl, kind) {
  const setActive = (on) => zoneEl.classList.toggle("is-dragover", on);

  zoneEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    setActive(true);
  });
  zoneEl.addEventListener("dragleave", () => setActive(false));
  zoneEl.addEventListener("drop", async (e) => {
    e.preventDefault();
    setActive(false);
    const files = e.dataTransfer?.files;
    if (files && files.length) await handleFiles(files, kind);
  });
}

function downloadDoc(filename, html) {
  const full = `<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
  const blob = new Blob([full], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

//Endpoints

async function sendMessageToBriefer(conversationId) {
  const convHistoryAtStart = structuredClone(conversationHistory);

  lastBriefHumano = "";
  lastBriefIA = "";
  setExportButtonsEnabled(false, false);

  const pending = document.createElement("div");
  pending.className = "message pending text-content";

  if (activeConversationId === conversationId) {
    responseDiv.appendChild(pending);
    responseDiv.scrollTop = responseDiv.scrollHeight;
  }

  const jobs = [
    {
      kind: "humano",
      label: "Creando brief creativo...",
      system: `${brieferCreativo.content}\n\n${brieferInstruccionesCreativo.content}`,
    },
    {
      kind: "ia",
      label: "Creando brief técnico...",
      system: `${brieferTecnico.content}\n\n${brieferInstruccionesTecnico.content}`,
    },
  ];

  for (const job of jobs) {
    try {
      pending.textContent = job.label;

      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          perfil: { role: "system", content: job.system },
          messages: convHistoryAtStart,
        }),
      });

      if (!res.ok) {
        let msg = "Error al enviar.";
        try {
          const errorData = await res.json();
          msg = errorData?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      const data = await res.json();
      console.log("reply keys:", Object.keys(data), "kind:", job.kind);

      const reply =
        data?.reply ?? data?.content ?? data?.completion ?? data?.message ?? "";

      const raw = replaceWeirdChars(String(reply));
      const extracted = extractBodyContent(raw);
      const html = extracted && extracted.trim() ? extracted : raw;

      if (job.kind === "humano") lastBriefHumano = html;
      if (job.kind === "ia") lastBriefIA = html;

      await saveMessage(conversationId, {
        text: html,
        creativeAgent: `briefer-claude-${job.kind}`, // opcional: distinguir
      });

      if (activeConversationId === conversationId) {
        const replyDiv = renderMessage({
          author: "briefer-claude",
          text: html,
        });
        if (pending.isConnected) responseDiv.insertBefore(replyDiv, pending);
        else responseDiv.appendChild(replyDiv);

        responseDiv.scrollTop = responseDiv.scrollHeight;
      }
    } catch (err) {
      console.error(err);
      pending.classList.remove("pending");
      pending.classList.add("error");
      pending.textContent = `Error: ${err.message}`;
      continue;
    }
  }

  if (pending.isConnected) pending.remove();

  setExportButtonsEnabled(Boolean(lastBriefHumano), Boolean(lastBriefIA));
}

async function exportConversation(button, summarize) {
  return alert("Función de exportar deshabilitada en el entorno de pruebas");
}

//Modal

function openSearchModal() {
  const searchModal = document.getElementById("searchModal");
  const searchInput = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");
  if (!searchModal || !searchInput || !searchResults) return;

  searchModal.classList.add("active");
  searchInput.value = "";
  searchResults.innerHTML = "";
  searchInput.focus();
}

function closeSearchModal() {
  const searchModal = document.getElementById("searchModal");
  if (searchModal) searchModal.classList.remove("active");
}

//Auxiliares

function applyMode(mode) {
  const currentMode = localStorage.getItem(MODE_KEY);

  if (modeValue !== currentMode) {
    localStorage.setItem(MODE_KEY, mode);

    activeConversationId = null;
    title = "";
    conversationHistory.length = 0;
    responseDiv.innerHTML = "";

    switch (mode) {
      case "Briefer":
        window.location.href = "../Briefer/";
        break;
      case "Aya":
        window.location.href = "../Aya/";
        break;
      case "Multimo":
        window.location.href = "../Multimo/";
        break;
      default:
        window.location.href = "../Chat/";
        return;
    }
  }

  modeValue = mode;
}

function initModeSelector(selector, titleText) {
  const saved = localStorage.getItem(MODE_KEY);
  const valid = ["Brainstorming", "Naming", "Socialstorming", "Briefer", "Aya", "Multimo"];  const initial = valid.includes(saved)
    ? saved
    : selector.value || "Brainstorming";

  applyMode(initial);
  selector.value = initial;
  titleText.text = initial;
  document.title = initial;
}

//Init

document.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { session },
  } = await sb.auth.getSession();

  if (!session) {
    window.location.href = "../LogIn/";
    return;
  }
  updateSharedUser(session.user);
  saveLocalSession(session.user);

  await ensureAppUser();

  const searchBtn = document.getElementById("searchChatBtn");
  const searchModal = document.getElementById("searchModal");
  const searchInput = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsMenu = document.getElementById("settingsMenu");
  const logoutBtn = document.getElementById("logoutBtn");
  const newChatBtn = document.getElementById("newChatBtn");
  const briefFileInput = document.getElementById("briefFileInput");
  const contextFileInput = document.getElementById("contextFileInput");
  const modeSelector = document.getElementById("selector");
  const titleText = document.getElementById("title");
  exportBtn = document.getElementById("exportBtn");
  briefButton = document.getElementById("briefButton");
  sendBtn = document.getElementById("sendBtn");
  briefDrop = document.getElementById("briefDrop");
  contextDrop = document.getElementById("contextDrop");
  responseDiv = document.getElementById("messages");
  textarea = document.getElementById("userInputArea");
  if (
    !searchBtn ||
    !searchModal ||
    !searchInput ||
    !searchResults ||
    !settingsBtn ||
    !settingsMenu ||
    !logoutBtn ||
    !newChatBtn ||
    !exportBtn ||
    !sendBtn ||
    !briefDrop ||
    !contextDrop ||
    !briefFileInput ||
    !contextFileInput ||
    !modeSelector ||
    !textarea ||
    !responseDiv ||
    !titleText ||
    !briefButton
  ) {
    console.warn("Buscador no inicializado (elementos faltantes)");
    return;
  }
  setExportButtonsEnabled(false, false);

  initModeSelector(modeSelector, titleText);

  modeSelector.addEventListener("change", (e) => {
    const value = e.target.value;
    titleText.text = value;
    document.title = value;
    modeValue = value;
    applyMode(value);
  });
  wireDropzone(briefDrop, "brief");
  wireDropzone(contextDrop, "context");
  sendBtn.addEventListener("click", async () => {
    await sendMessageToBrieferButton(sendBtn);
  });

  searchBtn.addEventListener("click", openSearchModal);

  searchModal.addEventListener("click", (e) => {
    if (e.target === searchModal) closeSearchModal();
  });

  briefFileInput.addEventListener("change", async (e) => {
    await handleFiles(e.target.files, "brief");
    e.target.value = "";
  });

  contextFileInput.addEventListener("change", async (e) => {
    await handleFiles(e.target.files, "context");
    e.target.value = "";
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSearchModal();
  });

  if (searchInput && searchResults) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase().trim();
      searchResults.innerHTML = "";
      if (!query || !Array.isArray(cachedConversations)) return;

      cachedConversations.forEach((conv) => {
        const titleMatch = (conv.title || "").toLowerCase().includes(query);
        const msgs = conv._messages || [];
        const contentMatch = msgs.some((m) => {
          const text = typeof m === "string" ? m : m?.text || "";
          return text.toLowerCase().includes(query);
        });

        if (!titleMatch && !contentMatch) return;

        const div = document.createElement("div");
        div.className = "search-result-item";
        div.innerHTML = `<div class="search-result-title">${
          conv.title || ""
        }</div>`;
        div.onclick = () => {
          closeSearchModal();
          loadConversation(conv.id);
        };
        searchResults.appendChild(div);
      });
    });
  }

  textarea.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (typeof sendMessageToBrieferButton === "function" && briefButton) {
        await sendMessageToBrieferButton(sendBtn);
      } else {
        await userSendMessage();
      }
    }
  });
  textarea.addEventListener("input", autoResizeTextarea(textarea));

  newChatBtn.addEventListener(
    "click",
    async () => await startNewConversation(),
  );

  logoutBtn.addEventListener("click", () => logout(MODE_KEY));

  settingsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsMenu.classList.toggle("active");
  });

  document.addEventListener("click", (e) => {
    if (!settingsBtn.contains(e.target) && !settingsMenu.contains(e.target)) {
      settingsMenu.classList.remove("active");
    }

    document.querySelectorAll(".conv-menu").forEach((menu) => {
      const btn = menu.previousElementSibling;
      if (!menu.contains(e.target) && !btn?.contains(e.target)) {
        menu.classList.remove("active");
      }
    });
  });

  exportBtn.addEventListener("click", () => {
    if (!lastBriefHumano) return alert("Aún no hay brief creativo generado.");
    downloadDoc(`brief-creativo-${activeConversationId}.doc`, lastBriefHumano);
  });

  briefButton.addEventListener("click", () => {
    if (!lastBriefIA) return alert("Aún no hay brief técnico generado.");
    downloadDoc(`brief-tecnico-${activeConversationId}.doc`, lastBriefIA);
  });

  await loadSidebarConversations();
  cachedConversations = await refreshCachedConversations();
  console.log(
    "briefButton count",
    document.querySelectorAll("#briefButton").length,
  );
  console.log(
    "exportBtn count",
    document.querySelectorAll("#exportBtn").length,
  );
  console.log("briefButton el", document.getElementById("briefButton"));
});
