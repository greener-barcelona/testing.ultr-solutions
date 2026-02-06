import { anthropic } from "../lib/antropicAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { messages, perfil, temperature, top_p, max_tokens } = req.body;
  if (!messages || !perfil) {
    return res.status(400).json({ error: "Falta mensaje o perfil" });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      system: perfil.content,
      messages: messages,
      temperature: temperature ?? 1, // 1 → normal; > 1 → mas aleatoriedad; < 1 → mas seriedad y predecible
      top_p: top_p ?? 1, // < 0.7 → errático y muy restrictivo; < 1 && > .7 → rango aceptable; 1 → no restringe nada
      max_tokens: max_tokens ?? 5000,
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
