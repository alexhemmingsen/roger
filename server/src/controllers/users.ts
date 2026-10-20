import { AppError } from "../errors.ts";
import { getUser, upsertUser } from "../services/users.ts";
import type { User } from "../types/users.ts";

export async function getMe(userId: string): Promise<User> {
  const user = await getUser(userId);
  if (!user) throw new AppError(404, "Set a display name first");
  return user;
}

export function updateMe(userId: string, displayName: string): Promise<User> {
  if (displayName.length > 40) {
    throw new AppError(400, "Display name can be at most 40 characters");
  }
  return upsertUser(userId, displayName);
}
