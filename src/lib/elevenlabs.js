const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

function buildSpeechSeed(text) {
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash || 1;
}

export async function generateSpeech({ text, voiceId }) {
  const voice = voiceId || process.env.ELEVENLABS_VOICE_ID || "El3gkPAhMU9R5biL3rtU";
  const seed = buildSpeechSeed(`${voice}:${text}`);

  const response = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voice}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      language_code: "es",
      output_format: "mp3_44100_128",
      apply_text_normalization: "auto",
      seed,
      voice_settings: {
        stability: 0.65,
        similarity_boost: 0.75,
        speed: 0.78,
        style: 0.25,
        use_speaker_boost: false,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs error: ${error}`);
  }

  return response.arrayBuffer();
}
