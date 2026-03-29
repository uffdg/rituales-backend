import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { generateSpeech } from "../lib/elevenlabs.js";
import { buildGuidedSession } from "../lib/session.js";
import { generateRitualWithClaude, generateMeditationScript, applyPauseMarkers, reframeIntention } from "../lib/claude.js";

export const ritualsRouter = Router();

// POST /api/rituals/reframe-intention
ritualsRouter.post("/reframe-intention", async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "No text provided" });
    const reframed = await reframeIntention(text);
    res.json({ reframed });
  } catch (err) {
    next(err);
  }
});

// POST /api/rituals/create
// El frontend envía el ritual ya generado (por templates o IA client-side).
// El backend solo persiste y devuelve el plan de sesión.
ritualsRouter.post("/create", async (req, res, next) => {
  try {
    const input = req.body;

    // Si hay intención real → generar con Gemini
    // Si no → usar template del frontend como fallback
    let ritual = input.aiRitual?.title
      ? input.aiRitual
      : { title: "Ritual", opening: "", symbolicAction: "", closing: "" };

    const hasIntention = input.intention?.trim().length > 5;
    if (hasIntention && process.env.ANTHROPIC_API_KEY) {
      try {
        ritual = await generateRitualWithClaude(input);
      } catch (err) {
        console.error("Claude error, usando template:", err.message);
      }
    }

    let meditationScript = null;
    if (hasIntention && process.env.ANTHROPIC_API_KEY) {
      try {
        const raw = await generateMeditationScript(input, ritual);
        meditationScript = applyPauseMarkers(raw);
      } catch (err) {
        console.error("Meditation script error, usando fallback:", err.message);
      }
    }

    const guidedSession = input.guidedSession || buildGuidedSession(input, ritual, meditationScript);

    const { data, error } = await supabase
      .from("rituals")
      .insert({
        title: ritual.title || "Ritual",
        ritual_type: input.ritualType,
        intention: input.intention,
        intention_category: input.intentionCategory || null,
        energy: input.energy,
        element: input.element,
        duration: input.duration,
        intensity: input.intensity,
        anchor: input.anchor || null,
        user_id: input.userId || null,
        ai_ritual: ritual,
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

    // Devolver audio cacheado si ya existe, y traer guided_session como fallback
    const { data: existing } = await supabase
      .from("rituals")
      .select("audio_url, guided_session")
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

    const session = guidedSession || existing?.guided_session;
    const script =
      session?.personalizedScript ||
      session?.segments?.find((s) => s.kind === "personalized")?.text || "";

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
      ritual: data.ai_ritual || {
        title: data.title,
        opening: "",
        symbolicAction: "",
        closing: "",
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
