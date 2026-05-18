import { type ApiResult, posterStatus } from "./standard-api-v2-client";

export function printValid(result: ApiResult): void {
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
  printQuality("STANDARD_API_V2", result);
  console.log("STANDARD_API_V2_SAFETY_PASSED", result.body.safety?.passed ? "YES" : "NO");
  console.log("STANDARD_API_V2_REASON", result.body.reason);
}

export function printQualitySample(result: ApiResult): void {
  console.log("STANDARD_API_V2_QUALITY_SAMPLE_STATUS", result.status);
  console.log("STANDARD_API_V2_QUALITY_SAMPLE_OK", result.body.ok ? "YES" : "NO");
  console.log("STANDARD_API_V2_QUALITY_SAMPLE_POSTER_SMOKE_STATUS", posterStatus(result));
  printQuality("STANDARD_API_V2_QUALITY_SAMPLE", result);
}

function printQuality(prefix: string, result: ApiResult): void {
  const q = result.body.diagnostics?.productQualityDiagnostics;
  console.log(`${prefix}_OUTPUT_QUALITY_MODE`, q?.outputQualityMode ?? "none");
  console.log(`${prefix}_BACKGROUND_MODE`, q?.backgroundMode ?? "none");
  console.log(`${prefix}_BACKGROUND_CAN_REFLECT_THEME`, q?.semanticAlignment.backgroundCanReflectTheme ? "YES" : "NO");
  console.log(`${prefix}_VISUAL_HOOK`, q?.visualHook.detectedPrimaryHook ?? "none");
  console.log(`${prefix}_DETECTED_PRIMARY_MESSAGE`, q?.visualHook.detectedPrimaryMessage ?? "none");
  console.log(`${prefix}_VISUAL_HOOK_SOURCE`, q?.visualHook.source ?? "none");
  console.log(`${prefix}_VISUAL_HOOK_HOOK_SOURCE`, q?.visualHook.hookSource ?? "none");
  console.log(`${prefix}_VISUAL_HOOK_MISMATCH`, q?.visualHook.possibleMismatch ? "YES" : "NO");
  console.log(`${prefix}_TITLE_HIERARCHY_RISK`, q?.visualHook.titleHierarchyRisk ?? "none");
  console.log(`${prefix}_FORM_FIELD_CONSUMPTION`, JSON.stringify(q?.formFieldConsumption ?? null));
  console.log(`${prefix}_PRODUCT_QUALITY_WARNINGS`, JSON.stringify(q?.warnings ?? []));
}
