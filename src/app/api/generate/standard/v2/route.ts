import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { BRAND } from "@/config/brand";
import type { FinalBrandLayerAsset } from "@/models/final-composer";
import type { StandardGenerationInput } from "@/models/standard-generation";
import type {
  StandardFormV2ProductOutputType,
  StandardGenerateV2ErrorCode,
  StandardGenerateV2Request,
  StandardGenerateV2Response,
} from "@/models/standard-generation-api-v2";
import { generateStandardPoster } from "@/use-cases/generate-standard-poster.use-case";
import { backgroundFallbackCode, buildV2Diagnostics } from "./diagnostics";
import { createFormV2DebugBackgroundAsset } from "./fixtures";

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
    const parsed = await parseJson(request);
    if (parsed === undefined) return failure(requestId, 400, "invalid_json");
    const validation = validateRequest(parsed);
    if (!validation.ok) return failure(requestId, validation.status, validation.code, validation.message);
    const body = validation.body;
    const mode = body.background?.mode ?? "debugFixture";
    if (mode !== "debugFixture") return failure(requestId, 400, "unsupported_background_mode");
    if (body.options?.includeCampusInfo === true) return failure(requestId, 400, "campus_info_not_supported");

    const backgroundAsset = await createFormV2DebugBackgroundAsset(CANVAS);
    const assetWarnings: string[] = [];
    const brandAssets = await prepareBrandAssets(body, assetWarnings);
    const { input, summary } = await toGenerationInput(body, backgroundAsset, brandAssets);
    const result = await generateStandardPoster(input);
    const code = resultErrorCode(result);
    const ok = !code;
    return Response.json(mapResult(requestId, result, assetWarnings, summary, body, ok, code), { status: ok ? 200 : 422 });
  } catch {
    return failure(requestId, 500, "internal_error");
  }
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
  if (value.background !== undefined && (!isRecord(value.background) || !["debugFixture", "generated", "uploadedImage"].includes(String(value.background.mode)))) return invalid("unsupported_background_mode");
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

function mapResult(requestId: string, result: Awaited<ReturnType<typeof generateStandardPoster>>, assetWarnings: string[], summary: Record<string, unknown>, body: StandardGenerateV2Request, ok: boolean, code?: StandardGenerateV2ErrorCode): StandardGenerateV2Response {
  return {
    ok,
    source: "standard-api-v2",
    requestId,
    ...(result.output ? { output: { mimeType: "image/jpeg", base64: result.output.input.toString("base64"), width: result.output.width, height: result.output.height, sha256: result.output.sha256, byteLength: result.output.byteLength } } : {}),
    diagnostics: buildV2Diagnostics(result, assetWarnings, summary, body),
    safety: { passed: result.safety.passed, codes: result.safety.checks.map((item) => `${item.code}:${item.passed ? "PASS" : "FAIL"}`) },
    ...(code ? { error: errorPayload(code, result.reason) } : {}),
    reason: result.reason,
  };
}

function resultErrorCode(result: Awaited<ReturnType<typeof generateStandardPoster>>): StandardGenerateV2ErrorCode | undefined {
  if (result.output && result.safety.passed && result.source === "standard-generation-integration-v1") return undefined;
  if (backgroundFallbackCode(result) === "openai_api_key_missing") return "openai_api_key_missing";
  return result.output ? "generation_fail_closed" : "no_output";
}

function failure(requestId: string, status: number, code: StandardGenerateV2ErrorCode, message?: string): Response {
  const response: StandardGenerateV2Response = { ok: false, source: "standard-api-v2", requestId, error: errorPayload(code, message), reason: message ?? errorInfo(code).message };
  return Response.json(response, { status });
}

function errorPayload(code: StandardGenerateV2ErrorCode, message?: string) { const info = errorInfo(code); return { code, message: message ?? info.message, userMessage: info.userMessage }; }
function errorInfo(code: StandardGenerateV2ErrorCode): { message: string; userMessage: string } {
  const [message, userMessage] = ({
    invalid_json: ["Request body must be valid JSON.", "请求格式无效，请刷新后重试。"],
    invalid_request: ["Request body is invalid.", "请求参数无效，请检查表单。"],
    missing_main_title: ["title.mainTitle is required.", "请填写海报标题。"],
    invalid_title_length: ["title length is invalid.", "请控制标题长度。"],
    invalid_product_output_type: ["form.productOutputType is invalid.", "请选择要做什么图。"],
    event_brief_too_short: ["form.eventBrief must be 10-300 characters.", "请补充活动或课程内容。"],
    style_brief_too_short: ["form.styleBrief must be 4-200 characters.", "请补充画面感觉。"],
    avoid_notes_too_long: ["form.avoidNotes is too long.", "请缩短不希望出现的内容。"],
    unsupported_background_mode: ["Only debugFixture background is supported in Standard API v2.", "当前仅支持测试背景。"],
    campus_info_not_supported: ["campusInfoAsset is not supported in Standard API v2.", "当前暂不支持校区信息叠加。"],
    generation_fail_closed: ["Standard API v2 generation failed closed.", "生成未通过安全检查，请调整描述后重试。"],
    no_output: ["Standard API v2 produced no output.", "本次未生成海报，请稍后重试。"],
    openai_api_key_missing: ["OPENAI_API_KEY missing.", "系统生成配置未完成。"],
    internal_error: ["Standard API v2 failed unexpectedly.", "系统暂时不可用，请稍后重试。"],
  } satisfies Record<StandardGenerateV2ErrorCode, [string, string]>)[code];
  return { message, userMessage };
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
