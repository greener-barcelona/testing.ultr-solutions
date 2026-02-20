import { gemini } from "../lib/geminiAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { messages, perfil, cacheName, max_tokens } = req.body;
  if (!messages || !perfil) {
    return res.status(400).json({ error: "Falta mensaje o perfil" });
  }

  const finalMessages = messages.map((message) => ({
    role: message.role === "assistant" ? "model" : message.role,
    parts: [{ text: message.content }],
  }));

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-pro",
      contents: finalMessages,
      config: {
        systemInstruction: perfil.content,
        tools: [{ googleSearch: {} }],
        ...(cacheName && { cachedContent: cacheName }),
        maxOutputTokens: max_tokens ?? 2000,
      },
    });

    res.json({
      reply: response.text,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al llamar a Gemini" });
  }
}
