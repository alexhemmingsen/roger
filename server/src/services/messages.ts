import { supabaseAdmin } from "../supabase.ts";
import type { Message, MessageWithSender } from "../types/messages.ts";

/** Saves a transmission when the speaker lets go. The transcript is added later by setTranscript. */
export async function createMessage(input: {
  conversationId: string;
  senderId: string;
  durationMs: number;
}): Promise<Message> {
  const { data } = await supabaseAdmin
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      sender_id: input.senderId,
      duration_ms: Math.round(input.durationMs),
    })
    .select()
    .single()
    .throwOnError();
  return data;
}

export async function setTranscript(
  messageId: string,
  transcript: string,
): Promise<void> {
  await supabaseAdmin
    .from("messages")
    .update({ transcript })
    .eq("id", messageId)
    .throwOnError();
}

/**
 * The latest messages in a conversation, returned oldest first.
 * Pass `before` (a created_at value) to page further back.
 */
export async function listMessages(
  conversationId: string,
  options: { limit?: number; before?: string } = {},
): Promise<MessageWithSender[]> {
  let query = supabaseAdmin
    .from("messages")
    .select("*, sender:users(id, display_name)")
    .eq("conversation_id", conversationId);
  if (options.before) query = query.lt("created_at", options.before);

  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 50)
    .throwOnError();
  return data.reverse();
}

/** The latest messages across several conversations, returned oldest first. */
export async function listRecentMessages(
  conversationIds: string[],
  limit: number,
): Promise<MessageWithSender[]> {
  if (conversationIds.length === 0) return [];
  const { data } = await supabaseAdmin
    .from("messages")
    .select("*, sender:users(id, display_name)")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false })
    .limit(limit)
    .throwOnError();
  return data.reverse();
}
