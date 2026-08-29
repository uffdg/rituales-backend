export function applyPauseMarkers(script) {
  const withExplicitBreaks = (script || "")
    .replace(/\[P1\]|\[PAUSA_CORTA\]/g, '<break time="1.2s" />')
    .replace(/\[P2\]|\[PAUSA_MEDIA\]/g, '<break time="2.2s" />')
    .replace(/\[P3\]|\[PAUSA_LARGA\]/g, '<break time="3.0s" />')
    .replace(
      /\[RESPIRA\]/g,
      'Inhalá. <break time="2.0s" /> Exhalá. <break time="3.0s" />',
    )
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
