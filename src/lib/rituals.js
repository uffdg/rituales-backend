function buildAiRitualFromRow(row) {
  if (row.ai_ritual) {
    return row.ai_ritual;
  }

  return {
    title: row.ritual_title || row.title || "Ritual",
    opening: row.ritual_opening || "",
    symbolicAction: row.ritual_symbolic_action || "",
    closing: row.ritual_closing || "",
  };
}

export function mapRitualRow(row, options = {}) {
  const {
    likesCount = 0,
    likedByViewer = false,
    favoritedByViewer = false,
    author = null,
  } = options;

  return {
    ritualId: row.id,
    ritual: buildAiRitualFromRow(row),
    guidedSession: row.guided_session,
    guidedAudio: row.audio_url
      ? {
          status: "ready",
          audioUrl: row.audio_url,
          provider: "elevenlabs",
        }
      : { status: "idle" },
    intention: row.intention,
    energy: row.energy,
    element: row.element,
    intensity: row.intensity,
    duration: row.duration,
    anchor: row.anchor,
    author,
    likesCount,
    likedByViewer,
    favoritedByViewer,
    createdAt: row.created_at,
    userId: row.user_id || null,
  };
}
