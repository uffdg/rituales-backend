const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

export async function generateSpeech({ text, voiceId }) {
  const voice = voiceId || process.env.ELEVENLABS_VOICE_ID || "El3gkPAhMU9R5biL3rtU";

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
        stability: 0.55,
        similarity_boost: 0.75,
        speed: 0.76,
        style: 0.45,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs error: ${error}`);
  }

  return response.arrayBuffer();
}
