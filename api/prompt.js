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
[tipo de agencia/empresa, audiencia target, tono deseado — solo si aparece en la conversación]

CAPACIDADES CONFIRMADAS:
[todo lo que el usuario ha dicho que puede hacer: fabricar físico, presupuesto, equipo, herramientas, canales disponibles, etc. Solo lo explícitamente mencionado]

IDEAS VALIDADAS:
- [idea concreta + motivo explícito por el que el usuario la validó]

IDEAS DESCARTADAS:
- [idea concreta + motivo explícito por el que el usuario la descartó. Usa "Descartada porque:" nunca "Validada como:"]

DIRECCIÓN ACTUAL:
[hacia dónde apunta el usuario según los últimos mensajes. Sé literal, no reformules ni estructures más de lo que el usuario dijo]

RESTRICCIONES:
- [todo lo que el usuario ha dicho explícitamente que NO quiere]

TONO DE RESPUESTAS QUE FUNCIONARON:
[describe brevemente el estilo de las respuestas que el usuario aprobó: nivel de detalle, formato, si eran directas o exploratorias, si incluían mecánicas concretas, etc.]

NIVEL DE DETALLE ESPERADO:
[indica si el usuario está pidiendo ideas nuevas, profundización sobre una idea existente, variantes, o exploración abierta. Esto determina qué debe hacer el siguiente agente]

INSTRUCCIÓN PRINCIPAL:
[copia fiel del mensaje más reciente del usuario. Esta instrucción tiene prioridad sobre todo lo demás en el brief]

Reglas:

- No reformules creativamente
- No interpretes intenciones implícitas
- No añadas ideas nuevas
- Cuando cites al usuario, sé lo más literal posible
- Distingue entre lo que dijo el usuario y lo que dijeron los agentes creativos
- Si una sección no tiene información clara, escribe: No especificado`,
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
