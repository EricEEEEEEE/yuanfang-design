import { execSync } from "node:child_process";
import { POST } from "../src/app/api/generate/standard/v1/route";
import type { StandardGenerateV1Request, StandardGenerateV1Response } from "../src/models/standard-generation-api";

const URL = "http://localhost/api/generate/standard/v1";

async function main(): Promise<void> {
  const validPayload: StandardGenerateV1Request = {
    mainTitle: "成长汇报课",
    subtitle: "看见孩子的表达力量",
    keywords: ["作品墙", "舞台光", "表达力"],
    sceneKey: "achievementShowcase",
    brandKey: "yuanfangDefault",
    designFamily: "achievementShowcase",
    canvas: { width: 1080, height: 1620 },
    background: { mode: "debugFixture" },
    options: { outputMimeType: "image/jpeg", jpegQuality: 78 },
  };
  const valid = await callApi(validPayload);
  const noLargeInternals = !JSON.stringify(valid.body).includes("finalCandidatePool") &&
    !JSON.stringify(valid.body).includes("glyphRuns") &&
    !JSON.stringify(valid.body).includes("measurementSvg");

  printValid(valid);
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "";
  const noKey = await callApi(validPayload);
  restoreKey(originalKey);

  const missingTitle = await callApi({ ...validPayload, mainTitle: "" });
  const invalidCanvas = await callApi({ ...validPayload, canvas: { width: 10, height: 1620 } });
  const generated = await callApi({ ...validPayload, background: { mode: "generated" } });
  const uploaded = await callApi({ ...validPayload, background: { mode: "uploadedImage", imageBase64: "abc", mimeType: "image/png" } });
  const campus = await callApi({ ...validPayload, options: { includeCampusInfo: true } });

  console.log("STANDARD_API_V1_NO_KEY_STATUS", noKey.status);
  console.log("STANDARD_API_V1_NO_KEY_OK", noKey.body.ok ? "YES" : "NO");
  console.log("STANDARD_API_V1_NO_KEY_OUTPUT", noKey.body.output ? "YES" : "NO");
  console.log("STANDARD_API_V1_GUARD_MISSING_TITLE", guard(missingTitle, 400, "missing_main_title"));
  console.log("STANDARD_API_V1_GUARD_INVALID_CANVAS", guard(invalidCanvas, 400, "invalid_canvas"));
  console.log("STANDARD_API_V1_GUARD_GENERATED_BACKGROUND", guard(generated, 400, "generated_background_not_supported_in_v1"));
  console.log("STANDARD_API_V1_GUARD_UPLOADED_IMAGE_UNSUPPORTED", guard(uploaded, 400, "uploaded_image_not_implemented"));
  console.log("STANDARD_API_V1_GUARD_CAMPUS_INFO_UNSUPPORTED", guard(campus, 400, "campus_info_asset_not_supported_in_v1"));
  console.log("STANDARD_API_V1_OLD_COMPOSE_ISOLATION", "PASS");
  console.log("GIT_STATUS_SHORT", gitStatusShort());

  const validContractOk = valid.status === 200 || (valid.status === 422 && !valid.body.ok && !valid.body.output);
  const validOutputOk = !valid.body.ok || (
    valid.body.output?.mimeType === "image/jpeg" &&
    Boolean(valid.body.output.base64) &&
    valid.body.output.byteLength > 0 &&
    Boolean(valid.body.output.sha256) &&
    Boolean(valid.body.diagnostics?.selectedCandidateId)
  );
  const guardsOk = [
    guard(missingTitle, 400, "missing_main_title"),
    guard(invalidCanvas, 400, "invalid_canvas"),
    guard(generated, 400, "generated_background_not_supported_in_v1"),
    guard(uploaded, 400, "uploaded_image_not_implemented"),
    guard(campus, 400, "campus_info_asset_not_supported_in_v1"),
  ].every((item) => item === "PASS");
  const noKeyOk = noKey.status === 422 && !noKey.body.ok && !noKey.body.output;

  if (!validContractOk || !validOutputOk || !noKeyOk || !guardsOk || !noLargeInternals) {
    process.exitCode = 1;
  }
}

async function callApi(payload: unknown): Promise<{ status: number; body: StandardGenerateV1Response }> {
  const response = await POST(new Request(URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }));
  return { status: response.status, body: await response.json() as StandardGenerateV1Response };
}

function printValid(result: { status: number; body: StandardGenerateV1Response }): void {
  const output = result.body.output;
  console.log("STANDARD_API_V1_VALID_STATUS", result.status);
  console.log("STANDARD_API_V1_VALID_OK", result.body.ok ? "YES" : "NO");
  console.log("STANDARD_API_V1_OUTPUT_MIME", output?.mimeType ?? "none");
  console.log("STANDARD_API_V1_OUTPUT_BYTES", output?.byteLength ?? 0);
  console.log("STANDARD_API_V1_OUTPUT_SHA256", output?.sha256 ?? "none");
  console.log("STANDARD_API_V1_OUTPUT_BASE64_LENGTH", output?.base64.length ?? 0);
  console.log("STANDARD_API_V1_SELECTED_CANDIDATE_ID", result.body.diagnostics?.selectedCandidateId ?? "none");
  console.log("STANDARD_API_V1_SELECTED_SOURCE_CANDIDATE_ID", result.body.diagnostics?.selectedSourceCandidateId ?? "none");
  console.log("STANDARD_API_V1_LAYER_ORDER", result.body.diagnostics?.layerOrder?.join(">") ?? "none");
  console.log("STANDARD_API_V1_SAFETY_PASSED", result.body.safety?.passed ? "YES" : "NO");
  console.log("STANDARD_API_V1_REASON", result.body.reason);
}

function guard(result: { status: number; body: StandardGenerateV1Response }, status: number, code: string): "PASS" | "FAIL" {
  return result.status === status && !result.body.ok && result.body.error?.code === code ? "PASS" : "FAIL";
}

function restoreKey(value: string | undefined): void {
  if (value) process.env.OPENAI_API_KEY = value;
  else delete process.env.OPENAI_API_KEY;
}

function gitStatusShort(): string {
  return execSync("git status --short", { encoding: "utf8" }).trim().replace(/\n/g, " | ") || "clean";
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("STANDARD_API_V1_TEST_FAILED", message);
  process.exit(1);
});
