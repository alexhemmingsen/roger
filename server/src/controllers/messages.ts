import { AppError } from "../errors.ts";
import { isMember } from "../services/conversations.ts";
import { listMessages } from "../services/messages.ts";
import type { MessageWithSender } from "../types/messages.ts";

export async function list(
  conversationId: string,
  userId: string,
  options: { before?: string; limit?: number } = {},
): Promise<MessageWithSender[]> {
  if (!(await isMember(conversationId, userId))) {
    throw new AppError(404, "Conversation not found");
  }
  const limit = Math.min(options.limit || 50, 200);
  return listMessages(conversationId, { before: options.before, limit });
}
