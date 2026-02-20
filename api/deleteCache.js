import { gemini } from "../lib/geminiAuth";

export async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { cacheName } = req.body;

  if (!cacheName) {
    return res.status(400).json({ error: "Falta mensaje o perfil" });
  }

  await gemini.caches.delete({ name: cacheName });
  console.log("🗑️  Caché eliminado:", cacheName);
}
