import { SignJWT, jwtVerify } from "jose";
import { getUserById, getUserByPhone } from "@/services/user.service";
import type { User } from "@/models/user";

export type AuthSession = {
  token: string;
  user: User;
};

type AuthServiceErrorCode =
  | "INVALID_INVITE_CODE"
  | "USER_NOT_FOUND"
  | "USER_INACTIVE"
  | "JWT_SECRET_MISSING"
  | "TOKEN_INVALID"
  | "AUTH_SERVICE_ERROR";

type AuthTokenPayload = {
  userId: string;
  role: User["role"];
  campusId: string;
};

const JWT_EXPIRES_IN = "7d";

function fail(code: AuthServiceErrorCode): never {
  throw new Error(code);
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    fail("JWT_SECRET_MISSING");
  }

  return new TextEncoder().encode(secret);
}

function isAuthError(error: unknown): boolean {
  return (
    error instanceof Error &&
    [
      "INVALID_INVITE_CODE",
      "USER_NOT_FOUND",
      "USER_INACTIVE",
      "JWT_SECRET_MISSING",
      "TOKEN_INVALID",
      "AUTH_SERVICE_ERROR",
    ].includes(error.message)
  );
}

function normalizeAuthError(error: unknown): never {
  if (isAuthError(error)) {
    throw error;
  }

  fail("AUTH_SERVICE_ERROR");
}

async function createToken(user: User): Promise<string> {
  return new SignJWT({
    userId: user.id,
    role: user.role,
    campusId: user.campusId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(getJwtSecret());
}

async function readTokenPayload(token: string): Promise<AuthTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const { userId, role, campusId } = payload;

    if (
      typeof userId !== "string" ||
      typeof role !== "string" ||
      typeof campusId !== "string"
    ) {
      fail("TOKEN_INVALID");
    }

    return {
      userId,
      role: role as User["role"],
      campusId,
    };
  } catch (error) {
    if (isAuthError(error)) {
      throw error;
    }

    fail("TOKEN_INVALID");
  }
}

export async function verifyInviteCode(inviteCode: string): Promise<boolean> {
  const expectedInviteCode = process.env.MVP_INVITE_CODE;

  if (!expectedInviteCode) {
    return false;
  }

  return inviteCode === expectedInviteCode;
}

export async function loginWithInviteCode(
  phone: string,
  inviteCode: string,
): Promise<AuthSession> {
  try {
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
      token: await createToken(user),
      user,
    };
  } catch (error) {
    normalizeAuthError(error);
  }
}

export async function verifyToken(token: string): Promise<AuthSession> {
  try {
    const payload = await readTokenPayload(token);
    const user = await getUserById(payload.userId);

    if (!user.isActive) {
      fail("USER_INACTIVE");
    }

    return {
      token,
      user,
    };
  } catch (error) {
    normalizeAuthError(error);
  }
}

export async function getCurrentUserFromToken(token: string): Promise<User> {
  const session = await verifyToken(token);

  return session.user;
}
