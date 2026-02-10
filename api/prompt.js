import { anthropic } from "../lib/antropicAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { messages } = req.body;
  if (!messages) {
    return res.status(400).json({ error: "Falta conversacion" });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      system: `Instrucciones

Eres un asistente que resume de forma objetiva el estado actual de un brainstorming creativo.

A partir exclusivamente del historial de la conversación (no inventes, no completes con suposiciones), genera un brief usando exactamente este formato y estos encabezados:

OBJETIVO:
[qué se busca, en una sola línea]

CONTEXTO:
[tipo de agencia, audiencia target, tono deseado — solo si aparece en la conversación]

IDEAS VALIDADAS:

[idea concreta + motivo explícito por el que fue validada]

IDEAS DESCARTADAS:

[idea concreta + motivo explícito por el que fue descartada]

DIRECCIÓN ACTUAL:
[hacia dónde apunta el usuario según los últimos mensajes]

RESTRICCIONES:

[todo lo que el usuario ha dicho explícitamente que NO quiere]

ÚLTIMO PEDIDO DEL USUARIO:
[copia fiel del mensaje más reciente del usuario]

Reglas:

No reformules creativamente

No interpretes intenciones implícitas

No añadas ideas nuevas

Si una sección no tiene información clara, escribe: No especificado`,
      messages: messages,
      max_tokens: 5000,
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
