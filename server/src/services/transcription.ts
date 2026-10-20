// Stub until a speech-to-text provider is picked. Audio is 16 kHz mono 16-bit PCM.
export async function transcribeAudio(audio: Buffer): Promise<string> {
  const seconds = audio.length / 32_000;
  return `(stub transcript of ${seconds.toFixed(1)}s of audio)`;
}
