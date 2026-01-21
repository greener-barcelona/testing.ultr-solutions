import {
  sb,
  ensureAppUser,
  createConversation,
  saveMessage,
  getAllConversations,
  getConversationMessages,
  renameConversation,
  deleteConversation,
} from "../Common/db.js";
import {
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
} from "../Common/shared.js";
import { brieferPerfil, brieferInstrucciones } from "../Common/perfiles.js";

let cachedConversations = [];

const MODE_KEY = "mode";
let modeValue = "Briefer";
let activeConversationId = null;
let title = "";
let exportBtn = null;
let briefButton = null;
let sendBtn = null;
let briefDrop = null;
let contextDrop = null;
let briefInputs = [];   // textos extraídos del brief cliente
let contextInputs = []; // textos extraídos del contexto adicional
let lastBriefHumano = "";
let lastBriefIA = "";

const conversationHistory = [];

const responseDiv = document.getElementById("messages");
const textarea = document.getElementById("userInputArea");

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
  setExportButtonsEnabled(true, false);
}

//Botones

async function sendMessageToBrieferButton(triggerBtn) {
  toggleElement(triggerBtn);
  await userSendMessage();

  if (!activeConversationId || conversationHistory.length <= 0) {
    toggleElement(triggerBtn);
    return alert("Primero inicia una conversación antes de resumir.");
  }

  const conversationIdAtStart = activeConversationId;

  await sendMessageToBriefer(conversationIdAtStart);

  toggleElement(triggerBtn);
}

function setBtnEnabled(btn, enabled) {
  btn.disabled = !enabled;
  btn.classList.toggle("disabled", !enabled);
}

function setExportButtonsEnabled(humanoEnabled, iaEnabled) {
  setBtnEnabled(exportBtn, !!humanoEnabled);
  setBtnEnabled(briefButton, !!iaEnabled);
}

//Archivos

/*async function onFileLoaded(e, fileInput) {
  const files = Array.from(e.target.files);
  for (const file of files) {
    if (!file) continue;

    if (
      file.type !== "application/pdf" &&
      file.type !== "image/jpeg" &&
      file.type !== "image/png" &&
      file.type !== "image/jpg"
    )
      continue;

    if (file.type === "application/pdf" && file.size > 30 * 1024 * 1024) {
      alert("El archivo es demasiado grande. Máximo de 30MB para PDFs");
      continue;
    }
    if (
      (file.type === "image/jpeg" ||
        file.type === "image/png" ||
        file.type === "image/jpg") &&
      file.size > 10 * 1024 * 1024
    ) {
      alert("El archivo es demasiado grande. Máximo de 10MB para imágenes");
      continue;
    }

    try {
      let fileContent;
      if (file.type === "application/pdf") {
        fileContent = await extractPDFText(file);
      } else {
        fileContent = await imageToBase64(file);
      }

      if (!fileContent) {
        const errorDiv = document.createElement("div");
        errorDiv.className = `message error text-content`;
        errorDiv.textContent = `el PDF ${file.name} no tiene contenido.`;
        responseDiv.appendChild(errorDiv);
        responseDiv.scrollTop = responseDiv.scrollHeight;
        continue;
      }

      if (!activeConversationId) {
        title =
          file.name.length > 40 ? file.name.slice(0, 40) + "..." : file.name;
        await startNewConversation(title);
      }

      if (title === "Nueva conversación") {
        title =
          file.name.length > 40 ? file.name.slice(0, 40) + "..." : file.name;
        await renameConversation(activeConversationId, title);
        cachedConversations = cachedConversations.map((conversation) =>
          conversation.id === activeConversationId
            ? { ...conversation, title: title }
            : conversation,
        );
        await loadSidebarConversations();
      }

      const replyDiv = renderMessage({
        author: user.name.split(" ")[0] || "Usuario",
        text: `${file.name} cargado correctamente.`,
        userProfile: user.profilePicture,
      });

      addMessageToConversationHistory(replyDiv, conversationHistory);

      responseDiv.appendChild(replyDiv);
      responseDiv.scrollTop = responseDiv.scrollHeight;

      conversationHistory.push({
        role: "user",
        content: fileContent,
      });

      await saveMessage(activeConversationId, {
        text: replyDiv.textContent.trim(),
      });

      await saveMessage(activeConversationId, {
        text: fileContent,
        creativeAgent: "system",
      });
    } catch (error) {
      console.error("Error al procesar el PDF:", error);
      alert(`Error al procesar el archivo ${file.name}`);
    }

    fileInput.value = "";
  }
}*/

function pushSystemDoc(kind, filename, content) {
  const tag = kind === "brief" ? "BRIEF_CLIENTE" : "CONTEXTO";
  conversationHistory.push({
    role: "user",
    content: `[${tag}] ${filename}\n\n${content}`,
  });
}

async function handleFiles(files, kind) {
  const arr = Array.from(files || []);
  for (const file of arr) {
    if (!file) continue;

    const isPdf = file.type === "application/pdf";
    const isImg = ["image/jpeg", "image/png", "image/jpg"].includes(file.type);
    const isTxt = file.type === "text/plain";
    const isDoc =
      file.name.toLowerCase().endsWith(".doc") ||
      file.name.toLowerCase().endsWith(".docx");

    // Acepta lo que realmente soportas. OJO: ahora mismo NO procesas doc/docx.
    if (!isPdf && !isImg && !isTxt) continue;

    if (isPdf && file.size > 30 * 1024 * 1024) { alert("PDF > 30MB"); continue; }
    if (isImg && file.size > 10 * 1024 * 1024) { alert("Imagen > 10MB"); continue; }
    if (isTxt && file.size > 2 * 1024 * 1024) { alert("TXT > 2MB"); continue; }

    let fileContent = "";
    try {
      if (isPdf) fileContent = await extractPDFText(file);
      else if (isImg) fileContent = await imageToBase64(file);
      else if (isTxt) fileContent = await file.text();

      if (!fileContent || !fileContent.trim()) {
        const errorDiv = document.createElement("div");
        errorDiv.className = "message error text-content";
        errorDiv.textContent = `El archivo ${file.name} no tiene contenido.`;
        responseDiv.appendChild(errorDiv);
        continue;
      }

      // asegura conversación
      if (!activeConversationId) {
        title = file.name.length > 40 ? file.name.slice(0, 40) + "..." : file.name;
        await startNewConversation(title);
      }

      // UI feedback
      const replyDiv = renderMessage({
        author: user.name.split(" ")[0] || "Usuario",
        text: `${file.name} cargado (${kind === "brief" ? "brief" : "contexto"}).`,
        userProfile: user.profilePicture,
      });
      responseDiv.appendChild(replyDiv);

      // estado local
      if (kind === "brief") briefInputs.push({ name: file.name, content: fileContent });
      else contextInputs.push({ name: file.name, content: fileContent });

      // IMPORTANT: etiqueta para que el modelo lo trate distinto
      pushSystemDoc(kind, file.name, fileContent);

      // persistencia
      await saveMessage(activeConversationId, { text: replyDiv.textContent.trim() });
      await saveMessage(activeConversationId, { text: fileContent, creativeAgent: "system" });

    } catch (err) {
      console.error(err);
      alert(`Error procesando ${file.name}`);
    }
  }
setExportButtonsEnabled(true, false);
  responseDiv.scrollTop = responseDiv.scrollHeight;
}

function wireDropzone(zoneEl, kind) {
  const setActive = (on) => zoneEl.classList.toggle("is-dragover", on);

  zoneEl.addEventListener("dragover", (e) => { e.preventDefault(); setActive(true); });
  zoneEl.addEventListener("dragleave", () => setActive(false));
  zoneEl.addEventListener("drop", async (e) => {
    e.preventDefault();
    setActive(false);
    const files = e.dataTransfer?.files;
    if (files && files.length) await handleFiles(files, kind);
  });
}

function downloadText(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

exportBtn.addEventListener("click", () => {
  if (!lastBriefHumano) return alert("Aún no hay brief humano generado.");
  downloadText(`brief-creativo-${activeConversationId}.md`, lastBriefHumano);
});

briefButton.addEventListener("click", () => {
  if (!lastBriefIA) return alert("Aún no hay brief IA generado.");
  downloadText(`brief-ia-${activeConversationId}.json`, lastBriefIA);
});

function buildInputHeader() {
  const b = briefInputs.map(x => `- ${x.name}`).join("\n") || "- (ninguno)";
  const c = contextInputs.map(x => `- ${x.name}`).join("\n") || "- (ninguno)";
  return `DOCUMENTOS CARGADOS:\nBRIEF_CLIENTE:\n${b}\n\nCONTEXTO:\n${c}\n`;
}


//Endpoints

async function sendMessageToBriefer(conversationId) {
  const pending = document.createElement("div");
  pending.className = "message pending text-content";
  pending.textContent = "Briefeando...";

  const extractBlock = (text, start, end) => {
    const a = text.indexOf(start);
    const b = text.indexOf(end);
    if (a === -1 || b === -1 || b <= a) return "";
    return text.slice(a + start.length, b).trim();
  };

  if (activeConversationId === conversationId) {
    responseDiv.appendChild(pending);
    responseDiv.scrollTop = responseDiv.scrollHeight;
  }

  try {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        perfil: {
          role: "system",
          content: `${brieferPerfil.content}\n\n${brieferInstrucciones}\n\n${buildInputHeader()}`,
        },
        messages: conversationHistory,
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
    const text = replaceWeirdChars(data.reply);
    const cleanhtml = extractBodyContent(text);

    if (!cleanhtml || !cleanhtml.trim()) {
      throw new Error("La IA no generó respuesta");
    }

    // Guarda respuesta completa (por si quieres auditar/debuggear)
    await saveMessage(conversationId, {
      text: cleanhtml,
      creativeAgent: "briefer-claude",
    });

    // Extrae ambos artefactos
    lastBriefHumano = extractBlock(
      cleanhtml,
      "<<<BRIEF_CREATIVO>>>",
      "<<<END_BRIEF_CREATIVO>>>"
    );
    lastBriefIA = extractBlock(
      cleanhtml,
      "<<<BRIEF_TECNICO>>>",
      "<<<END_BRIEF_TECNICO>>>"
    );

    // Actualiza sidebar cache
    cachedConversations = cachedConversations.map((c) =>
      c.id === conversationId
        ? { ...c, _messages: [...(c._messages || []), cleanhtml] }
        : c
    );

    // Quita pending si está en pantalla
    if (pending.isConnected) pending.remove();

    // Renderiza SOLO el humano (si no vino con tags, muestra todo)
    if (activeConversationId === conversationId) {
      const toShow = lastBriefHumano || cleanhtml;

      const replyDiv = renderMessage({
        author: "briefer-claude",
        text: toShow,
      });

      addMessageToConversationHistory(replyDiv, conversationHistory);
      responseDiv.appendChild(replyDiv);
      responseDiv.scrollTop = responseDiv.scrollHeight;

      // Habilita exports según existan
      setExportButtonsEnabled(!!lastBriefHumano, !!lastBriefIA);
    }
  } catch (err) {
    console.error(err);

    if (pending.isConnected) {
      pending.textContent = `Error: ${err.message}`;
      pending.classList.remove("pending");
      pending.classList.add("error");
    } else if (activeConversationId === conversationId) {
      const errorDiv = document.createElement("div");
      errorDiv.className = "message error text-content";
      errorDiv.textContent = `Error: ${err.message}`;
      responseDiv.appendChild(errorDiv);
      responseDiv.scrollTop = responseDiv.scrollHeight;
    }
  }
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
  localStorage.setItem(MODE_KEY, mode);
  modeValue = mode;

  activeConversationId = null;
  title = "";
  conversationHistory.length = 0;
  responseDiv.innerHTML = "";

  if (
    mode === "Brainstorming" ||
    mode === "Naming" ||
    mode === "Socialstorming"
  ) {
    window.location.href = "../Chat/";
    return;
  }
}

function initModeSelector(selector) {
  const saved = localStorage.getItem(MODE_KEY);
  const valid = ["Brainstorming", "Naming", "Socialstorming", "Briefer", "Aya"];
  const initial = valid.includes(saved)
    ? saved
    : selector.value || "Brainstorming";

  selector.value = initial;
  modeValue = initial;
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

  await ensureAppUser();
  await loadSidebarConversations();

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
  if (
    !searchBtn ||
    !searchModal ||
    !searchInput ||
    !searchResults ||
    !settingsBtn ||
    !settingsMenu ||
    !logoutBtn ||
    !newChatBtn ||
    !textarea ||
    !exportBtn ||
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

  initModeSelector(modeSelector);

  modeSelector.addEventListener("change", (e) => {
    const value = e.target.value;
    applyMode(value);
    titleText.text = value;
    document.title = modeValue;
  });
wireDropzone(briefDrop, "brief");
wireDropzone(contextDrop, "context");
  sendBtn.addEventListener("click", async () => {
  await userSendMessage();
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

  if (textarea) {
    textarea.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        await userSendMessage();
      }
    });
    textarea.addEventListener("input", autoResizeTextarea(textarea));
  }

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
    exportConversation(exportBtn, false);
  });

   briefButton.addEventListener("click", () => {
    sendMessageToBrieferButton(briefButton);
  });

  cachedConversations = await refreshCachedConversations();
});
