import { openai } from "../lib/openaiAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const {
    messages,
    perfil,
    temperature,
    top_p,
    max_tokens = 6000,
    presence_penalty,
    frequency_penalty,
  } = req.body;

  if (!messages) {
    return res.status(400).json({ error: "No hay mensajes" });
  }

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1",
      instructions: perfil.content,
      input: messages,
      temperature: temperature, // 1 → normal; > 1 → mas aleatoriedad; < 1 → mas seriedad y predecible
      top_p: top_p, // < 0.7 → errático y muy restrictivo; < 1 && > .7 → rango aceptable; 1 → no restringe nada
      max_output_tokens: max_tokens,
      presence_penalty: presence_penalty, // 0 → normal; > 0 → fuerza a introducir temas nuevos; < 0 → favorece repetir temas
      frequency_penalty: frequency_penalty, // 0 → normal; > 0 → penaliza repetir palabras; < 0 → potencia repetir palabras
      tools: [{ type: "web_search" }],
    });

    res.json({ reply: response.output_text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
