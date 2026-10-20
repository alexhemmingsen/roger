// Stub until an LLM provider is picked.
export async function complete(input: {
  system: string;
  prompt: string;
}): Promise<string> {
  const question = input.prompt.split("Question: ").at(-1);
  return `(stub answer to: ${question})`;
}
