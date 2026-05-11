import { SignJWT, jwtVerify } from "jose";
import type { User } from "@/models/user";

export type AuthTokenPayload = {
  userId: string;
  role: User["role"];
  campusId: string;
};

type AuthServiceErrorCode =
  | "JWT_SECRET_MISSING"
  | "TOKEN_INVALID"
  | "AUTH_SERVICE_ERROR";

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

function isAuthServiceError(error: unknown): boolean {
  return (
    error instanceof Error &&
    ["JWT_SECRET_MISSING", "TOKEN_INVALID", "AUTH_SERVICE_ERROR"].includes(
      error.message,
    )
  );
}

function normalizeCreateTokenError(error: unknown): never {
  if (isAuthServiceError(error)) {
    throw error;
  }

  fail("AUTH_SERVICE_ERROR");
}

export async function verifyInviteCode(inviteCode: string): Promise<boolean> {
  const expectedInviteCode = process.env.MVP_INVITE_CODE;

  if (!expectedInviteCode) {
    return false;
  }

  return inviteCode === expectedInviteCode;
}

export async function createTokenForUser(user: User): Promise<string> {
  try {
    return await new SignJWT({
      userId: user.id,
      role: user.role,
      campusId: user.campusId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRES_IN)
      .sign(getJwtSecret());
  } catch (error) {
    normalizeCreateTokenError(error);
  }
}

export async function verifyTokenPayload(
  token: string,
): Promise<AuthTokenPayload> {
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
    if (error instanceof Error && error.message === "JWT_SECRET_MISSING") {
      throw error;
    }

    fail("TOKEN_INVALID");
  }
}
