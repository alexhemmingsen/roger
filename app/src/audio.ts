import {
  AudioContext,
  AudioManager,
  AudioRecorder,
  type AudioBuffer,
} from "react-native-audio-api";

// Audio travels as 16 kHz mono 16-bit PCM in 100 ms chunks, which is what the server expects.
const SAMPLE_RATE = 16_000;
const CHUNK_FRAMES = SAMPLE_RATE / 10;
// Playback starts slightly behind the speaker, so small network delays don't cause gaps.
const PLAYBACK_DELAY = 0.25;

AudioManager.setAudioSessionOptions({
  iosCategory: "playAndRecord",
  iosMode: "default",
  iosOptions: ["defaultToSpeaker", "allowBluetoothHFP"],
});

let sessionActive = false;
async function activateSession() {
  if (sessionActive) return;
  await AudioManager.setAudioSessionActivity(true);
  sessionActive = true;
}

export async function requestMicrophone(): Promise<boolean> {
  return (await AudioManager.requestRecordingPermissions()) === "Granted";
}

// Recording

const recorder = new AudioRecorder();

export async function startRecording(onChunk: (pcm: ArrayBuffer) => void): Promise<boolean> {
  await activateSession();
  recorder.onAudioReady(
    { sampleRate: SAMPLE_RATE, bufferLength: CHUNK_FRAMES, channelCount: 1 },
    ({ buffer }) => onChunk(toPcm16(buffer)),
  );
  const result = await recorder.start();
  return result.status !== "error";
}

export async function stopRecording() {
  await recorder.stop().catch(() => {});
  recorder.clearOnAudioReady();
}

function toPcm16(buffer: AudioBuffer): ArrayBuffer {
  const samples = resample(buffer.getChannelData(0), buffer.sampleRate);
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    pcm[i] = Math.max(-1, Math.min(1, samples[i])) * 0x7fff;
  }
  return pcm.buffer;
}

// The device may record at its own rate (often 48 kHz). Keep every n-th sample to get 16 kHz.
function resample(input: Float32Array, rate: number): Float32Array {
  if (rate === SAMPLE_RATE) return input;
  const step = rate / SAMPLE_RATE;
  const output = new Float32Array(Math.floor(input.length / step));
  for (let i = 0; i < output.length; i++) output[i] = input[Math.floor(i * step)];
  return output;
}

// Playback

let context: AudioContext | null = null;
let nextStart = 0;

// Each chunk is scheduled to start right as the previous one ends.
export function playChunk(pcm: ArrayBuffer) {
  activateSession().catch(() => {});
  context ??= new AudioContext({ sampleRate: SAMPLE_RATE });

  const samples = new Int16Array(pcm);
  const floats = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) floats[i] = samples[i] / 0x8000;
  const buffer = context.createBuffer(1, floats.length, SAMPLE_RATE);
  buffer.copyToChannel(floats, 0);

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  nextStart = Math.max(nextStart, context.currentTime + PLAYBACK_DELAY);
  source.start(nextStart);
  nextStart += buffer.duration;
}
