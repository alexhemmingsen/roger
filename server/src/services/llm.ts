import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-6.1-sol";

// Without an OpenAI key this returns stub text, so tests and local runs work offline.
export async function complete(input: {
  system: string;
  prompt: string;
}): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return `(stub answer to: ${input.prompt.split("Question: ").at(-1)})`;
  }
  const { text } = await generateText({
    model: openai(MODEL),
    system: input.system,
    prompt: input.prompt,
  });
  return text;
}
