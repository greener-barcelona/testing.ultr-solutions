import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs";

import {
  sb,
  getLocalSession,
  getAllConversations,
  getConversationMessages,
} from "./db.js";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs";

//Sesión

export const user = getLocalSession() || {};

export function updateSharedUser(newData) {
  if (!newData) return;
  Object.assign(user, {
    id: newData.id,
    email: newData.email,
    name: newData.user_metadata?.full_name || newData.email,
    profilePicture: newData.user_metadata?.avatar_url || null,
  });
}

export async function getSupabaseUser() {
  const { data: { session } } = await sb.auth.getSession();
  return session?.user ?? null;
}
export function onAuthChange(cb) {
  return sb.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null);
  });
}

export async function logout(MODE_KEY) {
  localStorage.removeItem(MODE_KEY);
  localStorage.removeItem("ultraUser");
  await sb.auth.signOut();
  window.location.href = "../LogIn/";
}
export function getActiveUser() {
  return getLocalSession();
}

//Conversaciones

export function addMessageToConversationHistory(message, conversationHistory) {
  const classArray = Array.from(message.classList);
  const apiClass = classArray.find((c) => c.startsWith("api-"));
  const profileClass = classArray.find((c) => c.startsWith("profile-"));
  const userClass = classArray.find((c) => c.startsWith("user-"));
  const systemClass = classArray.includes("system");

  let autor = "";

  if (profileClass && apiClass)
    autor = `${profileClass.split("-")[1]}-${apiClass.split("-")[1]}`;
  else if (systemClass) autor = "Sistema";
  else if (userClass) autor = `${userClass.split("-")[1]}`;

  const content = `${autor}: ${message.textContent.trim()}`;

  if (content === "" || content === null) return;

  if (userClass || systemClass || profileClass) {
    conversationHistory.push({
      role: autor.startsWith("briefer-") ? "assistant" : "user",
      content: content,
    });
  }
  console.log(conversationHistory);
}

export async function refreshCachedConversations(cachedConversations) {
  cachedConversations = await getAllConversations();
  for (const conv of cachedConversations) {
    conv._messages = await getConversationMessages(conv.id);
    conv._messages = conv._messages.map((msg) => msg.text);
  }
  return cachedConversations;
}

//Mensajes

export function renderMessage({ author, text, userProfile }) {
  const isUser =
    (!author.includes("-") && author !== "system") || author === "Usuario";
  const isSystem = author === "system";

  const wrapper = document.createElement("div");
  wrapper.className = `message-content-wrapper ${isUser ? "right" : "left"}`;

  const divText = document.createElement("div");
  divText.className = "text-content";
  divText.innerHTML = text;

  if (!isUser && !isSystem) {
    divText.classList.add("ai-message");
  }

  if (isUser) {
    const avatar = document.createElement("img");
    avatar.className = "avatar";
    avatar.src = userProfile || "https://via.placeholder.com/30";

    wrapper.appendChild(avatar);
    wrapper.appendChild(divText);
  } else if (!isUser && !isSystem) {
    const autor = document.createElement("div");
    autor.className = "ia-autor text-content";
    autor.innerHTML = `${author.split("-")[0]}-${author.split("-")[1]}`;
    wrapper.appendChild(divText);
    wrapper.appendChild(autor);
  }
  const div = document.createElement("div");
  div.classList.add("message");
  if (isUser) div.classList.add(`user-${author}`, "user");
  if (isSystem) div.classList.add("system");
  if (!isUser && !isSystem) {
    div.classList.add(`profile-${author.split("-")[0]}`);
    div.classList.add(`api-${author.split("-")[1]}`);
  }

  div.appendChild(wrapper);

  return div;
}

//Archivos

export async function extractPDFText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n\n";
  }
  return fullText.trim();
}

async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          },
          "image/jpeg",
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function imageToBase64(file) {
  const compressedImage = await compressImage(file);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const imgBase64 = reader.result.split(",")[1];
      resolve([
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: imgBase64,
          },
        },
      ]);
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsDataURL(compressedImage);
  });
}

//Auxiliares

export function replaceWeirdChars(text) {
  const htmlFreeText = text.replace(/```html|```/g, "");

  let open = true;
  const asteriskFreeText = htmlFreeText.replace(/\*\*/g, () => {
    const tag = open ? "<strong>" : "</strong>";
    open = !open;
    return tag;
  });

  const hashtagFreeText = asteriskFreeText.replace(/#{2,}/g, "");

  return hashtagFreeText;
}

export function extractBodyContent(html) {
  const isFullHTML =
    /<!doctype html>/i.test(html) ||
    (/<html[\s>]/i.test(html) && /<body[\s>]/i.test(html));

  if (!isFullHTML) {
    return html;
  }

  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1] : "";
}

export function toggleElement(element) {
  element.disabled = !element.disabled;
}

export function autoResizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 140) + "px";
}
