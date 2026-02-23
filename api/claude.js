import { anthropic } from "../lib/antropicAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { messages, perfil, temperature, max_tokens = 5000 } = req.body;
  if (!messages || !perfil) {
    return res.status(400).json({ error: "Falta mensaje o perfil" });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      system: perfil.content,
      messages: messages,
      temperature: temperature, 
      max_tokens: max_tokens,
    });

    res.json({
      reply: response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n"),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al llamar a Claude" });
  }
}
