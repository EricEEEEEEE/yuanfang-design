import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { BRAND } from "@/config/brand";
import type { FinalBrandLayerAsset } from "@/models/final-composer";
import type {
  StandardGenerateV1ErrorCode,
  StandardGenerateV1Request,
  StandardGenerateV1Response,
} from "@/models/standard-generation-api";
import { generateStandardPoster } from "@/use-cases/generate-standard-poster.use-case";
import { buildDiagnostics } from "./diagnostics";
import { createDebugBackgroundAsset } from "./fixtures";

export const runtime = "nodejs";

const DEFAULT_CANVAS = { width: 1080, height: 1620 };
const MIN_CANVAS = 512;
const MAX_CANVAS = 4096;
const DEFAULT_KEYWORDS = ["作品墙", "展示台", "舞台光", "奖章", "表达力", "课程成果"];
const DEFAULT_SUBTITLE = "看见孩子的表达力量";
const DEFAULT_CONTEXT = { sceneKey: "achievementShowcase", designFamily: "achievementShowcase", layoutFamily: "centerTitle", displayPolicy: "titleOnlyDefault", productOutputType: "mainVisual", eventBrief: "这是一次学期成长汇报课，孩子会展示阅读、写作、表达和课堂展示方面的成长。", styleBrief: "明亮、有仪式感、有成果感，也要专业可信。", visualDetails: "中央竖向标题安全光柱、左右作品墙、底部舞台展示台、奖章点缀位于底部两侧、右上 logo 预留区；中心光柱不放人物和麦克风。", avoidNotes: "不要山水卷轴、不要低幼卡通、不要人物太多，不要让主体侵入中央标题安全区。" };

type Validation =
  | { ok: true; body: StandardGenerateV1Request; canvas: { width: number; height: number } }
  | { ok: false; status: number; code: StandardGenerateV1ErrorCode; message: string };

export async function POST(request: Request): Promise<Response> {
  const requestId = randomUUID();

  try {
    const body = await parseJson(request);
    if (body === undefined) return failure(requestId, 400, "invalid_json", "Request body must be valid JSON.");
    const validation = validateRequest(body);
    if (!validation.ok) return failure(requestId, validation.status, validation.code, validation.message);

    const { body: input, canvas } = validation;
    const backgroundMode = input.background?.mode ?? "debugFixture";
    if (backgroundMode === "generated") {
      return failure(requestId, 400, "generated_background_not_supported_in_v1", "Generated background is not supported by Standard API v1.");
    }
    if (backgroundMode === "uploadedImage") {
      return failure(requestId, 400, "uploaded_image_not_implemented", "Uploaded image background is not implemented in Standard API v1.");
    }
    if (input.options?.includeCampusInfo === true) {
      return failure(requestId, 400, "campus_info_asset_not_supported_in_v1", "Standard API v1 requires a pre-rendered campus info asset.");
    }

    const backgroundAsset = await createDebugBackgroundAsset(canvas);
    const assetWarnings: string[] = [];
    const brandAssets = await prepareBrandAssets(input, assetWarnings);
    const result = await generateStandardPoster({
      canvas,
      request: {
        mainTitle: input.mainTitle.trim(),
        subtitle: cleanOptional(input.subtitle) ?? DEFAULT_SUBTITLE,
        keywords: cleanKeywords(input.keywords) ?? DEFAULT_KEYWORDS,
        sceneKey: cleanOptional(input.sceneKey) ?? DEFAULT_CONTEXT.sceneKey,
        brandKey: input.brandKey ?? "yuanfangDefault",
        designFamily: cleanOptional(input.designFamily) ?? DEFAULT_CONTEXT.designFamily,
        layoutFamily: DEFAULT_CONTEXT.layoutFamily,
        displayPolicy: DEFAULT_CONTEXT.displayPolicy,
        productOutputType: DEFAULT_CONTEXT.productOutputType,
        eventBrief: DEFAULT_CONTEXT.eventBrief,
        styleBrief: DEFAULT_CONTEXT.styleBrief,
        visualDetails: DEFAULT_CONTEXT.visualDetails,
        avoidNotes: DEFAULT_CONTEXT.avoidNotes,
      },
      backgroundAsset,
      ...(brandAssets ? { brandAssets } : {}),
      options: {
        includeLogo: input.options?.includeLogo,
        includeMascot: input.options?.includeMascot,
        includeCampusInfo: false,
        outputMimeType: input.options?.outputMimeType ?? "image/jpeg",
        jpegQuality: input.options?.jpegQuality ?? 78,
        debug: input.options?.debug === true,
      },
    });

    if (!result.output || !result.safety.passed || result.source !== "standard-generation-integration-v1") {
      return Response.json(mapResult(requestId, result, assetWarnings, false, "generation_failed"), { status: 422 });
    }

    return Response.json(mapResult(requestId, result, assetWarnings, true), { status: 200 });
  } catch {
    return failure(requestId, 500, "standard_generation_api_v1_error", "Standard API v1 failed unexpectedly.");
  }
}

async function parseJson(request: Request): Promise<unknown | undefined> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

function validateRequest(value: unknown): Validation {
  if (!isRecord(value)) return invalid("invalid_request", "Request body must be an object.");
  if (!nonEmptyString(value.mainTitle)) return invalid("missing_main_title", "mainTitle is required.");
  if (value.brandKey !== undefined && value.brandKey !== "yuanfangDefault") return invalid("invalid_request", "brandKey is not supported.");
  if (value.background !== undefined && !isRecord(value.background)) return invalid("invalid_background", "background must be an object.");
  const mode = isRecord(value.background) ? value.background.mode : undefined;
  if (mode !== undefined && mode !== "debugFixture" && mode !== "uploadedImage" && mode !== "generated") {
    return invalid("invalid_background", "background.mode is not supported.");
  }
  const canvas = parseCanvas(isRecord(value.canvas) ? value.canvas : undefined);
  if (!canvas) return invalid("invalid_canvas", "canvas width and height must be integers between 512 and 4096.");
  if (value.options !== undefined && !validOptions(value.options)) return invalid("invalid_request", "options are invalid.");
  if (value.keywords !== undefined && !validKeywords(value.keywords)) return invalid("invalid_request", "keywords must be strings.");
  return { ok: true, body: value as StandardGenerateV1Request, canvas };
}

function parseCanvas(value?: Record<string, unknown>): { width: number; height: number } | undefined {
  const width = value?.width ?? DEFAULT_CANVAS.width;
  const height = value?.height ?? DEFAULT_CANVAS.height;
  return validDimension(width) && validDimension(height) ? { width, height } : undefined;
}

function validOptions(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.outputMimeType !== undefined && value.outputMimeType !== "image/jpeg" && value.outputMimeType !== "image/png") return false;
  const jpegQuality = value.jpegQuality;
  if (jpegQuality !== undefined) {
    if (typeof jpegQuality !== "number" || !Number.isInteger(jpegQuality) || jpegQuality < 1 || jpegQuality > 100) return false;
  }
  return ["includeLogo", "includeMascot", "includeCampusInfo", "debug"].every((key) => value[key] === undefined || typeof value[key] === "boolean");
}

async function prepareBrandAssets(input: StandardGenerateV1Request, warnings: string[]): Promise<{ logo?: FinalBrandLayerAsset; mascot?: FinalBrandLayerAsset } | undefined> {
  const assets: { logo?: FinalBrandLayerAsset; mascot?: FinalBrandLayerAsset } = {};
  if (input.options?.includeLogo !== false) assets.logo = await readBrandAsset(BRAND.logoPath, 180, "topRight", warnings, "logo");
  if (input.options?.includeMascot === true) assets.mascot = await readBrandAsset(BRAND.mascotPath, BRAND.mascotPosition.width, "optional", warnings, "mascot");
  return assets.logo || assets.mascot ? assets : undefined;
}

async function readBrandAsset(path: string, width: number, placementPolicy: FinalBrandLayerAsset["placementPolicy"], warnings: string[], label: string): Promise<FinalBrandLayerAsset | undefined> {
  try {
    const { data, info } = await sharp(await readFile(resolve(process.cwd(), path))).resize({ width }).png().toBuffer({ resolveWithObject: true });
    return { input: data, width: info.width, height: info.height, placementPolicy };
  } catch {
    warnings.push(`${label} asset unavailable; skipped.`);
    return undefined;
  }
}

function mapResult(requestId: string, result: Awaited<ReturnType<typeof generateStandardPoster>>, assetWarnings: string[], ok: boolean, errorCode?: StandardGenerateV1ErrorCode): StandardGenerateV1Response {
  return {
    ok,
    source: "standard-generation-api-v1",
    requestId,
    ...(result.output ? { output: { mimeType: result.output.mimeType, base64: result.output.input.toString("base64"), width: result.output.width, height: result.output.height, sha256: result.output.sha256, byteLength: result.output.byteLength } } : {}),
    diagnostics: buildDiagnostics(result, assetWarnings),
    safety: { passed: result.safety.passed, codes: result.safety.checks.map((item) => `${item.code}:${item.passed ? "PASS" : "FAIL"}`) },
    ...(errorCode ? { error: { code: errorCode, message: result.reason } } : {}),
    reason: result.reason,
  };
}

function failure(requestId: string, status: number, code: StandardGenerateV1ErrorCode, message: string): Response {
  const response: StandardGenerateV1Response = { ok: false, source: "standard-generation-api-v1", requestId, error: { code, message }, reason: message };
  return Response.json(response, { status });
}

function invalid(code: StandardGenerateV1ErrorCode, message: string): Validation { return { ok: false, status: 400, code, message }; }
function cleanOptional(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function cleanKeywords(value: unknown): string[] | undefined { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : undefined; }
function validKeywords(value: unknown): boolean { return Array.isArray(value) && value.every((item) => typeof item === "string"); }
function validDimension(value: unknown): value is number { return typeof value === "number" && Number.isInteger(value) && value >= MIN_CANVAS && value <= MAX_CANVAS; }
function nonEmptyString(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
