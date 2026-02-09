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

  if (!messages || !perfil)
    return res.status(400).json({ error: "Falta mensaje o perfil" });

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-2-1212",
        messages: [perfil, ...messages],
        temperature: temperature ?? 1, // 1 → normal; > 1 → mas aleatoriedad; < 1 → mas seriedad y predecible
        top_p: top_p ?? 1, // < 0.7 → errático y muy restrictivo; < 1 && > .7 → rango aceptable; 1 → no restringe nada
        max_tokens: max_tokens ?? 5000,
        presence_penalty: presence_penalty ?? 0, // 0 → normal; > 0 → fuerza a introducir temas nuevos; < 0 → favorece repetir temas
        frequency_penalty: frequency_penalty ?? 0, // 0 → normal; > 0 → penaliza repetir palabras; < 0 → potencia repetir palabras
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error al llamar a Grok: ${text}`);
    }

    const data = await response.json();
    const message = data.choices
      .filter((d) => d.finish_reason === "stop")
      .map((d) => d.message)[0];

    let reply = "";
    Array.isArray(message.content)
      ? (reply = message.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("\n"))
      : (reply = message.content);

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al llamar a Grok" });
  }
}
