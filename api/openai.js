import { openai } from "../lib/openaiAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { messages, perfil, temperature, top_p, max_tokens, presence_penalty, frequency_penalty } = req.body;
  if (!messages || !perfil) {
    return res.status(400).json({ error: "Falta mensaje o perfil" });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [perfil, ...messages],
      temperature: temperature || 1,
      top_p: top_p || 1,
      max_tokens: max_tokens || 5000,
      presence_penalty: presence_penalty || 0,
      frequency_penalty: frequency_penalty || 0,
    });

    res.json({ reply: response.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al llamar a OpenAI" });
  }
}
