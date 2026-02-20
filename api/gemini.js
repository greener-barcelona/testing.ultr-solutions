import { gemini } from "../lib/geminiAuth";

export async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { messages, perfil, cacheName, max_tokens } = req.body;
  if (!messages || !perfil) {
    return res.status(400).json({ error: "Falta mensaje o perfil" });
  }

  const response = await gemini.models.generateContent({
    model: "gemini-2.5-pro",
    contents: messages,
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
}
