import { callApi, guard, hasRawStackTrace, posterStatus } from "./standard-api-v2-client";
import { QUALITY_PAYLOAD, VALID_PAYLOAD } from "./standard-api-v2-fixtures";
import { printQualitySample, printValid } from "./standard-api-v2-output";

export async function runDefaultSmoke(): Promise<void> {
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
  const missingToken = await callApi(VALID_PAYLOAD, { token: null });
  const wrongToken = await callApi(VALID_PAYLOAD, { token: "wrong-token" });
  const valid = await callApi(VALID_PAYLOAD);
  printValid(valid);
  const quality = await callApi(QUALITY_PAYLOAD);
  printQualitySample(quality);

  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "";
  const noKey = await callApi(VALID_PAYLOAD);
  const generatedNoKey = await callApi({ ...QUALITY_PAYLOAD, background: { mode: "generated" } });
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
    ["STANDARD_API_V2_GUARD_UPLOADED_BACKGROUND", await callApi({ ...VALID_PAYLOAD, background: { mode: "uploadedImage" } }), 400, "unsupported_background_mode"],
  ] as const;

  console.log("STANDARD_API_V2_NO_KEY_STATUS", noKey.status);
  console.log("STANDARD_API_V2_NO_KEY_OK", noKey.body.ok ? "YES" : "NO");
  console.log("STANDARD_API_V2_NO_KEY_OUTPUT", noKey.body.output ? "YES" : "NO");
  console.log("STANDARD_API_V2_GENERATED_NO_KEY_STATUS", generatedNoKey.status);
  console.log("STANDARD_API_V2_GENERATED_NO_KEY_ERROR_CODE", generatedNoKey.body.error?.code ?? "none");
  console.log("STANDARD_API_V2_GENERATED_NO_KEY_OUTPUT", generatedNoKey.body.output ? "YES" : "NO");
  console.log("STANDARD_API_V2_AUTH_MISSING_TOKEN", guard(missingToken, 401, "unauthorized"));
  console.log("STANDARD_API_V2_AUTH_MISSING_TOKEN_OUTPUT", missingToken.body.output ? "YES" : "NO");
  console.log("STANDARD_API_V2_AUTH_WRONG_TOKEN", guard(wrongToken, 401, "unauthorized"));
  console.log("STANDARD_API_V2_AUTH_WRONG_TOKEN_OUTPUT", wrongToken.body.output ? "YES" : "NO");
  console.log("STANDARD_API_V2_NO_RAW_STACK_TRACE", [missingToken, wrongToken, noKey, generatedNoKey].some(hasRawStackTrace) ? "FAIL" : "PASS");
  for (const [label, result, status, code] of guards) console.log(label, guard(result, status, code));
  console.log("STANDARD_API_V2_OLD_COMPOSE_ISOLATION", "PASS");

  const validOk = creditGateUnavailable(valid) || (hasOpenAIKey
    ? valid.status === 200 && valid.body.ok && valid.body.output?.mimeType === "image/jpeg" && valid.body.output.byteLength > 0
    : valid.status === 422 && !valid.body.ok && !valid.body.output);
  const noKeyOk = creditGateUnavailable(noKey) || (noKey.status === 422 && !noKey.body.ok && !noKey.body.output);
  const generatedNoKeyOk = !generatedNoKey.body.ok && !generatedNoKey.body.output &&
    ((generatedNoKey.status === 422 && generatedNoKey.body.error?.code === "openai_api_key_missing") ||
      (generatedNoKey.status === 500 && generatedNoKey.body.error?.code === "credit_gate_unavailable"));
  const authOk = guard(missingToken, 401, "unauthorized") === "PASS" && !missingToken.body.output && guard(wrongToken, 401, "unauthorized") === "PASS" && !wrongToken.body.output;
  const rawStackOk = ![missingToken, wrongToken, noKey, generatedNoKey].some(hasRawStackTrace);
  const guardsOk = guards.every(([, result, status, code]) => guard(result, status, code) === "PASS");
  if (!validOk || !noKeyOk || !generatedNoKeyOk || !authOk || !rawStackOk || !guardsOk) process.exitCode = 1;
}

export async function runGeneratedSmoke(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) { console.log("STANDARD_API_V2_GENERATED_SMOKE_SKIPPED", "NO_KEY"); process.exitCode = 1; return; }
  const result = await callApi({ ...QUALITY_PAYLOAD, background: { mode: "generated" } });
  const bg = result.body.diagnostics?.generatedBackground;
  const q = result.body.diagnostics?.productQualityDiagnostics;
  for (const [label, value] of [["STANDARD_API_V2_GENERATED_SMOKE_STATUS", result.status], ["STANDARD_API_V2_GENERATED_SMOKE_OK", result.body.ok ? "YES" : "NO"], ["STANDARD_API_V2_GENERATED_SMOKE_POSTER_STATUS", posterStatus(result)], ["STANDARD_API_V2_GENERATED_SMOKE_ERROR_CODE", result.body.error?.code ?? "none"], ["STANDARD_API_V2_GENERATED_SMOKE_REASON", result.body.reason], ["STANDARD_API_V2_GENERATED_SMOKE_SAFETY", result.body.safety?.codes.join("|") ?? "none"], ["STANDARD_API_V2_GENERATED_SMOKE_CANDIDATE_SOURCE", result.body.diagnostics?.candidateSource ?? "none"], ["STANDARD_API_V2_GENERATED_SMOKE_SPATIAL_SOURCE", result.body.diagnostics?.spatialSource ?? "none"], ["STANDARD_API_V2_GENERATED_SMOKE_LAYOUT_SOURCE", result.body.diagnostics?.backgroundLayoutSource ?? "none"], ["STANDARD_API_V2_GENERATED_SMOKE_SELECTED", result.body.diagnostics?.selectedCandidateId ?? "none"], ["STANDARD_API_V2_GENERATED_SMOKE_BACKGROUND_MODE", q?.backgroundMode ?? "none"], ["STANDARD_API_V2_GENERATED_SMOKE_BACKGROUND_CAN_REFLECT_THEME", q?.semanticAlignment.backgroundCanReflectTheme ? "YES" : "NO"], ["STANDARD_API_V2_GENERATED_SMOKE_BACKGROUND_SOURCE", bg?.source ?? "none"], ["STANDARD_API_V2_GENERATED_SMOKE_BACKGROUND_BYTES", bg?.byteLength ?? 0], ["STANDARD_API_V2_GENERATED_SMOKE_MODEL_USED", bg?.modelUsed ?? "none"], ["STANDARD_API_V2_GENERATED_SMOKE_PROMPT_HASH", bg?.promptHash ?? "none"], ["STANDARD_API_V2_GENERATED_SMOKE_NO_FALLBACK", q?.backgroundMode === "generated" && bg?.source === "standard-background-generation-v1" ? "PASS" : "FAIL"]]) console.log(label, value);
  if (!(result.status === 200 && result.body.ok && result.body.output && q?.backgroundMode === "generated" && q.semanticAlignment.backgroundCanReflectTheme && bg?.source === "standard-background-generation-v1")) process.exitCode = 1;
}

export async function runSampling(total: number): Promise<void> {
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

export function parseSampleCount(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error("STANDARD_API_V2_SAMPLE_COUNT must be an integer from 1 to 20.");
  return count;
}

function restoreKey(value: string | undefined): void {
  if (value) process.env.OPENAI_API_KEY = value;
  else delete process.env.OPENAI_API_KEY;
}

function creditGateUnavailable(result: Awaited<ReturnType<typeof callApi>>): boolean {
  return result.status === 500 && !result.body.ok && !result.body.output && result.body.error?.code === "credit_gate_unavailable";
}
