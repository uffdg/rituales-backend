const PAUSE_DURATIONS_MS = {
  P1: 1800,
  P2: 3500,
  P3: 5500,
  RESPIRA: 6000,
};

export function applyPauseMarkers(script) {
  const withExplicitBreaks = (script || "")
    .replace(/\[P1\]|\[PAUSA_CORTA\]/g, '<break time="1.2s" />')
    .replace(/\[P2\]|\[PAUSA_MEDIA\]/g, '<break time="2.2s" />')
    .replace(/\[P3\]|\[PAUSA_LARGA\]/g, '<break time="3.0s" />')
    .replace(
      /\[RESPIRA\]/g,
      'Inhalá. <break time="2.0s" /> Exhalá. <break time="3.0s" />',
    )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (withExplicitBreaks.includes("<break")) {
    return withExplicitBreaks;
  }

  return withExplicitBreaks
    .replace(/([.!?])\s+/g, '$1 <break time="1.2s" /> ')
    .replace(/\n\n+/g, ' <break time="2.4s" /> ')
    .trim();
}

export function parseMeditationScript(script) {
  const parts = [];
  const markerPattern = /\[(P1|P2|P3|RESPIRA|PAUSA_CORTA|PAUSA_MEDIA|PAUSA_LARGA)\]/g;
  const normalizedMarker = {
    PAUSA_CORTA: "P1",
    PAUSA_MEDIA: "P2",
    PAUSA_LARGA: "P3",
  };

  for (const line of (script || "").split(/\n+/)) {
    let cursor = 0;
    let match;

    while ((match = markerPattern.exec(line)) !== null) {
      const text = line.slice(cursor, match.index).trim();
      if (text) {
        parts.push({ type: "speech", text });
      }

      const marker = normalizedMarker[match[1]] || match[1];
      parts.push({
        type: "silence",
        durationMs: PAUSE_DURATIONS_MS[marker] || PAUSE_DURATIONS_MS.P2,
      });
      cursor = markerPattern.lastIndex;
    }

    const rest = line.slice(cursor).trim();
    if (rest) {
      parts.push({ type: "speech", text: rest });
    }
  }

  return parts.filter((part, index, all) => {
    if (part.type !== "silence") return true;
    const previous = all[index - 1];
    const next = all[index + 1];
    return previous?.type === "speech" || next?.type === "speech";
  });
}
