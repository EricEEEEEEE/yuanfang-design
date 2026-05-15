import type { StandardGenerateV1Response } from "../../src/models/standard-generation-api";

export type PosterSmokeStatus = "PASS_POSTER_SMOKE" | "PASS_CONTRACT_FAIL_CLOSED" | "FAIL_UNEXPECTED";
export type ApiResult = { status: number; body: StandardGenerateV1Response };

export function printValid(result: ApiResult): void {
  const output = result.body.output;
  const diagnostics = result.body.diagnostics;
  console.log("STANDARD_API_V1_VALID_STATUS", result.status);
  console.log("STANDARD_API_V1_VALID_OK", result.body.ok ? "YES" : "NO");
  console.log("STANDARD_API_V1_POSTER_SMOKE_STATUS", posterSmokeStatus(result));
  console.log("STANDARD_API_V1_CANDIDATE_SOURCE", diagnostics?.candidateSource ?? "none");
  console.log("STANDARD_API_V1_SPATIAL_SOURCE", diagnostics?.spatialSource ?? "none");
  console.log("STANDARD_API_V1_PIPELINE_SOURCE", diagnostics?.pipelineSource ?? "none");
  console.log("STANDARD_API_V1_BACKGROUND_LAYOUT_SOURCE", diagnostics?.spatialDiagnostic?.backgroundLayoutSource ?? "none");
  console.log("STANDARD_API_V1_BACKGROUND_LAYOUT_REASON", diagnostics?.spatialDiagnostic?.backgroundLayoutReason ?? "none");
  console.log("STANDARD_API_V1_BACKGROUND_LAYOUT_FALLBACK_REASON_CODE", diagnostics?.spatialDiagnostic?.backgroundLayoutFallbackReasonCode ?? "none");
  console.log("STANDARD_API_V1_BACKGROUND_LAYOUT_FALLBACK_REASON", diagnostics?.spatialDiagnostic?.backgroundLayoutFallbackReason ?? "none");
  console.log("STANDARD_API_V1_SPATIAL_STRATEGY_REASON", diagnostics?.spatialDiagnostic?.spatialStrategyReason ?? "none");
  console.log("STANDARD_API_V1_SPATIAL_PRIMARY_ANCHOR", diagnostics?.spatialDiagnostic?.primaryTextAnchorId ?? "none");
  console.log("STANDARD_API_V1_SPATIAL_NEGATIVE_SPACE", diagnostics?.spatialDiagnostic?.negativeSpaceShape ?? "none");
  console.log("STANDARD_API_V1_SPATIAL_SAFE_ZONES", spatialItems(diagnostics?.spatialDiagnostic?.safeZones));
  console.log("STANDARD_API_V1_SPATIAL_FORBIDDEN_ZONES", spatialItems(diagnostics?.spatialDiagnostic?.forbiddenZones));
  console.log("STANDARD_API_V1_SPATIAL_TEXT_ANCHORS", spatialItems(diagnostics?.spatialDiagnostic?.textAnchors));
  console.log("STANDARD_API_V1_CANDIDATE_BOX_SUMMARY", candidateBoxSummary(diagnostics));
  console.log("STANDARD_API_V1_FORBIDDEN_OVERLAP_SUMMARY", overlapSummary(diagnostics));
  console.log("STANDARD_API_V1_FINAL_POOL_IDS", diagnostics?.finalCandidatePoolIds?.join(",") || "none");
  console.log("STANDARD_API_V1_RECOMMENDED_IDS", diagnostics?.recommendedCandidateIds?.join(",") || "none");
  console.log("STANDARD_API_V1_REJECTED_IDS", diagnostics?.rejectedCandidateIds?.join(",") || "none");
  console.log("STANDARD_API_V1_REJECTION_REASON_CODES", diagnostics?.rejectionReasonCodes?.join(",") || "none");
  console.log("STANDARD_API_V1_OUTPUT_MIME", output?.mimeType ?? "none");
  console.log("STANDARD_API_V1_OUTPUT_BYTES", output?.byteLength ?? 0);
  console.log("STANDARD_API_V1_OUTPUT_SHA256", output?.sha256 ?? "none");
  console.log("STANDARD_API_V1_OUTPUT_BASE64_LENGTH", output?.base64.length ?? 0);
  console.log("STANDARD_API_V1_SELECTED_CANDIDATE_ID", diagnostics?.selectedCandidateId ?? "none");
  console.log("STANDARD_API_V1_SELECTED_SOURCE_CANDIDATE_ID", diagnostics?.selectedSourceCandidateId ?? "none");
  console.log("STANDARD_API_V1_LAYER_ORDER", diagnostics?.layerOrder?.join(">") ?? "none");
  console.log("STANDARD_API_V1_SAFETY_PASSED", result.body.safety?.passed ? "YES" : "NO");
  console.log("STANDARD_API_V1_REASON", result.body.reason);
}

export function printSample(index: number, total: number, result: ApiResult, status: PosterSmokeStatus): void {
  const output = result.body.output;
  const diagnostics = result.body.diagnostics;
  console.log("STANDARD_API_V1_SAMPLE_RUN", `${index}/${total}`);
  console.log("STANDARD_API_V1_SAMPLE_STATUS", result.status);
  console.log("STANDARD_API_V1_SAMPLE_OK", result.body.ok ? "YES" : "NO");
  console.log("STANDARD_API_V1_SAMPLE_POSTER_SMOKE_STATUS", status);
  console.log("STANDARD_API_V1_SAMPLE_OUTPUT_BYTES", output?.byteLength ?? 0);
  console.log("STANDARD_API_V1_SAMPLE_OUTPUT_SHA256", output?.sha256 ?? "none");
  console.log("STANDARD_API_V1_SAMPLE_CANDIDATE_SOURCE", diagnostics?.candidateSource ?? "none");
  console.log("STANDARD_API_V1_SAMPLE_SPATIAL_SOURCE", diagnostics?.spatialSource ?? "none");
  console.log("STANDARD_API_V1_SAMPLE_PIPELINE_SOURCE", diagnostics?.pipelineSource ?? "none");
  console.log("STANDARD_API_V1_SAMPLE_BACKGROUND_LAYOUT_SOURCE", diagnostics?.spatialDiagnostic?.backgroundLayoutSource ?? "none");
  console.log("STANDARD_API_V1_SAMPLE_BACKGROUND_LAYOUT_FALLBACK_REASON_CODE", diagnostics?.spatialDiagnostic?.backgroundLayoutFallbackReasonCode ?? "none");
  console.log("STANDARD_API_V1_SAMPLE_BACKGROUND_LAYOUT_FALLBACK_REASON", diagnostics?.spatialDiagnostic?.backgroundLayoutFallbackReason ?? "none");
  console.log("STANDARD_API_V1_SAMPLE_SPATIAL_STRATEGY_REASON", diagnostics?.spatialDiagnostic?.spatialStrategyReason ?? "none");
  console.log("STANDARD_API_V1_SAMPLE_PRIMARY_ANCHOR", diagnostics?.spatialDiagnostic?.primaryTextAnchorId ?? "none");
  console.log("STANDARD_API_V1_SAMPLE_SAFE_ZONES", spatialItems(diagnostics?.spatialDiagnostic?.safeZones));
  console.log("STANDARD_API_V1_SAMPLE_FORBIDDEN_ZONES", spatialItems(diagnostics?.spatialDiagnostic?.forbiddenZones));
  console.log("STANDARD_API_V1_SAMPLE_CANDIDATE_BOX_SUMMARY", candidateBoxSummary(diagnostics));
  console.log("STANDARD_API_V1_SAMPLE_FORBIDDEN_OVERLAP_SUMMARY", overlapSummary(diagnostics));
  console.log("STANDARD_API_V1_SAMPLE_FINAL_POOL_IDS", diagnostics?.finalCandidatePoolIds?.join(",") || "none");
  console.log("STANDARD_API_V1_SAMPLE_RECOMMENDED_IDS", diagnostics?.recommendedCandidateIds?.join(",") || "none");
  console.log("STANDARD_API_V1_SAMPLE_REJECTED_IDS", diagnostics?.rejectedCandidateIds?.join(",") || "none");
  console.log("STANDARD_API_V1_SAMPLE_REJECTION_CODES", diagnostics?.rejectionReasonCodes?.join(",") || "none");
  console.log("STANDARD_API_V1_SAMPLE_SELECTED_CANDIDATE_ID", diagnostics?.selectedCandidateId ?? "none");
  console.log("STANDARD_API_V1_SAMPLE_SELECTED_SOURCE_CANDIDATE_ID", diagnostics?.selectedSourceCandidateId ?? "none");
  console.log("STANDARD_API_V1_SAMPLE_REASON", result.body.reason);
}

export function posterSmokeStatus(result: ApiResult): PosterSmokeStatus {
  if (result.status === 200 && result.body.ok && result.body.output) return "PASS_POSTER_SMOKE";
  if (result.status === 422 && !result.body.ok && !result.body.output) return "PASS_CONTRACT_FAIL_CLOSED";
  return "FAIL_UNEXPECTED";
}

export function overlaps(diagnostics?: StandardGenerateV1Response["diagnostics"]): Array<{ candidateId: string; zoneId: string; target: string; text?: string; overlapRatio: number }> {
  return diagnostics?.candidateDiagnostics?.flatMap((candidate) =>
    candidate.forbiddenOverlapSummary?.map((item) => ({ candidateId: candidate.candidateId, zoneId: item.zoneId, target: item.target, text: item.text, overlapRatio: item.overlapRatio })) ?? []
  ) ?? [];
}

export function compactMap(map: Map<string, number>): string {
  return map.size ? JSON.stringify(Object.fromEntries([...map.entries()].sort())) : "none";
}

export function mostCommon(map: Map<string, number>): string {
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";
}

export function round(input: number): number {
  return Math.round(input * 10000) / 10000;
}

function spatialItems(items?: Array<{ id: string; x: number; y: number; width: number; height: number; reasonType?: string; shape?: string; preferredOrientation?: string }>): string {
  return items?.map((item) => `${item.id}:${item.x},${item.y},${item.width},${item.height}:${item.reasonType ?? item.shape ?? item.preferredOrientation ?? "na"}`).join("|") || "none";
}

function candidateBoxSummary(diagnostics?: StandardGenerateV1Response["diagnostics"]): string {
  return diagnostics?.candidateDiagnostics?.map((item) => `${item.candidateId}->${item.sourceCandidateId}:${item.recommendedAction}:${item.rejectionReasonCode}:${item.lockupBox ? `${item.lockupBox.x},${item.lockupBox.y},${item.lockupBox.width},${item.lockupBox.height}` : "noBox"}`).join("|") || "none";
}

function overlapSummary(diagnostics?: StandardGenerateV1Response["diagnostics"]): string {
  return overlaps(diagnostics).map((item) => `${item.candidateId}:${item.zoneId}:${item.target}${item.text ? `:${item.text}` : ""}:${item.overlapRatio}`).join("|") || "none";
}
