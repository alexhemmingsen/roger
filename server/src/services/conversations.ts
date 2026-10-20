import { supabaseAdmin } from "../supabase.ts";
import type {
  Conversation,
  ConversationWithMembers,
} from "../types/conversations.ts";
import type { User } from "../types/users.ts";

// Members are fetched through conversation_members. A plain users(*) embed would be ambiguous,
// because conversations also links to users through created_by.
const WITH_MEMBERS = "*, conversation_members(user:users(*))";

type ConversationRow = Conversation & {
  conversation_members: { user: User | null }[];
};

function withMembers({
  conversation_members,
  ...conversation
}: ConversationRow): ConversationWithMembers {
  return {
    ...conversation,
    members: conversation_members.flatMap((m) => (m.user ? [m.user] : [])),
  };
}

/** Creates a conversation with its members. The creator is always added as a member. */
export async function createConversation(input: {
  createdBy: string;
  memberIds: string[];
  name?: string;
}): Promise<ConversationWithMembers> {
  const { data: conversation } = await supabaseAdmin
    .from("conversations")
    .insert({ created_by: input.createdBy, name: input.name ?? null })
    .select()
    .single()
    .throwOnError();

  const memberIds = [...new Set([input.createdBy, ...input.memberIds])];
  const { error } = await supabaseAdmin.from("conversation_members").insert(
    memberIds.map((user_id) => ({
      conversation_id: conversation.id,
      user_id,
    })),
  );

  if (error) {
    // Two separate requests, so undo the first one by hand. Deleting the conversation also removes any members.
    await supabaseAdmin
      .from("conversations")
      .delete()
      .eq("id", conversation.id);
    throw error;
  }

  const created = await getConversation(conversation.id);
  if (!created)
    throw new Error(
      `Conversation ${conversation.id} disappeared right after it was created`,
    );
  return created;
}

export async function getConversation(
  id: string,
): Promise<ConversationWithMembers | null> {
  const { data } = await supabaseAdmin
    .from("conversations")
    .select(WITH_MEMBERS)
    .eq("id", id)
    .maybeSingle()
    .throwOnError();
  return data ? withMembers(data) : null;
}

/** All conversations the user is a member of, newest first. */
export async function listConversationsForUser(
  userId: string,
): Promise<ConversationWithMembers[]> {
  const { data: memberships } = await supabaseAdmin
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId)
    .throwOnError();
  if (memberships.length === 0) return [];

  const { data } = await supabaseAdmin
    .from("conversations")
    .select(WITH_MEMBERS)
    .in(
      "id",
      memberships.map((m) => m.conversation_id),
    )
    .order("created_at", { ascending: false })
    .throwOnError();
  return data.map(withMembers);
}

/** Used to check that a user may talk in, or ask about, a conversation. */
export async function isMember(
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle()
    .throwOnError();
  return data !== null;
}
