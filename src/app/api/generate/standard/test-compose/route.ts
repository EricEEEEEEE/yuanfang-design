import { randomUUID } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { StandardLayoutFamilyKey } from "@/config/layout-families";
import { composeStandardPoster } from "@/services/image-compose.service";
import { generateImage } from "@/services/image-gen.service";
import {
  buildStandardPrompt,
  type StandardPromptInput,
} from "@/services/template.service";

const ERROR_STATUS: Record<string, number> = {
  INVALID_REQUEST: 400,
  TEST_API_DISABLED: 403,
  INVALID_TEMPLATE_INPUT: 400,
  TEMPLATE_NOT_FOUND: 404,
  TEMPLATE_INVALID: 500,
  OPENAI_API_KEY_MISSING: 500,
  IMAGE_GENERATION_FAILED: 500,
  IMAGE_RESULT_EMPTY: 500,
  COMPOSE_INPUT_INVALID: 500,
  COMPOSE_ASSET_MISSING: 500,
  COMPOSE_FAILED: 500,
  STANDARD_TEST_COMPOSE_ERROR: 500,
};

type StandardTestComposeBody = {
  theme: string;
  style: string;
  element: string;
  designFamily?: string;
  layoutFamily?: string;
  displayPolicy?: string;
  productOutputType?: string;
  eventBrief?: string;
  styleBrief?: string;
  visualDetails?: string;
  avoidNotes?: string;
  visualBrief?: string;
  mainTitle: string;
  subtitle?: string;
  campusName?: string;
  campusAddress?: string;
  campusPhone?: string;
};

export async function POST(request: Request): Promise<Response> {
  if (process.env.ENABLE_TEST_GENERATE_API !== "true") {
    return errorResponse("TEST_API_DISABLED");
  }

  const body = await parseJson(request);

  if (!isStandardTestComposeBody(body)) {
    return errorResponse("INVALID_REQUEST");
  }

  const input = body as StandardPromptInput;
  const tempId = randomUUID();
  const backgroundPath = join(tmpdir(), `yuanfang-standard-bg-${tempId}.png`);
  const outputPath = join(tmpdir(), `yuanfang-standard-composed-${tempId}.jpg`);

  try {
    const promptResult = buildStandardPrompt(input);
    const imageResult = await generateImage({ prompt: promptResult.prompt });

    await writeFile(backgroundPath, Buffer.from(imageResult.imageBase64, "base64"));
    await composeStandardPoster({
      backgroundImagePath: backgroundPath,
      outputPath,
      layoutFamily: body.layoutFamily as StandardLayoutFamilyKey | undefined,
      displayPolicy: body.displayPolicy,
      ...promptResult.overlayData,
    });

    const composedImage = await readFile(outputPath);

    return Response.json({
      imageBase64: composedImage.toString("base64"),
      modelUsed: imageResult.modelUsed,
      overlayData: promptResult.overlayData,
      templateMeta: promptResult.templateMeta,
    });
  } catch (error) {
    return errorResponse(errorCode(error));
  } finally {
    await Promise.all([safeUnlink(backgroundPath), safeUnlink(outputPath)]);
  }
}

async function parseJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function isStandardTestComposeBody(
  value: unknown,
): value is StandardTestComposeBody {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRequiredString(value.theme) &&
    isRequiredString(value.style) &&
    isRequiredString(value.element) &&
    isOptionalString(value.designFamily) &&
    isOptionalString(value.layoutFamily) &&
    isOptionalString(value.displayPolicy) &&
    isOptionalString(value.productOutputType) &&
    isOptionalString(value.eventBrief) &&
    isOptionalString(value.styleBrief) &&
    isOptionalString(value.visualDetails) &&
    isOptionalString(value.avoidNotes) &&
    isOptionalString(value.visualBrief) &&
    isRequiredString(value.mainTitle) &&
    isOptionalString(value.campusName) &&
    isOptionalString(value.campusPhone) &&
    isOptionalString(value.subtitle) &&
    isOptionalString(value.campusAddress)
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

async function safeUnlink(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    return;
  }
}

function errorCode(error: unknown): string {
  return error instanceof Error && ERROR_STATUS[error.message]
    ? error.message
    : "STANDARD_TEST_COMPOSE_ERROR";
}

function errorResponse(code: string): Response {
  return Response.json(
    { error: code },
    { status: ERROR_STATUS[code] ?? 500 },
  );
}
