const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

function buildSpeechSeed(text) {
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash || 1;
}

export async function generateSpeech({
  text,
  voiceId,
  model = "eleven_multilingual_v2",
  outputFormat = "mp3_44100_128",
}) {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing ELEVENLABS_API_KEY in backend environment.");
  }

  const voice = voiceId || process.env.ELEVENLABS_VOICE_ID || "El3gkPAhMU9R5biL3rtU";
  const seed = buildSpeechSeed(`${voice}:${text}`);

  const url = new URL(`${ELEVENLABS_BASE}/text-to-speech/${voice}`);
  url.searchParams.set("output_format", outputFormat);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: model,
      language_code: "es",
      apply_text_normalization: "auto",
      seed,
      voice_settings: {
        stability: 0.78,
        similarity_boost: 0.72,
        speed: 0.7,
        style: 0,
        use_speaker_boost: false,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("ElevenLabs error", response.status, error);

    if (response.status === 401) {
      throw new Error("ElevenLabs API key inválida. Revisá ELEVENLABS_API_KEY en Vercel.");
    }

    throw new Error("No pudimos generar el audio guiado. Probá de nuevo.");
  }

  return response.arrayBuffer();
}
