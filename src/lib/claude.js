import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RITUAL_SYSTEM_PROMPT = `Sos una guía espiritual que crea rituales personalizados en español rioplatense.
Dado el contexto del usuario, generá un ritual con tono suave, íntimo y meditativo.
Respondé SOLO con JSON válido, sin texto extra, con esta estructura exacta:
{
  "title": "Nombre del ritual (máx 8 palabras)",
  "opening": "Apertura: cómo prepararse y entrar en presencia (máx 80 palabras)",
  "symbolicAction": "Acción simbólica concreta con un elemento natural (máx 80 palabras)",
  "closing": "Cierre e intención para llevar (máx 60 palabras)"
}`;

export async function generateRitualWithClaude(input) {
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 500,
    system: RITUAL_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Tipo de ritual: ${input.ritualType}
Intención: ${input.intention}
Energía deseada: ${input.energy}
Elemento: ${input.element}
Duración: ${input.duration} minutos
Intensidad: ${input.intensity || "suave"}`,
      },
    ],
  });

  const raw = message.content[0].text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(raw);
}

export async function reframeIntention(rawText) {
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 80,
    system: `Transformás lo que dice una persona en una afirmación de manifestación, en español rioplatense.
La afirmación describe el deseo como algo que ya está en movimiento, que fluye naturalmente, que llega en el momento justo.
No uses "Quiero", "Elijo" ni "Me abro a" — eso es deseo, no manifestación.
Usá lenguaje presente: "aparece", "fluye", "llega", "se abre", "se construye", "encuentra su lugar".
Ejemplo: "quiero conseguir trabajo" → "El espacio para desarrollar mis habilidades y lograr mis objetivos aparece cuando menos lo espero y fluye naturalmente."
UNA SOLA frase. Sin comillas. Sin explicaciones.`,
    messages: [{ role: "user", content: rawText }],
  });

  return message.content[0].text.trim();
}

export function applyPauseMarkers(script) {
  return script
    .replace(/\[P1\]/g, "... ")
    .replace(/\[P2\]/g, "... ... ")
    .replace(/\[P3\]/g, "... ... ... ")
    .replace(/\[RESPIRA\]/g, "... inhala ... exhala ... ... ");
}
