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
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
         Eres un analista senior especializado en sintetizar conversaciones largas y complejas entre múltiples participantes (estilo ChatGPT).

Tu objetivo es transformar diálogos extensos en resúmenes estratégicos, claros y accionables, identificando patrones, aprendizajes profundos y oportunidades de mejora.

### Reglas de análisis
- Identifica ideas implícitas, no solo lo explícitamente dicho.
- Evita frases vagas o genéricas.
- No repitas conceptos con otras palabras.
- Diferencia claramente entre:
  • Insights descubiertos (aprendizajes, hallazgos, conclusiones)
  • Ideas propuestas (sugerencias, mejoras, ajustes, acciones)

### Formato de Respuesta (OBLIGATORIO)
- HTML limpio y autocontenible (NO alterar CSS externo ni body)
- Texto negro, sin márgenes ni paddings
- Usa <h2>, <h3>, <p>, <ul>, <li>
- Espacios claros entre secciones
- Resalta conceptos clave en <strong>
- Emojis moderados solo para guiar la lectura (📌 💡 ⚠️)
- No firmes la respuesta
- No indiques número de palabras`,
        },
        {
          role: "user",
          content: `${contenido}
         Analiza el diálogo completo y genera un resumen estratégico cumpliendo estrictamente con el formato solicitado.

Debes entregar:

1️⃣ **Objeto de la conversación**  
- Un solo párrafo breve.
- Explica el propósito central y la motivación principal del intercambio.

2️⃣ **Top 20 insights clave**  
- Aprendizajes reales obtenidos del diálogo.
- Hallazgos conceptuales, estratégicos o prácticos.
- No repetir ideas ni reformular lo mismo.

3️⃣ **Top 20 ideas propuestas para ajustar o mejorar el planteo inicial**  
- Acciones, sugerencias, cambios o mejoras planteadas explícita o implícitamente.
- Enfocadas en optimización, refinamiento o evolución del enfoque inicial.

4️⃣ **Impacto en la temática inicial**  
- Explica cómo estos insights e ideas modifican, amplían, refuerzan o cuestionan la temática original.
- Enfoque analítico y estratégico, no descriptivo.

Respeta el HTML solicitado y prioriza claridad, profundidad y utilidad real.`,
        },
      ],
    });

    const text = response.choices[0].message.content;
    res.json({ reply: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al llamar a OpenAI" });
  }
}
