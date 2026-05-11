import { getCurrentUserFromToken } from "@/use-cases/get-current-user.use-case";
import { getCampusById, updateCampus } from "@/services/campus.service";
import type { UpdateCampusInput } from "@/models/campus";

type RouteContext = {
  params: {
    id: string;
  };
};

const ERROR_STATUS: Record<string, number> = {
  TOKEN_MISSING: 401,
  TOKEN_INVALID: 401,
  USER_INACTIVE: 401,
  USER_NOT_FOUND: 404,
  FORBIDDEN: 403,
  INVALID_REQUEST: 400,
  CAMPUS_NOT_FOUND: 404,
  CAMPUS_SERVICE_ERROR: 500,
  JWT_SECRET_MISSING: 500,
  AUTH_SERVICE_ERROR: 500,
  DATABASE_URL_MISSING: 500,
};

const UPDATE_FIELDS = ["name", "address", "phone", "isActive"];

function errorResponse(code: string): Response {
  return Response.json(
    { error: code },
    { status: ERROR_STATUS[code] ?? 500 },
  );
}

function errorCode(error: unknown): string {
  if (error instanceof Error && ERROR_STATUS[error.message]) {
    return error.message;
  }

  return "CAMPUS_SERVICE_ERROR";
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

  const user = await getCurrentUserFromToken(token);

  if (user.role !== "PLATFORM_ADMIN") {
    return errorResponse("FORBIDDEN");
  }

  return null;
}

async function parseJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function buildUpdateInput(body: unknown): UpdateCampusInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const record = body as Record<string, unknown>;

  if (Object.keys(record).some((key) => !UPDATE_FIELDS.includes(key))) {
    return null;
  }

  const input: UpdateCampusInput = {};

  if ("name" in record) {
    if (typeof record.name !== "string" || !record.name) {
      return null;
    }
    input.name = record.name;
  }

  if ("address" in record) {
    if (typeof record.address !== "string" || !record.address) {
      return null;
    }
    input.address = record.address;
  }

  if ("phone" in record) {
    if (typeof record.phone !== "string" || !record.phone) {
      return null;
    }
    input.phone = record.phone;
  }

  if ("isActive" in record) {
    if (typeof record.isActive !== "boolean") {
      return null;
    }
    input.isActive = record.isActive;
  }

  return Object.keys(input).length > 0 ? input : null;
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const authError = await authorizePlatformAdmin(request);

    if (authError) {
      return authError;
    }

    const campusId = context.params.id;

    if (!campusId) {
      return errorResponse("INVALID_REQUEST");
    }

    const campus = await getCampusById(campusId);

    return Response.json({ campus });
  } catch (error) {
    return errorResponse(errorCode(error));
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const authError = await authorizePlatformAdmin(request);

    if (authError) {
      return authError;
    }

    const campusId = context.params.id;
    const body = await parseJson(request);
    const input = buildUpdateInput(body);

    if (!campusId || !input) {
      return errorResponse("INVALID_REQUEST");
    }

    const campus = await updateCampus(campusId, input);

    return Response.json({ campus });
  } catch (error) {
    return errorResponse(errorCode(error));
  }
}
