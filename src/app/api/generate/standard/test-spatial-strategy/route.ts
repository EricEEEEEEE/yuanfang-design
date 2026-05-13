import {
  planSpatialStrategy,
  type PlanSpatialStrategyInput,
} from "@/services/spatial-strategy-planner.service";

const ERROR_STATUS: Record<string, number> = {
  INVALID_REQUEST: 400,
  TEST_API_DISABLED: 403,
  TEST_SPATIAL_STRATEGY_ERROR: 500,
};

type TestSpatialStrategyBody = {
  backgroundImageBase64: string;
  mainTitle: string;
  subtitle?: string;
  designFamily?: string;
  layoutFamily?: string;
  productOutputType?: string;
  eventBrief?: string;
  styleBrief?: string;
  visualDetails?: string;
  avoidNotes?: string;
};

export async function POST(request: Request): Promise<Response> {
  if (process.env.ENABLE_TEST_GENERATE_API !== "true") {
    return errorResponse("TEST_API_DISABLED");
  }

  const body = await parseJson(request);

  if (!isTestSpatialStrategyBody(body)) {
    return errorResponse("INVALID_REQUEST");
  }

  try {
    return Response.json(await planSpatialStrategy(body));
  } catch {
    return errorResponse("TEST_SPATIAL_STRATEGY_ERROR");
  }
}

async function parseJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function isTestSpatialStrategyBody(
  value: unknown,
): value is PlanSpatialStrategyInput & TestSpatialStrategyBody {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRequiredString(value.backgroundImageBase64) &&
    isRequiredString(value.mainTitle) &&
    isOptionalString(value.subtitle) &&
    isOptionalString(value.designFamily) &&
    isOptionalString(value.layoutFamily) &&
    isOptionalString(value.productOutputType) &&
    isOptionalString(value.eventBrief) &&
    isOptionalString(value.styleBrief) &&
    isOptionalString(value.visualDetails) &&
    isOptionalString(value.avoidNotes)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRequiredString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function errorResponse(code: string): Response {
  return Response.json(
    { error: code },
    { status: ERROR_STATUS[code] ?? 500 },
  );
}
