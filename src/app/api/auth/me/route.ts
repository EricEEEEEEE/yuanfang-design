import { getCurrentUserFromToken } from "@/use-cases/get-current-user.use-case";

const ERROR_STATUS: Record<string, number> = {
  TOKEN_MISSING: 401,
  TOKEN_INVALID: 401,
  USER_INACTIVE: 401,
  USER_NOT_FOUND: 404,
  AUTH_SERVICE_ERROR: 500,
  JWT_SECRET_MISSING: 500,
};

export async function GET(request: Request): Promise<Response> {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return Response.json({ error: "TOKEN_MISSING" }, { status: 401 });
  }

  const [scheme, token, extra] = authorization.split(" ");

  if (scheme !== "Bearer" || !token || extra) {
    return Response.json({ error: "TOKEN_INVALID" }, { status: 401 });
  }

  try {
    const user = await getCurrentUserFromToken(token);
    return Response.json({ user });
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
