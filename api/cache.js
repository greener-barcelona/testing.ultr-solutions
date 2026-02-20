import { gemini } from "../lib/geminiAuth";

export async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { contextText, ttlSeconds = 3600 } = req.body;

  if (!contextText) {
    return res.status(400).json({ error: "Falta mensaje o perfil" });
  }

  const cache = await gemini.caches.create({
    model: "gemini-2.5-pro",
    config: {
      contents: [{ role: "user", parts: [{ text: contextText }] }],
      ttl: `${ttlSeconds}s`,
    },
  });
  console.log("✅ Caché creado:", cache.name);

  res.json({
    reply: cache.name,
  });
}
