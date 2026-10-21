import { openai } from "@ai-sdk/openai";
import { transcribe } from "ai";

// Audio from the app is 16 kHz mono 16-bit PCM.
const SAMPLE_RATE = 16_000;

// Without an OpenAI key this returns stub text, so tests and local runs work offline.
export async function transcribeAudio(audio: Buffer): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return `(stub transcript of ${(audio.length / (SAMPLE_RATE * 2)).toFixed(1)}s of audio)`;
  }
  const { text } = await transcribe({
    model: openai.transcription("gpt-transcribe"),
    audio: toWav(audio),
  });
  return text.trim();
}

// Raw PCM plus the 44-byte header that makes it a .wav file.
export function toWav(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // format chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // bytes per second
  header.writeUInt16LE(2, 32); // bytes per sample
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
