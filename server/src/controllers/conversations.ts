import { randomUUID } from "node:crypto";
import { AppError } from "../errors.ts";
import {
  createConversation,
  getConversation,
  listConversationsForUser,
} from "../services/conversations.ts";
import { getUser } from "../services/users.ts";
import type { ConversationWithMembers } from "../types/conversations.ts";
import * as presence from "./presence.ts";

type Invite = { id: string; fromUserId: string; toUserId: string };

const invites = new Map<string, Invite>();

export async function invite(
  fromUserId: string,
  toUserId: string,
): Promise<Invite> {
  if (fromUserId === toUserId) {
    throw new AppError(400, "You can't invite yourself");
  }
  if (!presence.sameNetwork(fromUserId, toUserId)) {
    throw new AppError(409, "That user isn't online on your network");
  }
  const from = await getUser(fromUserId);
  if (!from) throw new AppError(404, "Set a display name first");

  const invite = { id: randomUUID(), fromUserId, toUserId };
  invites.set(invite.id, invite);
  presence.sendEvent(toUserId, { type: "invite", inviteId: invite.id, from });
  return invite;
}

export async function accept(
  inviteId: string,
  userId: string,
): Promise<ConversationWithMembers> {
  const invite = takeInvite(inviteId, userId);
  const conversation = await createConversation({
    createdBy: invite.fromUserId,
    memberIds: [invite.toUserId],
  });
  presence.sendEvent(invite.fromUserId, {
    type: "invite_accepted",
    inviteId,
    conversation,
  });
  return conversation;
}

export function decline(inviteId: string, userId: string): void {
  const invite = takeInvite(inviteId, userId);
  presence.sendEvent(invite.fromUserId, { type: "invite_declined", inviteId });
}

function takeInvite(inviteId: string, userId: string): Invite {
  const invite = invites.get(inviteId);
  if (!invite || invite.toUserId !== userId) {
    throw new AppError(404, "Invite not found");
  }
  invites.delete(inviteId);
  return invite;
}

export function list(userId: string): Promise<ConversationWithMembers[]> {
  return listConversationsForUser(userId);
}

export async function get(
  conversationId: string,
  userId: string,
): Promise<ConversationWithMembers> {
  const conversation = await getConversation(conversationId);
  if (!conversation?.members.some((m) => m.id === userId)) {
    throw new AppError(404, "Conversation not found");
  }
  return conversation;
}
