import {
  createTokenForUser,
  verifyInviteCode,
} from "@/services/auth.service";
import { getUserByPhone } from "@/services/user.service";
import type { User } from "@/models/user";

export type AuthSession = {
  token: string;
  user: User;
};

type LoginErrorCode =
  | "INVALID_INVITE_CODE"
  | "USER_NOT_FOUND"
  | "USER_INACTIVE";

function fail(code: LoginErrorCode): never {
  throw new Error(code);
}

export async function loginWithInviteCode(
  phone: string,
  inviteCode: string,
): Promise<AuthSession> {
  const isInviteCodeValid = await verifyInviteCode(inviteCode);

  if (!isInviteCodeValid) {
    fail("INVALID_INVITE_CODE");
  }

  const user = await getUserByPhone(phone);

  if (!user) {
    fail("USER_NOT_FOUND");
  }

  if (!user.isActive) {
    fail("USER_INACTIVE");
  }

  return {
    token: await createTokenForUser(user),
    user,
  };
}
