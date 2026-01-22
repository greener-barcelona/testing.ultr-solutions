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
    max_tokens,
    presence_penalty,
    frequency_penalty,
  } = req.body;

  if (!messages || !perfil) {
    return res.status(400).json({ error: "Falta mensaje o perfil" });
  }

  let finalMessages = [...messages];
  let perfilContent = "";

  if (perfil && perfil.content) {
    perfilContent = perfil.content.trim();

    // Si el primer mensaje es system, fusionar
    if (finalMessages.length > 0 && finalMessages[0]?.role === "system") {
      finalMessages[0] = {
        role: "system",
        content: `${perfilContent}\n---\n${finalMessages[0].content.trim()}`,
      };
    }
    // Si no hay system al inicio, añadir perfil
    else {
      finalMessages.unshift({
        role: "system",
        content: perfilContent,
      });
    }
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: finalMessages,
      temperature: temperature ?? 1, // 1 → normal; > 1 → mas aleatoriedad; < 1 → mas seriedad y predecible
      top_p: top_p ?? 1, // < 0.7 → errático y muy restrictivo; < 1 && > .7 → rango adecuado; 1 → no restringe nada
      max_tokens: max_tokens ?? 5000,
      presence_penalty: presence_penalty ?? 0, // 0 → normal; > 0 → fuerza a introducir temas nuevos; < 0 → favorece repetir temas
      frequency_penalty: frequency_penalty ?? 0, // 0 → normal; > 0 → penaliza repetir palabras; < 0 → potencia repetir palabras
    });

    res.json({ reply: response.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al llamar a OpenAI" });
  }
}
