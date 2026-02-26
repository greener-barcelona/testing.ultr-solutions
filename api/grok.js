import { grok } from "../lib/grokAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { messages, perfil, temperature, top_p, max_tokens = 6000 } = req.body;

  if (!messages || !perfil)
    return res.status(400).json({ error: "Falta mensaje o perfil" });

  try {
    const response = await grok.responses.create({
      model: "grok-4-1-fast-reasoning",
      input: [perfil, ...messages],
      temperature: temperature, // 1 → normal; > 1 → mas aleatoriedad; < 1 → mas seriedad y predecible
      top_p: top_p, // < 0.7 → errático y muy restrictivo; < 1 && > .7 → rango aceptable; 1 → no restringe nada
      max_output_tokens: max_tokens,
      tools: [{ type: "web_search" }],
    });

    const texto =
      response.output
        ?.find((item) => item.type === "message")
        ?.content?.find((c) => c.type === "output_text" || c.type === "text")
        ?.text ?? "";

    res.json({ reply: texto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
