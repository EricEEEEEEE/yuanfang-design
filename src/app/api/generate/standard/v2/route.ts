import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { BRAND } from "@/config/brand";
import type { FinalBrandLayerAsset } from "@/models/final-composer";
import type { StandardGenerationInput, StandardGenerationResult } from "@/models/standard-generation";
import type { StandardFormV2ProductOutputType, StandardGenerateV2Diagnostics, StandardGenerateV2ErrorCode, StandardGenerateV2GeneratedBackgroundDiagnostics, StandardGenerateV2Request, StandardGenerateV2Response } from "@/models/standard-generation-api-v2";
import { generateStandardPoster } from "@/use-cases/generate-standard-poster.use-case";
import { generateStandardV2WithCredit } from "@/use-cases/generate-standard-v2-with-credit.use-case";
import { resolveStandardV2Background } from "./background";
import { authorizeStandardV2InternalTest } from "./auth";
import { backgroundFallbackCode, buildV2Diagnostics } from "./diagnostics";
import { standardV2ErrorMessage, standardV2ErrorPayload } from "./errors";
import { buildTitleHierarchyContext } from "./title-hierarchy";

export const runtime = "nodejs";

const CANVAS = { width: 1080, height: 1620 };
const PRODUCT_TYPES: readonly StandardFormV2ProductOutputType[] = ["achievementShowcase", "enrollment", "festival", "classReview", "parentNotice", "socialPost"];
const PRODUCT_CONTEXT: Record<StandardFormV2ProductOutputType, { designFamily: string; sceneKey: string }> = {
  achievementShowcase: { designFamily: "achievementShowcase", sceneKey: "achievementShowcase" },
  enrollment: { designFamily: "boldCampaign", sceneKey: "enrollment" },
  festival: { designFamily: "ipCartoonEvent", sceneKey: "festival" },
  classReview: { designFamily: "achievementShowcase", sceneKey: "classReview" },
  parentNotice: { designFamily: "cleanNotice", sceneKey: "parentNotice" },
  socialPost: { designFamily: "literaryEditorial", sceneKey: "socialPost" },
};

type Validation =
  | { ok: true; body: StandardGenerateV2Request }
  | { ok: false; status: number; code: StandardGenerateV2ErrorCode; message?: string };

export async function POST(request: Request): Promise<Response> {
  const requestId = randomUUID();
  try {
    if (!authorizeStandardV2InternalTest(request).ok) return failure(requestId, 401, "unauthorized");
    const parsed = await parseJson(request);
    if (parsed === undefined) return failure(requestId, 400, "invalid_json");
    const validation = validateRequest(parsed);
    if (!validation.ok) return failure(requestId, validation.status, validation.code, validation.message);
    const body = validation.body;
    if (body.options?.includeCampusInfo === true) return failure(requestId, 400, "campus_info_not_supported");

    const credit = await generateStandardV2WithCredit({
      request: body,
      requestId,
      creditRequired: true,
      execute: () => executeStandardGeneration(body),
    });
    if (!credit.ok) return failure(requestId, credit.status, credit.code, credit.message, body.options?.debug === true ? credit.diagnostics : undefined);
    const result = credit.result;
    const code = resultErrorCode(result);
    const ok = !code;
    return Response.json(mapResult(requestId, result, credit.assetWarnings, credit.summary, body, ok, code, credit.generatedBackground), { status: ok ? 200 : 422 });
  } catch {
    return failure(requestId, 500, "internal_error");
  }
}

async function executeStandardGeneration(body: StandardGenerateV2Request) {
  const background = await resolveStandardV2Background(body, CANVAS);
  if (!background.ok) return { ok: false as const, status: background.status, code: background.code, message: background.message, diagnostics: body.options?.debug === true ? background.diagnostics : undefined };
  const assetWarnings: string[] = [];
  const brandAssets = await prepareBrandAssets(body, assetWarnings);
  const { input, summary } = await toGenerationInput(body, background.backgroundAsset, brandAssets);
  const result = await generateStandardPoster(input);
  return {
    ok: true as const,
    result,
    assetWarnings: [...assetWarnings, ...background.warnings],
    summary: { ...summary, backgroundMode: background.mode, backgroundSource: background.backgroundAsset.source, backgroundPromptHash: background.generatedBackground?.promptHash, backgroundModelUsed: background.generatedBackground?.modelUsed },
    generatedBackground: background.generatedBackground,
  };
}

async function parseJson(request: Request): Promise<unknown | undefined> {
  try { return await request.json(); } catch { return undefined; }
}

function validateRequest(value: unknown): Validation {
  if (!isRecord(value)) return invalid("invalid_request");
  if (value.source !== undefined && value.source !== "standard-form-v2") return invalid("invalid_request");
  if (value.brandKey !== undefined && value.brandKey !== "yuanfangDefault") return invalid("invalid_request");
  if (value.canvas !== undefined && !validCanvas(value.canvas)) return invalid("invalid_request", "canvas must be 1080x1620 for Standard API v2.");
  if (!isRecord(value.form)) return invalid("invalid_request", "form is required.");
  if (!isRecord(value.title)) return invalid("invalid_request", "title is required.");
  if (!PRODUCT_TYPES.includes(value.form.productOutputType as StandardFormV2ProductOutputType)) return invalid("invalid_product_output_type");
  if (!between(value.form.eventBrief, 10, 300)) return invalid("event_brief_too_short");
  if (!between(value.form.styleBrief, 4, 200)) return invalid("style_brief_too_short");
  if (value.form.visualDetails !== undefined && !maxText(value.form.visualDetails, 300)) return invalid("invalid_request", "visualDetails is too long.");
  if (!between(value.form.titleBrief, 2, 200)) return invalid("invalid_request", "titleBrief is required.");
  if (!nonEmpty(value.title.mainTitle)) return invalid("missing_main_title");
  if (!between(value.title.mainTitle, 2, 16)) return invalid("invalid_title_length");
  if (value.title.subtitle !== undefined && !maxText(value.title.subtitle, 32)) return invalid("invalid_title_length", "subtitle is too long.");
  if (!validEmphasis(value.title.titleEmphasisWords, value.title.mainTitle)) return invalid("invalid_request", "titleEmphasisWords must be substrings of mainTitle.");
  if (value.form.avoidNotes !== undefined && !maxText(value.form.avoidNotes, 200)) return invalid("avoid_notes_too_long");
  if (value.background !== undefined && (!isRecord(value.background) || !["debugFixture", "generated"].includes(String(value.background.mode)))) return invalid("unsupported_background_mode");
  if (value.options !== undefined && !validOptions(value.options)) return invalid("invalid_request", "options are invalid.");
  return { ok: true, body: value as StandardGenerateV2Request };
}

async function toGenerationInput(body: StandardGenerateV2Request, backgroundAsset: StandardGenerationInput["backgroundAsset"], brandAssets?: StandardGenerationInput["brandAssets"]): Promise<{ input: StandardGenerationInput; summary: Record<string, unknown> }> {
  const form = body.form;
  const title = body.title;
  const context = PRODUCT_CONTEXT[form.productOutputType];
  const emphasis = title.titleEmphasisWords?.filter(Boolean) ?? [];
  const request = {
    mainTitle: text(title.mainTitle),
    ...(text(title.subtitle) ? { subtitle: text(title.subtitle) } : {}),
    keywords: [form.productOutputType, text(form.eventBrief), text(form.styleBrief), text(form.visualDetails), text(form.titleBrief)].filter(Boolean),
    sceneKey: context.sceneKey,
    brandKey: body.brandKey ?? "yuanfangDefault",
    designFamily: context.designFamily,
    layoutFamily: "centerTitle",
    displayPolicy: "titleOnlyDefault",
    productOutputType: form.productOutputType,
    eventBrief: `${text(form.eventBrief)}\n标题意图：${text(form.titleBrief)}`,
    styleBrief: emphasis.length ? `${text(form.styleBrief)}；标题重点词：${emphasis.join("、")}` : text(form.styleBrief),
    visualDetails: text(form.visualDetails),
    avoidNotes: [text(form.avoidNotes), "不要生成文字、不要生成 logo、不要生成二维码。"].filter(Boolean).join("；"),
    titleHierarchyContext: buildTitleHierarchyContext(body),
  };
  const input: StandardGenerationInput = {
    canvas: CANVAS,
    request,
    backgroundAsset,
    ...(brandAssets ? { brandAssets } : {}),
    options: {
      includeLogo: body.options?.includeLogo !== false,
      includeMascot: body.options?.includeMascot === true,
      includeCampusInfo: false,
      outputMimeType: "image/jpeg",
      jpegQuality: body.options?.jpegQuality ?? 78,
      debug: body.options?.debug === true,
    },
  };
  return { input, summary: { source: body.source ?? "standard-form-v2", productOutputType: form.productOutputType, designFamily: context.designFamily, sceneKey: context.sceneKey, titleBriefMappedTo: "eventBrief", titleEmphasisWords: emphasis, backgroundMode: body.background?.mode ?? "debugFixture" } };
}

async function prepareBrandAssets(input: StandardGenerateV2Request, warnings: string[]): Promise<StandardGenerationInput["brandAssets"] | undefined> {
  const assets: StandardGenerationInput["brandAssets"] = {};
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

function mapResult(requestId: string, result: StandardGenerationResult, assetWarnings: string[], summary: Record<string, unknown>, body: StandardGenerateV2Request, ok: boolean, code?: StandardGenerateV2ErrorCode, generatedBackground?: StandardGenerateV2GeneratedBackgroundDiagnostics): StandardGenerateV2Response {
  return {
    ok,
    source: "standard-api-v2",
    requestId,
    ...(result.output ? { output: { mimeType: "image/jpeg", base64: result.output.input.toString("base64"), width: result.output.width, height: result.output.height, sha256: result.output.sha256, byteLength: result.output.byteLength } } : {}),
    ...(body.options?.debug === true ? { diagnostics: buildV2Diagnostics(result, assetWarnings, summary, body, generatedBackground), safety: { passed: result.safety.passed, codes: result.safety.checks.map((item) => `${item.code}:${item.passed ? "PASS" : "FAIL"}`) } } : {}),
    ...(code ? { error: standardV2ErrorPayload(code, result.reason) } : {}),
    reason: result.reason,
  };
}

function resultErrorCode(result: StandardGenerationResult): StandardGenerateV2ErrorCode | undefined {
  if (result.output && result.safety.passed && result.source === "standard-generation-integration-v1") return undefined;
  if (backgroundFallbackCode(result) === "openai_api_key_missing") return "openai_api_key_missing";
  return result.output ? "generation_fail_closed" : "no_output";
}

function failure(requestId: string, status: number, code: StandardGenerateV2ErrorCode, message?: string, diagnostics?: StandardGenerateV2Diagnostics): Response {
  const response: StandardGenerateV2Response = { ok: false, source: "standard-api-v2", requestId, ...(diagnostics ? { diagnostics } : {}), error: standardV2ErrorPayload(code, message), reason: message ?? standardV2ErrorMessage(code) };
  return Response.json(response, { status });
}

function invalid(code: StandardGenerateV2ErrorCode, message?: string): Validation { return { ok: false, status: 400, code, message }; }
function validCanvas(value: unknown): boolean { return isRecord(value) && value.width === CANVAS.width && value.height === CANVAS.height; }
function validOptions(value: unknown): boolean { return isRecord(value) && (value.outputMimeType === undefined || value.outputMimeType === "image/jpeg") && (value.jpegQuality === undefined || (Number.isInteger(value.jpegQuality) && Number(value.jpegQuality) >= 60 && Number(value.jpegQuality) <= 90)) && ["includeLogo", "includeMascot", "includeCampusInfo", "debug"].every((key) => value[key] === undefined || typeof value[key] === "boolean"); }
function validEmphasis(value: unknown, mainTitle: unknown): boolean { return value === undefined || (Array.isArray(value) && typeof mainTitle === "string" && value.every((item) => typeof item === "string" && item.trim() && mainTitle.includes(item.trim()))); }
function between(value: unknown, min: number, max: number): value is string { return typeof value === "string" && text(value).length >= min && text(value).length <= max; }
function maxText(value: unknown, max: number): value is string { return typeof value === "string" && text(value).length <= max; }
function nonEmpty(value: unknown): value is string { return typeof value === "string" && text(value).length > 0; }
function text(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
