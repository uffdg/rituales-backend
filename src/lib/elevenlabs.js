import { parseMeditationScript } from "./speech.js";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const PCM_SAMPLE_RATE = 24000;
const PCM_BYTES_PER_SAMPLE = 2;

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

function createSilencePcm(durationMs) {
  const samples = Math.round((PCM_SAMPLE_RATE * durationMs) / 1000);
  return Buffer.alloc(samples * PCM_BYTES_PER_SAMPLE);
}

function buildWavFromPcm(chunks) {
  const data = Buffer.concat(chunks);
  const header = Buffer.alloc(44);
  const byteRate = PCM_SAMPLE_RATE * PCM_BYTES_PER_SAMPLE;
  const blockAlign = PCM_BYTES_PER_SAMPLE;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(PCM_SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
}

export async function generateMeditationSpeech({
  script,
  voiceId,
  model = "eleven_multilingual_v2",
}) {
  const parts = parseMeditationScript(script);
  const chunks = [];

  for (const part of parts) {
    if (part.type === "silence") {
      chunks.push(createSilencePcm(part.durationMs));
      continue;
    }

    const audio = await generateSpeech({
      text: part.text,
      voiceId,
      model,
      outputFormat: "pcm_24000",
    });
    chunks.push(Buffer.from(audio));
  }

  return {
    audioBuffer: buildWavFromPcm(chunks),
    contentType: "audio/wav",
    extension: "wav",
    parts,
  };
}
