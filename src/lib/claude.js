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

// Personaliza el gesto concreto de una carta del Oráculo del día a partir de
// lo que la persona desea hoy. Corre en paralelo con reframeIntention, así que no
// ve la intención final: se apoya en la carta y en el relato.
export async function generateOracleGesture({ card, moonPhase, inputText }) {
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 90,
    system: `Escribís el gesto concreto de una carta de oráculo diaria, en español rioplatense con voseo.
El gesto es una sola acción simple, física o cotidiana, que se pueda hacer hoy en menos de quince minutos.
Tiene que acercar a la persona a lo que desea hoy, leído a través del sentido de la carta.
No tomes literalmente la imagen de la carta (si la carta es La Semilla, no se trata de plantar algo): traducí su sentido a la vida cotidiana.
No repitas lo que contó la persona ni lo nombres literalmente.
Una o dos frases cortas, en imperativo, sin género gramatical. Sin comillas, sin explicaciones, sin listas.
Evitá lenguaje new age o genérico: manifestar, vibrar, universo, energía cósmica, sanar, abundancia, merecer.`,
    messages: [
      {
        role: "user",
        content: `Carta: ${card.name}
Sentido de la carta: ${card.intention}
Gesto de referencia: ${card.gesture}
Fase lunar: ${moonPhase || "sin dato"}
Lo que desea hoy la persona: ${inputText}`,
      },
    ],
  });

  return message.content[0].text.trim().replace(/^["«]|["»]$/g, "");
}
