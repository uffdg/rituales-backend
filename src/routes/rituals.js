import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { generateSpeech } from "../lib/elevenlabs.js";
import { buildGuidedSession } from "../lib/session.js";

export const ritualsRouter = Router();

// POST /api/rituals/create
// El frontend envía el ritual ya generado (por templates o IA client-side).
// El backend solo persiste y devuelve el plan de sesión.
ritualsRouter.post("/create", async (req, res, next) => {
  try {
    const input = req.body;

    const ritual = input.aiRitual?.title
      ? input.aiRitual
      : { title: "", opening: "", symbolicAction: "", closing: "" };

    const guidedSession = input.guidedSession || buildGuidedSession(input, ritual);

    const { data, error } = await supabase
      .from("rituals")
      .insert({
        ritual_type: input.ritualType,
        intention: input.intention,
        energy: input.energy,
        element: input.element,
        duration: input.duration,
        intensity: input.intensity,
        anchor: input.anchor || null,
        ritual_title: ritual.title,
        ritual_opening: ritual.opening,
        ritual_symbolic_action: ritual.symbolicAction,
        ritual_closing: ritual.closing,
        guided_session: guidedSession,
      })
      .select("id")
      .single();

    if (error) throw error;

    res.json({
      ritualId: data.id,
      ritual,
      guidedSession,
      guidedAudio: { status: "idle" },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/rituals/:id/render-audio
ritualsRouter.post("/:id/render-audio", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { voice, guidedSession } = req.body;

    // Devolver audio cacheado si ya existe
    const { data: existing } = await supabase
      .from("rituals")
      .select("audio_url")
      .eq("id", id)
      .single();

    if (existing?.audio_url) {
      return res.json({
        audioUrl: existing.audio_url,
        status: "ready",
        provider: "elevenlabs",
        cached: true,
      });
    }

    const script =
      guidedSession?.personalizedScript ||
      guidedSession?.segments?.find((s) => s.kind === "personalized")?.text || "";

    if (!script) {
      return res.status(400).json({ error: "No hay script para generar audio." });
    }

    const audioBuffer = await generateSpeech({ text: script, voiceId: voice });

    const filename = `rituals/${id}/audio.mp3`;
    const { error: uploadError } = await supabase.storage
      .from("audio")
      .upload(filename, audioBuffer, { contentType: "audio/mpeg", upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("audio").getPublicUrl(filename);
    const audioUrl = urlData.publicUrl;

    await supabase.from("rituals").update({ audio_url: audioUrl }).eq("id", id);

    res.json({ audioUrl, status: "ready", provider: "elevenlabs", cached: false });
  } catch (err) {
    next(err);
  }
});

// GET /api/rituals/:id
ritualsRouter.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("rituals")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Ritual no encontrado." });
    }

    res.json({
      ritualId: data.id,
      ritual: {
        title: data.ritual_title,
        opening: data.ritual_opening,
        symbolicAction: data.ritual_symbolic_action,
        closing: data.ritual_closing,
      },
      guidedSession: data.guided_session,
      guidedAudio: data.audio_url
        ? { status: "ready", audioUrl: data.audio_url, provider: "elevenlabs" }
        : { status: "idle" },
      intention: data.intention,
      energy: data.energy,
      element: data.element,
      intensity: data.intensity,
      duration: data.duration,
      anchor: data.anchor,
    });
  } catch (err) {
    next(err);
  }
});
