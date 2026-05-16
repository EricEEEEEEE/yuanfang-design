import type { StandardGenerateV2Diagnostics } from "@/models/standard-generation-api-v2";
import type { generateStandardPoster } from "@/use-cases/generate-standard-poster.use-case";

type StandardPosterResult = Awaited<ReturnType<typeof generateStandardPoster>>;

export function buildV2Diagnostics(
  result: StandardPosterResult,
  assetWarnings: string[],
  formMappingSummary: Record<string, unknown>,
): StandardGenerateV2Diagnostics {
  const layout = result.titleCandidatePipelineResult?.candidateResult.spatialStrategy.backgroundLayout;
  return {
    selectedCandidateId: result.selectedCandidateId,
    selectedSourceCandidateId: result.selectedSourceCandidateId,
    candidateSource: result.diagnostics.candidatePipelineSource,
    spatialSource: result.diagnostics.spatialStrategySource,
    backgroundLayoutSource: layout?.source,
    formMappingSummary,
    warnings: [...assetWarnings, ...result.warnings],
  };
}

export function backgroundFallbackCode(result: StandardPosterResult): string | undefined {
  return result.titleCandidatePipelineResult?.candidateResult.spatialStrategy.backgroundLayout.diagnostics?.fallbackReasonCode;
}
