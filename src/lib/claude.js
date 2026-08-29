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
    system: `Transformás lo que dice una persona en una intención breve, concreta y encarnada, en español rioplatense.
Primero reflejá algo específico de lo que la persona trajo; después abrí una mirada más clara para este momento.
Usá segunda persona con vos. Frases cortas. Tono directo, contemplativo y sin género gramatical.
Usá palabras como intención, claridad, presencia, soltar, sostener, mirar, notar, cuerpo.
Evitá lenguaje new age o genérico: manifestar, vibrar, universo, energía cósmica, sanar, abundancia, merecer, aparece, fluye, llega, se abre.
No des una receta ni una lista de acciones. No expliques.
Ejemplo: "día muy agotado" → "El cansancio ya está hablando; hoy tu intención puede ser escucharlo sin exigirte más."
Máximo dos frases cortas. Sin comillas.`,
    messages: [{ role: "user", content: rawText }],
  });

  return message.content[0].text.trim();
}
