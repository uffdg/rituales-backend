// Construye el plan de sesión guiada a partir del ritual y los inputs del usuario.
// Separa los bloques reutilizables (intro/cierre) del personalizado para optimizar TTS.

export function buildGuidedSession(input, ritual) {
  const target = input.duration * 60;
  const intro = input.duration >= 20 ? 55 : input.duration >= 10 ? 45 : 35;
  const closing = input.duration >= 20 ? 40 : 30;
  const personalized = input.duration >= 20 ? 85 : input.duration >= 10 ? 65 : 45;
  const ambient = Math.max(target - intro - closing - personalized, 60);

  const soundscape =
    input.energy === "calma" ? "soft-water" :
    input.energy === "poder" ? "earth-hum" : "deep-night";

  const durationNote =
    input.duration >= 20
      ? "Hoy quédate sin apuro. No hace falta resolverlo todo de una vez."
      : input.duration >= 10
      ? "Quédate en este momento con suavidad y atención."
      : "Toma este momento breve como un punto de regreso.";

  const personalizedScript = [
    `Tu intención para este momento es: ${input.intention.trim()}.`,
    ritual.opening,
    durationNote,
    ritual.symbolicAction,
    ritual.closing,
  ].filter(Boolean).join(" ");

  return {
    targetDurationMinutes: input.duration,
    soundscape,
    personalizedScript,
    notes: "Intro y cierre son bloques reutilizables. Solo el bloque personalizado requiere TTS premium.",
    segments: [
      {
        id: "intro-universal",
        kind: "intro",
        label: "Inicio universal",
        durationSeconds: intro,
        isReusable: true,
        text: "Cierra los ojos. Respira profundo. No hace falta resolver todo ahora. Solo entra en este momento.",
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
        text: "Vuelve despacio. Quédate con una sola palabra. Lleva esta intención contigo.",
      },
    ],
  };
}
