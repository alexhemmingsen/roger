import { afterEach, describe, expect, it, vi } from "vitest";
import { toWav, transcribeAudio } from "./transcription.ts";

afterEach(() => vi.unstubAllEnvs());

describe("toWav", () => {
  it("adds a 16 kHz mono 16-bit WAV header in front of the PCM", () => {
    const pcm = Buffer.alloc(3200, 1);
    const wav = toWav(pcm);

    expect(wav.length).toBe(44 + 3200);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.readUInt32LE(4)).toBe(36 + 3200);
    expect(wav.toString("ascii", 8, 16)).toBe("WAVEfmt ");
    expect(wav.readUInt16LE(20)).toBe(1); // PCM
    expect(wav.readUInt16LE(22)).toBe(1); // mono
    expect(wav.readUInt32LE(24)).toBe(16_000);
    expect(wav.readUInt32LE(28)).toBe(32_000);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.toString("ascii", 36, 40)).toBe("data");
    expect(wav.readUInt32LE(40)).toBe(3200);
    expect(wav.subarray(44).equals(pcm)).toBe(true);
  });
});

describe("transcribeAudio", () => {
  it("returns a stub transcript when no OpenAI key is set", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    await expect(transcribeAudio(Buffer.alloc(32_000))).resolves.toBe(
      "(stub transcript of 1.0s of audio)",
    );
  });
});
