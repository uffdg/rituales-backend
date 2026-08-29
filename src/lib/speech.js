export function applyPauseMarkers(script) {
  const withExplicitBreaks = (script || "")
    .replace(/\[P1\]|\[PAUSA_CORTA\]/g, '<break time="0.8s" />')
    .replace(/\[P2\]|\[PAUSA_MEDIA\]/g, '<break time="1.6s" />')
    .replace(/\[P3\]|\[PAUSA_LARGA\]/g, '<break time="2.8s" />')
    .replace(
      /\[RESPIRA\]/g,
      'Inhalá. <break time="1.4s" /> Exhalá. <break time="2.6s" />',
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
