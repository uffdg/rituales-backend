// Construye el plan de sesión guiada a partir del ritual y los inputs del usuario.
// Mantiene la voz premium en un bloque corto y limpio para bajar costo.

function normalizeText(text = "") {
  return text.trim().replace(/\s+/g, " ");
}

function sanitizeForSpeech(text = "") {
  return normalizeText(text)
    .replace(/[“”«»"]/g, "")
    .replace(/[(){}\[\]]/g, "")
    .replace(/\s*[:;]\s*/g, ". ")
    .replace(/\s*[—–-]\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildPersonalizedScript(input, ritual) {
  return [
    input.intention
      ? `Tu intención para este momento es ${sanitizeForSpeech(input.intention)}. [P2]`
      : "",
    ritual.opening ? `${sanitizeForSpeech(ritual.opening)} [P3]` : "",
    ritual.symbolicAction
      ? `Ahora, muy despacio, ${sanitizeForSpeech(ritual.symbolicAction)} [P3]`
      : "",
    ritual.closing ? `Y para cerrar, ${sanitizeForSpeech(ritual.closing)} [P2]` : "",
    input.anchor ? `Quedate con este anclaje: ${sanitizeForSpeech(input.anchor)}. [P2]` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function splitIntoMeditationLines(text = "") {
  if (!text.trim()) return "";
  if (/\[(?:P1|P2|P3|RESPIRA|PAUSA_CORTA|PAUSA_MEDIA|PAUSA_LARGA)\]/.test(text)) {
    return text;
  }

  return text
    .split(/\n{2,}/)
    .map((paragraph) => {
      const sentences = paragraph
        .trim()
        .split(/(?<=[.!?])\s+/)
        .flatMap((sentence) => {
          const clean = sentence.trim();
          if (clean.length <= 85) return [clean];

          return clean
            .split(/,\s+/)
            .map((part, index, parts) => index < parts.length - 1 ? `${part.trim()},` : part.trim())
            .filter(Boolean);
        });

      return sentences.join("\n[P2]\n");
    })
    .filter(Boolean)
    .join("\n[P3]\n");
}

function buildOpeningScript() {
  return [
    "Antes de empezar.",
    "[P3]",
    "Acomodá el cuerpo.",
    "[P2]",
    "Cerrá los ojos.",
    "[P2]",
    "Inhalá.",
    "[P3]",
    "Exhalá.",
    "[P3]",
    "No hace falta resolver todo ahora.",
    "[P2]",
    "Solo entrá en este momento.",
  ].join("\n");
}

export function buildMeditationSpeechScript(session) {
  const personalized =
    session?.personalizedScript ||
    session?.segments?.find((segment) => segment.kind === "personalized")?.text ||
    "";
  const closing =
    session?.segments?.find((segment) => segment.kind === "closing")?.text ||
    "Volvé despacio. Quedate con una sola palabra. Llevá esta intención con vos.";

  return [
    buildOpeningScript(),
    splitIntoMeditationLines(personalized),
    splitIntoMeditationLines(sanitizeForSpeech(closing)),
  ]
    .filter(Boolean)
    .join("\n[P3]\n");
}

export function buildGuidedSession(input, ritual) {
  const target = input.duration * 60;
  const intro = input.duration >= 20 ? 55 : input.duration >= 10 ? 45 : 35;
  const closing = input.duration >= 20 ? 40 : 30;
  const personalized = input.duration >= 20 ? 75 : input.duration >= 10 ? 55 : 40;
  const ambient = Math.max(target - intro - closing - personalized, 60);

  const soundscape =
    input.energy === "calma" ? "soft-water" :
    input.energy === "poder" ? "earth-hum" : "deep-night";

  const personalizedScript = buildPersonalizedScript(input, ritual);
  const baseSession = {
    targetDurationMinutes: input.duration,
    soundscape,
    locale: "castellano",
    dialect: "rioplatense argentino de Buenos Aires",
    personalizedScript,
    notes:
      "La intro y el cierre son reutilizables. La voz premium se reserva para un bloque corto y claro en castellano rioplatense de Buenos Aires.",
    segments: [
      {
        id: "intro-universal",
        kind: "intro",
        label: "Inicio universal",
        durationSeconds: intro,
        isReusable: true,
        text: "Cerrá los ojos. Respirá profundo. No hace falta resolver todo ahora. Solo entrá en este momento.",
      },
      {
        id: "middle-personalized",
        kind: "personalized",
        label: "Centro personalizado",
        durationSeconds: personalized,
        text: personalizedScript,
        isReusable: false,
      },
      {
        id: `ambient-${input.duration}`,
        kind: "ambient",
        label: "Capa binaural",
        durationSeconds: ambient,
        isReusable: true,
      },
      {
        id: "closing-universal",
        kind: "closing",
        label: "Cierre universal",
        durationSeconds: closing,
        isReusable: true,
        text: "Volvé despacio. Quedate con una sola palabra. Llevá esta intención con vos.",
      },
    ],
  };

  return {
    ...baseSession,
    speechScript: buildMeditationSpeechScript(baseSession),
  };
}
