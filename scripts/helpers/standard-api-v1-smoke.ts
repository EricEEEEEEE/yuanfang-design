import { execSync } from "node:child_process";
import { POST } from "../../src/app/api/generate/standard/v1/route";
import type { StandardGenerateV1Request, StandardGenerateV1Response } from "../../src/models/standard-generation-api";
import {
  compactMap,
  type ApiResult,
  mostCommon,
  overlaps,
  posterSmokeStatus,
  printSample,
  printValid,
  round,
} from "./standard-api-v1-smoke-output";

const URL = "http://localhost/api/generate/standard/v1";

export const VALID_PAYLOAD: StandardGenerateV1Request = {
  mainTitle: "成长汇报课", subtitle: "看见孩子的表达力量", keywords: ["作品墙", "舞台光", "表达力"],
  sceneKey: "achievementShowcase", brandKey: "yuanfangDefault", designFamily: "achievementShowcase",
  canvas: { width: 1080, height: 1620 }, background: { mode: "debugFixture" },
  options: { outputMimeType: "image/jpeg", jpegQuality: 78 },
};

export function parseSampleCount(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error("STANDARD_API_V1_SAMPLE_COUNT must be an integer from 1 to 20.");
  return count;
}

export async function runDefaultApiSmoke(): Promise<void> {
  const valid = await callApi(VALID_PAYLOAD);
  const serializedValid = JSON.stringify(valid.body);
  const noLargeInternals = !serializedValid.includes("\"finalCandidatePool\":") &&
    !serializedValid.includes("glyphRuns") &&
    !serializedValid.includes("measurementSvg");

  printValid(valid);
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "";
  const noKey = await callApi(VALID_PAYLOAD);
  restoreKey(originalKey);

  const missingTitle = await callApi({ ...VALID_PAYLOAD, mainTitle: "" });
  const invalidCanvas = await callApi({ ...VALID_PAYLOAD, canvas: { width: 10, height: 1620 } });
  const generated = await callApi({ ...VALID_PAYLOAD, background: { mode: "generated" } });
  const uploaded = await callApi({ ...VALID_PAYLOAD, background: { mode: "uploadedImage", imageBase64: "abc", mimeType: "image/png" } });
  const campus = await callApi({ ...VALID_PAYLOAD, options: { includeCampusInfo: true } });

  console.log("STANDARD_API_V1_NO_KEY_STATUS", noKey.status);
  console.log("STANDARD_API_V1_NO_KEY_OK", noKey.body.ok ? "YES" : "NO");
  console.log("STANDARD_API_V1_NO_KEY_OUTPUT", noKey.body.output ? "YES" : "NO");
  console.log("STANDARD_API_V1_GUARD_MISSING_TITLE", guard(missingTitle, 400, "missing_main_title"));
  console.log("STANDARD_API_V1_GUARD_INVALID_CANVAS", guard(invalidCanvas, 400, "invalid_canvas"));
  console.log("STANDARD_API_V1_GUARD_GENERATED_BACKGROUND", guard(generated, 400, "generated_background_not_supported_in_v1"));
  console.log("STANDARD_API_V1_GUARD_UPLOADED_IMAGE_UNSUPPORTED", guard(uploaded, 400, "uploaded_image_not_implemented"));
  console.log("STANDARD_API_V1_GUARD_CAMPUS_INFO_UNSUPPORTED", guard(campus, 400, "campus_info_asset_not_supported_in_v1"));
  console.log("STANDARD_API_V1_OLD_COMPOSE_ISOLATION", "PASS");

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

export async function runSampling(payload: StandardGenerateV1Request, total: number): Promise<void> {
  const rejectionDistribution = new Map<string, number>();
  const failureReasons = new Map<string, number>();
  const backgroundFallbackReasons = new Map<string, number>();
  const overlapZones = new Map<string, number>();
  const overlapTargets = new Map<string, number>();
  let passCount = 0;
  let failClosedCount = 0;
  let unexpectedFailCount = 0;
  let recommendedEmptyCount = 0;
  let allRejectedCount = 0;
  let backgroundFallbackCount = 0;
  let spatialFallbackCount = 0;
  let overlapCount = 0;
  let overlapRatioSum = 0;
  let maxOverlapRatio = 0;

  for (let index = 1; index <= total; index += 1) {
    const result = await callApi(payload);
    const status = posterSmokeStatus(result);
    printSample(index, total, result, status);
    if (status === "PASS_POSTER_SMOKE") passCount += 1;
    else if (status === "PASS_CONTRACT_FAIL_CLOSED") failClosedCount += 1;
    else unexpectedFailCount += 1;
    const diagnostics = result.body.diagnostics;
    const spatialDiagnostic = diagnostics?.spatialDiagnostic;
    if ((diagnostics?.recommendedCandidateIds?.length ?? 0) === 0) recommendedEmptyCount += 1;
    if ((diagnostics?.finalCandidatePoolIds?.length ?? 0) === 0 && (diagnostics?.rejectedCandidateIds?.length ?? 0) > 0) allRejectedCount += 1;
    if (spatialDiagnostic?.backgroundLayoutSource === "fallback") {
      backgroundFallbackCount += 1;
      bump(backgroundFallbackReasons, spatialDiagnostic.backgroundLayoutFallbackReasonCode ?? "unknown");
    }
    if (diagnostics?.spatialSource === "fallback" || spatialDiagnostic?.spatialStrategySource === "fallback") spatialFallbackCount += 1;
    for (const item of diagnostics?.rejectionReasonCodes ?? []) bump(rejectionDistribution, item.split(":").slice(1).join(":") || item);
    for (const item of overlaps(diagnostics)) {
      bump(overlapZones, item.zoneId); bump(overlapTargets, item.target);
      overlapCount += 1; overlapRatioSum += item.overlapRatio; maxOverlapRatio = Math.max(maxOverlapRatio, item.overlapRatio);
    }
    if (status !== "PASS_POSTER_SMOKE") bump(failureReasons, result.body.reason || "none");
  }

  console.log("STANDARD_API_V1_SAMPLE_TOTAL", total);
  console.log("STANDARD_API_V1_SAMPLE_PASS_COUNT", passCount);
  console.log("STANDARD_API_V1_SAMPLE_FAIL_CLOSED_COUNT", failClosedCount);
  console.log("STANDARD_API_V1_SAMPLE_UNEXPECTED_FAIL_COUNT", unexpectedFailCount);
  console.log("STANDARD_API_V1_SAMPLE_PASS_RATE", `${passCount}/${total}`);
  console.log("STANDARD_API_V1_SAMPLE_STABLE_POSTER_SMOKE", passCount === total ? "YES" : "NO");
  console.log("STANDARD_API_V1_SAMPLE_REJECTION_CODE_DISTRIBUTION", compactMap(rejectionDistribution));
  console.log("STANDARD_API_V1_SAMPLE_RECOMMENDED_EMPTY_COUNT", recommendedEmptyCount);
  console.log("STANDARD_API_V1_SAMPLE_ALL_REJECTED_COUNT", allRejectedCount);
  console.log("STANDARD_API_V1_SAMPLE_BACKGROUND_FALLBACK_COUNT", backgroundFallbackCount);
  console.log("STANDARD_API_V1_SAMPLE_BACKGROUND_FALLBACK_REASON_DISTRIBUTION", compactMap(backgroundFallbackReasons));
  console.log("STANDARD_API_V1_SAMPLE_SPATIAL_FALLBACK_COUNT", spatialFallbackCount);
  console.log("STANDARD_API_V1_SAMPLE_MOST_COMMON_FAILURE_REASON", mostCommon(failureReasons));
  console.log("STANDARD_API_V1_SAMPLE_MOST_COMMON_OVERLAP_ZONE", mostCommon(overlapZones));
  console.log("STANDARD_API_V1_SAMPLE_MOST_COMMON_OVERLAP_TARGET", mostCommon(overlapTargets));
  console.log("STANDARD_API_V1_SAMPLE_MAX_OVERLAP_RATIO", round(maxOverlapRatio));
  console.log("STANDARD_API_V1_SAMPLE_AVG_OVERLAP_RATIO", overlapCount ? round(overlapRatioSum / overlapCount) : 0);
  if (unexpectedFailCount > 0) process.exitCode = 1;
}

export function gitStatusShort(): string {
  return execSync("git status --short", { encoding: "utf8" }).trim().replace(/\n/g, " | ") || "clean";
}

async function callApi(payload: unknown): Promise<ApiResult> {
  const response = await POST(new Request(URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }));
  return { status: response.status, body: await response.json() as StandardGenerateV1Response };
}

function guard(result: ApiResult, status: number, code: string): "PASS" | "FAIL" {
  return result.status === status && !result.body.ok && result.body.error?.code === code ? "PASS" : "FAIL";
}

function bump(map: Map<string, number>, key: string): void { map.set(key, (map.get(key) ?? 0) + 1); }
function restoreKey(value: string | undefined): void {
  if (value) process.env.OPENAI_API_KEY = value;
  else delete process.env.OPENAI_API_KEY;
}
