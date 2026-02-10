import { openai } from "../lib/openaiAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { conversation } = req.body;
  if (!conversation) {
    return res.status(400).json({ error: "Falta conversación" });
  }

  const contenido = conversation.map((m) => m.content).join("\n\n");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
         Eres un analista que resume conversaciones SIN rellenar.

Prioridad:
1) fidelidad al texto
2) concreción
3) utilidad accionable

Prohibido:
- generalidades
- repetir ideas con sinónimos
- inventar puntos para llegar a un número

Obligatorio:
- evidencia interna por punto (quién + paráfrasis breve)
- si no hay evidencia, dilo explícitamente y reduce el número de puntos

Salida: HTML limpio con h2/h3/p/ul/li y <strong>.
Sin firma. Sin contar palabras.`,
        },
        {
          role: "user",
          content: `${contenido}
         Analiza TODO el diálogo (incluyendo matices y desacuerdos). Prohíbete rellenar: si no hay evidencia en el diálogo, no lo afirmes.

REGLAS DURAS:
- Nada de frases vagas (“en el contexto de”, “más allá de”, “se centra en”, “refleja una crisis”, “de alguna manera”).
- No repitas ideas con sinónimos.
- Cada punto debe incluir evidencia interna: (Evidencia: quién + paráfrasis de 1 línea).
- Si el diálogo no da para X puntos, entrega menos. Prioriza calidad.

FORMATO HTML (limpio, sin estilos externos):
<h2>..., <h3>..., <p>..., <ul><li>...

ENTREGA:

<h2>1) Tesis del diálogo</h2>
<p>1–2 frases máximas.</p>

<h2>2) Mapa de posiciones</h2>
<ul>
<li><strong>Postura A</strong>: ... (Quién) (Evidencia: ...)</li>
<li><strong>Postura B</strong>: ...</li>
</ul>

<h2>3) Tensiones y puntos ciegos</h2>
<ul>
<li>... (Por qué es una tensión) (Evidencia: ...)</li>
</ul>

<h2>4) Propuestas accionables</h2>
<p>Solo propuestas que aparezcan o se deduzcan directamente. Para cada una:</p>
<ul>
<li><strong>Propuesta</strong>: ...<br/>
<strong>Qué cambia</strong>: ...<br/>
<strong>Riesgo</strong>: ...<br/>
<strong>Condición de éxito</strong>: ...<br/>
(Evidencia: ...)</li>
</ul>

<h2>5) Lo que NO se dijo y habría que decidir</h2>
<ul>
<li>Decisión pendiente: ...</li>
</ul>`,
        },
      ],
      max_tokens: 1500
    });

    const text = response.choices[0].message.content;
    res.json({ reply: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al llamar a OpenAI" });
  }
}
