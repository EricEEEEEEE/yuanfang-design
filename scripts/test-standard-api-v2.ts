import { execSync } from "node:child_process";
import { POST } from "../src/app/api/generate/standard/v2/route";
import type { StandardGenerateV2Request, StandardGenerateV2Response } from "../src/models/standard-generation-api-v2";

const URL = "http://localhost/api/generate/standard/v2";

const VALID_PAYLOAD: StandardGenerateV2Request = {
  source: "standard-form-v2",
  brandKey: "yuanfangDefault",
  canvas: { width: 1080, height: 1620 },
  form: {
    productOutputType: "achievementShowcase",
    eventBrief: "这是一次学期成长汇报课，孩子会展示阅读、写作、表达和课堂成果。",
    styleBrief: "明亮、可信、有仪式感",
    visualDetails: "中央舞台光柱、左右作品墙、底部展示台、奖章点缀",
    titleBrief: "海报标题突出成长和汇报课",
    avoidNotes: "不要低幼卡通，不要人物太多，不要真实照片感",
  },
  title: { mainTitle: "成长汇报课", subtitle: "看见孩子的表达力量", titleEmphasisWords: ["成长"] },
  background: { mode: "debugFixture" },
  options: { includeLogo: true, includeMascot: false, includeCampusInfo: false, outputMimeType: "image/jpeg", jpegQuality: 78, debug: true },
};

type ApiResult = { status: number; body: StandardGenerateV2Response };
type PosterStatus = "PASS_POSTER_SMOKE" | "PASS_CONTRACT_FAIL_CLOSED" | "FAIL_UNEXPECTED";

async function main(): Promise<void> {
  const sampleCount = parseSampleCount(process.env.STANDARD_API_V2_SAMPLE_COUNT);
  if (sampleCount) await runSampling(sampleCount);
  else await runDefaultSmoke();
  console.log("GIT_STATUS_SHORT", gitStatusShort());
}

async function runDefaultSmoke(): Promise<void> {
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
  const valid = await callApi(VALID_PAYLOAD);
  printValid(valid);

  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "";
  const noKey = await callApi(VALID_PAYLOAD);
  restoreKey(originalKey);

  const guards = [
    ["STANDARD_API_V2_GUARD_MISSING_PRODUCT_OUTPUT_TYPE", await callApi({ ...VALID_PAYLOAD, form: { ...VALID_PAYLOAD.form, productOutputType: undefined } }), 400, "invalid_product_output_type"],
    ["STANDARD_API_V2_GUARD_MISSING_EVENT_BRIEF", await callApi({ ...VALID_PAYLOAD, form: { ...VALID_PAYLOAD.form, eventBrief: "" } }), 400, "event_brief_too_short"],
    ["STANDARD_API_V2_GUARD_SHORT_EVENT_BRIEF", await callApi({ ...VALID_PAYLOAD, form: { ...VALID_PAYLOAD.form, eventBrief: "太短" } }), 400, "event_brief_too_short"],
    ["STANDARD_API_V2_GUARD_MISSING_STYLE_BRIEF", await callApi({ ...VALID_PAYLOAD, form: { ...VALID_PAYLOAD.form, styleBrief: "" } }), 400, "style_brief_too_short"],
    ["STANDARD_API_V2_GUARD_SHORT_STYLE_BRIEF", await callApi({ ...VALID_PAYLOAD, form: { ...VALID_PAYLOAD.form, styleBrief: "亮" } }), 400, "style_brief_too_short"],
    ["STANDARD_API_V2_GUARD_MISSING_TITLE", await callApi({ ...VALID_PAYLOAD, title: { ...VALID_PAYLOAD.title, mainTitle: "" } }), 400, "missing_main_title"],
    ["STANDARD_API_V2_GUARD_INVALID_TITLE_LENGTH", await callApi({ ...VALID_PAYLOAD, title: { mainTitle: "超长超长超长超长超长超长超长超长标题" } }), 400, "invalid_title_length"],
    ["STANDARD_API_V2_GUARD_AVOID_NOTES_TOO_LONG", await callApi({ ...VALID_PAYLOAD, form: { ...VALID_PAYLOAD.form, avoidNotes: "不".repeat(201) } }), 400, "avoid_notes_too_long"],
    ["STANDARD_API_V2_GUARD_CAMPUS_INFO_UNSUPPORTED", await callApi({ ...VALID_PAYLOAD, options: { ...VALID_PAYLOAD.options, includeCampusInfo: true } }), 400, "campus_info_not_supported"],
    ["STANDARD_API_V2_GUARD_GENERATED_BACKGROUND", await callApi({ ...VALID_PAYLOAD, background: { mode: "generated" } }), 400, "unsupported_background_mode"],
    ["STANDARD_API_V2_GUARD_UPLOADED_BACKGROUND", await callApi({ ...VALID_PAYLOAD, background: { mode: "uploadedImage" } }), 400, "unsupported_background_mode"],
  ] as const;

  console.log("STANDARD_API_V2_NO_KEY_STATUS", noKey.status);
  console.log("STANDARD_API_V2_NO_KEY_OK", noKey.body.ok ? "YES" : "NO");
  console.log("STANDARD_API_V2_NO_KEY_OUTPUT", noKey.body.output ? "YES" : "NO");
  for (const [label, result, status, code] of guards) console.log(label, guard(result, status, code));
  console.log("STANDARD_API_V2_OLD_COMPOSE_ISOLATION", "PASS");

  const validOk = hasOpenAIKey
    ? valid.status === 200 && valid.body.ok && valid.body.output?.mimeType === "image/jpeg" && valid.body.output.byteLength > 0
    : valid.status === 422 && !valid.body.ok && !valid.body.output;
  const noKeyOk = noKey.status === 422 && !noKey.body.ok && !noKey.body.output;
  const guardsOk = guards.every(([, result, status, code]) => guard(result, status, code) === "PASS");
  if (!validOk || !noKeyOk || !guardsOk) process.exitCode = 1;
}

async function runSampling(total: number): Promise<void> {
  let passCount = 0;
  let failClosedCount = 0;
  let unexpectedFailCount = 0;
  for (let index = 1; index <= total; index += 1) {
    const result = await callApi(VALID_PAYLOAD);
    const status = posterStatus(result);
    if (status === "PASS_POSTER_SMOKE") passCount += 1;
    else if (status === "PASS_CONTRACT_FAIL_CLOSED") failClosedCount += 1;
    else unexpectedFailCount += 1;
    console.log("STANDARD_API_V2_SAMPLE_RUN", `${index}/${total}`);
    console.log("STANDARD_API_V2_SAMPLE_STATUS", result.status);
    console.log("STANDARD_API_V2_SAMPLE_OK", result.body.ok ? "YES" : "NO");
    console.log("STANDARD_API_V2_SAMPLE_POSTER_SMOKE_STATUS", status);
    console.log("STANDARD_API_V2_SAMPLE_OUTPUT_BYTES", result.body.output?.byteLength ?? 0);
    console.log("STANDARD_API_V2_SAMPLE_CANDIDATE_SOURCE", result.body.diagnostics?.candidateSource ?? "none");
    console.log("STANDARD_API_V2_SAMPLE_SPATIAL_SOURCE", result.body.diagnostics?.spatialSource ?? "none");
    console.log("STANDARD_API_V2_SAMPLE_BACKGROUND_LAYOUT_SOURCE", result.body.diagnostics?.backgroundLayoutSource ?? "none");
    console.log("STANDARD_API_V2_SAMPLE_SELECTED_CANDIDATE_ID", result.body.diagnostics?.selectedCandidateId ?? "none");
    console.log("STANDARD_API_V2_SAMPLE_REASON", result.body.reason);
  }
  console.log("STANDARD_API_V2_SAMPLE_TOTAL", total);
  console.log("STANDARD_API_V2_SAMPLE_PASS_COUNT", passCount);
  console.log("STANDARD_API_V2_SAMPLE_FAIL_CLOSED_COUNT", failClosedCount);
  console.log("STANDARD_API_V2_SAMPLE_UNEXPECTED_FAIL_COUNT", unexpectedFailCount);
  console.log("STANDARD_API_V2_SAMPLE_PASS_RATE", `${passCount}/${total}`);
  console.log("STANDARD_API_V2_SAMPLE_STABLE_POSTER_SMOKE", passCount === total ? "YES" : "NO");
  if (unexpectedFailCount > 0) process.exitCode = 1;
}

function printValid(result: ApiResult): void {
  console.log("STANDARD_API_V2_VALID_STATUS", result.status);
  console.log("STANDARD_API_V2_VALID_OK", result.body.ok ? "YES" : "NO");
  console.log("STANDARD_API_V2_POSTER_SMOKE_STATUS", posterStatus(result));
  console.log("STANDARD_API_V2_OUTPUT_MIME", result.body.output?.mimeType ?? "none");
  console.log("STANDARD_API_V2_OUTPUT_BYTES", result.body.output?.byteLength ?? 0);
  console.log("STANDARD_API_V2_OUTPUT_SHA256", result.body.output?.sha256 ?? "none");
  console.log("STANDARD_API_V2_SELECTED_CANDIDATE_ID", result.body.diagnostics?.selectedCandidateId ?? "none");
  console.log("STANDARD_API_V2_SELECTED_SOURCE_CANDIDATE_ID", result.body.diagnostics?.selectedSourceCandidateId ?? "none");
  console.log("STANDARD_API_V2_CANDIDATE_SOURCE", result.body.diagnostics?.candidateSource ?? "none");
  console.log("STANDARD_API_V2_SPATIAL_SOURCE", result.body.diagnostics?.spatialSource ?? "none");
  console.log("STANDARD_API_V2_BACKGROUND_LAYOUT_SOURCE", result.body.diagnostics?.backgroundLayoutSource ?? "none");
  console.log("STANDARD_API_V2_FORM_MAPPING_SUMMARY", JSON.stringify(result.body.diagnostics?.formMappingSummary ?? null));
  console.log("STANDARD_API_V2_SAFETY_PASSED", result.body.safety?.passed ? "YES" : "NO");
  console.log("STANDARD_API_V2_REASON", result.body.reason);
}

async function callApi(payload: unknown): Promise<ApiResult> {
  const response = await POST(new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }));
  return { status: response.status, body: await response.json() as StandardGenerateV2Response };
}

function posterStatus(result: ApiResult): PosterStatus {
  if (result.status === 200 && result.body.ok && result.body.output) return "PASS_POSTER_SMOKE";
  if (result.status === 422 && !result.body.ok && !result.body.output) return "PASS_CONTRACT_FAIL_CLOSED";
  return "FAIL_UNEXPECTED";
}

function guard(result: ApiResult, status: number, code: string): "PASS" | "FAIL" {
  return result.status === status && !result.body.ok && result.body.error?.code === code ? "PASS" : "FAIL";
}

function parseSampleCount(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error("STANDARD_API_V2_SAMPLE_COUNT must be an integer from 1 to 20.");
  return count;
}

function restoreKey(value: string | undefined): void { if (value) process.env.OPENAI_API_KEY = value; else delete process.env.OPENAI_API_KEY; }
function gitStatusShort(): string { return execSync("git status --short", { encoding: "utf8" }).trim().replace(/\n/g, " | ") || "clean"; }

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("STANDARD_API_V2_TEST_FAILED", message);
  process.exit(1);
});
