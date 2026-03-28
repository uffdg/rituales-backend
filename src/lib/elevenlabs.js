const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

export async function generateSpeech({ text, voiceId }) {
  const voice = voiceId || process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";

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
      voice_settings: {
        stability: 0.85,
        similarity_boost: 0.75,
        speed: 0.82,
        style: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs error: ${error}`);
  }

  return response.arrayBuffer();
}
