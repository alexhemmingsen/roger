import { listConversationsForUser } from "../services/conversations.ts";
import { complete } from "../services/llm.ts";
import { listRecentMessages } from "../services/messages.ts";

const SYSTEM_PROMPT =
  "You answer questions about the user's walkie-talkie conversations, using only the transcripts. " +
  "Each line shows the time, the conversation and the speaker. " +
  "Say who said it, when and in which conversation. If the transcripts don't contain the answer, say so.";

export async function ask(
  userId: string,
  question: string,
): Promise<{ answer: string }> {
  const conversations = await listConversationsForUser(userId);
  const messages = await listRecentMessages(
    conversations.map((c) => c.id),
    200,
  );

  // Conversations without a name are labelled by their members.
  const labels = new Map(
    conversations.map((c) => [
      c.id,
      c.name ?? c.members.map((m) => m.display_name).join(", "),
    ]),
  );
  const me = conversations
    .flatMap((c) => c.members)
    .find((m) => m.id === userId);

  const transcript = messages
    .filter((m) => m.transcript)
    .map(
      (m) =>
        `[${m.created_at}] [${labels.get(m.conversation_id)}] ${m.sender?.display_name ?? "Unknown"}: ${m.transcript}`,
    )
    .join("\n");

  const answer = await complete({
    system: SYSTEM_PROMPT,
    prompt:
      `The person asking is ${me?.display_name ?? "unknown"}.\n\n` +
      `Transcripts:\n${transcript || "(no messages yet)"}\n\n` +
      `Question: ${question}`,
  });
  return { answer };
}
