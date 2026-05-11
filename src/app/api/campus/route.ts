import { getCurrentUserFromToken } from "@/use-cases/get-current-user.use-case";
import { createCampus, listCampuses } from "@/services/campus.service";
import type { CreateCampusInput } from "@/models/campus";

const ERROR_STATUS: Record<string, number> = {
  TOKEN_MISSING: 401,
  TOKEN_INVALID: 401,
  USER_INACTIVE: 401,
  USER_NOT_FOUND: 404,
  FORBIDDEN: 403,
  INVALID_REQUEST: 400,
  CAMPUS_SERVICE_ERROR: 500,
  JWT_SECRET_MISSING: 500,
  AUTH_SERVICE_ERROR: 500,
  DATABASE_URL_MISSING: 500,
};

function errorResponse(code: string): Response {
  return Response.json(
    { error: code },
    { status: ERROR_STATUS[code] ?? 500 },
  );
}

function errorCode(error: unknown): string {
  return error instanceof Error && ERROR_STATUS[error.message]
    ? error.message
    : "CAMPUS_SERVICE_ERROR";
}

async function authorizePlatformAdmin(request: Request): Promise<Response | null> {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return errorResponse("TOKEN_MISSING");
  }

  const [scheme, token, extra] = authorization.split(" ");

  if (scheme !== "Bearer" || !token || extra) {
    return errorResponse("TOKEN_INVALID");
  }

  try {
    const user = await getCurrentUserFromToken(token);
    return user.role === "PLATFORM_ADMIN" ? null : errorResponse("FORBIDDEN");
  } catch (error) {
    return errorResponse(errorCode(error));
  }
}

async function parseJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET(request: Request): Promise<Response> {
  const authError = await authorizePlatformAdmin(request);

  if (authError) {
    return authError;
  }

  try {
    const campuses = await listCampuses();
    return Response.json({ campuses });
  } catch (error) {
    return errorResponse(errorCode(error));
  }
}

export async function POST(request: Request): Promise<Response> {
  const authError = await authorizePlatformAdmin(request);

  if (authError) {
    return authError;
  }

  const body = await parseJson(request);

  if (!body || typeof body !== "object") {
    return errorResponse("INVALID_REQUEST");
  }

  const { name, address, phone } = body as {
    name?: unknown;
    address?: unknown;
    phone?: unknown;
  };

  if (
    typeof name !== "string" ||
    typeof address !== "string" ||
    typeof phone !== "string" ||
    !name ||
    !address ||
    !phone
  ) {
    return errorResponse("INVALID_REQUEST");
  }

  const input: CreateCampusInput = {
    name,
    address,
    phone,
  };

  try {
    const campus = await createCampus(input);
    return Response.json({ campus });
  } catch (error) {
    return errorResponse(errorCode(error));
  }
}
