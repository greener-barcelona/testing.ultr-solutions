import { sb, ensureAppUser, saveLocalSession } from "../Common/db.js";
import {
  MODE_KEY,
  logout,
  autoResizeTextarea,
  updateSharedUser,
} from "../Common/shared.js";

let modeValue = "Screenshot";

const responseDiv = document.getElementById("messages");
const textarea = document.getElementById("userInputArea");

//Endpoints

async function createScreenshot(url) {
  if (!url) {
    return alert("Envia una url válida.");
  }

  const pending = document.createElement("div");
  pending.className = "message pending text-content";
  pending.textContent = `Sacando la screenshot...`;

  responseDiv.appendChild(pending);
  responseDiv.scrollTop = responseDiv.scrollHeight;

  try {
    const res = await fetch(`/api/url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: url,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Error al enviar.");
    }

    const data = await res.json();
    const link = data.reply;

    pending.remove();
    textarea.value = "";
    link && window.open(link, "_blank");

  } catch (err) {
    console.error(err);
    pending.textContent = `Error: ${err.message}`;
    pending.classList.remove("pending");
    pending.classList.add("error");
  }
}

//Auxiliares

function applyMode(mode) {
  const currentMode = localStorage.getItem(MODE_KEY);

  if (modeValue !== currentMode) {
    localStorage.setItem(MODE_KEY, mode);
    
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
      case "Brandstorming":
        window.location.href = "../Brandstorming/";
        break;
      case "Screenshot":
        window.location.href = "../Screenshot/";
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
  const valid = [
    "Brainstorming",
    "Naming",
    "Socialstorming",
    "Briefer",
    "Aya",
    "Multimo",
    "Brandstorming",
    "Screenshot",
  ];
  const initial = valid.includes(saved)
    ? saved
    : selector.value || "Brainstorming";

  applyMode(initial);
  selector.value = initial;
  titleText.text = initial;
  document.title = initial;
}

//Inicialización

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

  const settingsBtn = document.getElementById("settingsBtn");
  const settingsMenu = document.getElementById("settingsMenu");
  const logoutBtn = document.getElementById("logoutBtn");
  const modeSelector = document.getElementById("selector");
  const titleText = document.getElementById("title");

  if (
    !settingsBtn ||
    !settingsMenu ||
    !logoutBtn ||
    !textarea ||
    !responseDiv ||
    !modeSelector ||
    !textarea
  ) {
    console.warn("Buscador no inicializado (elementos faltantes)");
    return;
  }

  initModeSelector(modeSelector, titleText);

  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (textarea.value.trim()) createScreenshot(textarea.value.trim());
      else return alert("Escribe una url valida antes de enviar.");
    }
  });

  textarea.addEventListener("input", () => {
    autoResizeTextarea(textarea);
  });

  logoutBtn.addEventListener("click", () => {
    logout(MODE_KEY);
  });

  settingsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsMenu.classList.toggle("active");
  });

  modeSelector.addEventListener("change", (e) => {
    const value = e.target.value;
    titleText.text = value;
    document.title = value;
    modeValue = value;
    applyMode(value);
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
});
