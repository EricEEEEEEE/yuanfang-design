import { verifyTokenPayload } from "@/services/auth.service";
import { getUserById } from "@/services/user.service";
import type { User } from "@/models/user";

export async function getCurrentUserFromToken(token: string): Promise<User> {
  const payload = await verifyTokenPayload(token);
  const user = await getUserById(payload.userId);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (!user.isActive) {
    throw new Error("USER_INACTIVE");
  }

  return user;
}
