import { setTranscript } from "../services/messages.ts";
import { transcribeAudio } from "../services/transcription.ts";

type Job = { messageId: string; audio: Buffer };

let queue: Promise<void> = Promise.resolve();

// In-process queue that runs one job at a time. Resolves when the job is done, even if it failed.
export function enqueue(job: Job): Promise<void> {
  queue = queue
    .then(() => transcribe(job))
    .catch((error) => {
      console.error(`Transcription failed for message ${job.messageId}`, error);
    });
  return queue;
}

async function transcribe({ messageId, audio }: Job): Promise<void> {
  const transcript = await transcribeAudio(audio);
  await setTranscript(messageId, transcript);
}
