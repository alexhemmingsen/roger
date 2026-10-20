import { beforeEach, describe, expect, it, vi } from "vitest";
import { setTranscript } from "../services/messages.ts";
import { transcribeAudio } from "../services/transcription.ts";
import { enqueue } from "./transcription.ts";

vi.mock("../supabase.ts", () => ({ supabaseAdmin: {} }));
vi.mock("../services/messages.ts");
vi.mock("../services/transcription.ts");

beforeEach(() => vi.resetAllMocks());

describe("enqueue", () => {
  it("transcribes the audio and saves the transcript on the message", async () => {
    const audio = Buffer.from([1, 2, 3]);
    vi.mocked(transcribeAudio).mockResolvedValue("Room 12 needs fresh sheets");

    await enqueue({ messageId: "msg-1", audio });

    expect(transcribeAudio).toHaveBeenCalledWith(audio);
    expect(setTranscript).toHaveBeenCalledWith(
      "msg-1",
      "Room 12 needs fresh sheets",
    );
  });

  it("runs one job at a time, in order", async () => {
    let finishFirst!: (text: string) => void;
    vi.mocked(transcribeAudio)
      .mockReturnValueOnce(new Promise((resolve) => (finishFirst = resolve)))
      .mockResolvedValueOnce("second");

    const first = enqueue({ messageId: "msg-1", audio: Buffer.alloc(0) });
    const second = enqueue({ messageId: "msg-2", audio: Buffer.alloc(0) });
    await Promise.resolve();
    expect(transcribeAudio).toHaveBeenCalledTimes(1);

    finishFirst("first");
    await Promise.all([first, second]);

    expect(vi.mocked(setTranscript).mock.calls).toEqual([
      ["msg-1", "first"],
      ["msg-2", "second"],
    ]);
  });

  it("keeps going after a job fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(transcribeAudio)
      .mockRejectedValueOnce(new Error("provider down"))
      .mockResolvedValueOnce("second");

    await enqueue({ messageId: "msg-1", audio: Buffer.alloc(0) });
    await enqueue({ messageId: "msg-2", audio: Buffer.alloc(0) });

    expect(setTranscript).toHaveBeenCalledTimes(1);
    expect(setTranscript).toHaveBeenCalledWith("msg-2", "second");
    expect(console.error).toHaveBeenCalled();
  });
});
