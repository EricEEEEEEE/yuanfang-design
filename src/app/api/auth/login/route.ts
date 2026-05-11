import { loginWithInviteCode } from "@/use-cases/login-with-invite.use-case";

const ERROR_STATUS: Record<string, number> = {
  INVALID_REQUEST: 400,
  INVALID_INVITE_CODE: 400,
  USER_INACTIVE: 401,
  TOKEN_INVALID: 401,
  USER_NOT_FOUND: 404,
  AUTH_SERVICE_ERROR: 500,
  JWT_SECRET_MISSING: 500,
};

async function parseJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<Response> {
  const body = await parseJson(request);

  if (!body || typeof body !== "object") {
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const { phone, inviteCode } = body as {
    phone?: unknown;
    inviteCode?: unknown;
  };

  if (
    typeof phone !== "string" ||
    typeof inviteCode !== "string" ||
    !phone ||
    !inviteCode
  ) {
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  try {
    const session = await loginWithInviteCode(phone, inviteCode);
    return Response.json(session);
  } catch (error) {
    const code =
      error instanceof Error && ERROR_STATUS[error.message]
        ? error.message
        : "AUTH_SERVICE_ERROR";

    return Response.json(
      { error: code },
      { status: ERROR_STATUS[code] ?? 500 },
    );
  }
}
