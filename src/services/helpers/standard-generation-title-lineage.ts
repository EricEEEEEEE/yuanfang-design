import type { StandardGenerationCandidateLineage } from "@/models/standard-generation";
import type { GenerateScoredRefinedTitleCandidatesResult } from "@/use-cases/generate-scored-refined-title-candidates.use-case";

export function reviewStandardGenerationCandidateLineage(candidateId: string | undefined, pipeline: GenerateScoredRefinedTitleCandidatesResult): StandardGenerationCandidateLineage {
  const candidate = candidateId ? pipeline.finalCandidatePool.find((item) => item.candidateId === candidateId) : undefined;
  const sourceCandidateId = candidateId ? (pipeline.diagnostics.sourceCandidateIdMap[candidateId] ?? candidateId) : undefined;
  const sourceScore = sourceCandidateId ? pipeline.scoringResult.results.find((item) => item.candidateId === sourceCandidateId) : undefined;
  const fallback = Boolean(
    candidate?.isFallbackCandidate ||
    (candidateId && pipeline.diagnostics.fallbackCandidateIds.includes(candidateId)) ||
    (sourceCandidateId && pipeline.diagnostics.fallbackCandidateIds.includes(sourceCandidateId)),
  );
  const rejectedByDiagnostics = Boolean(
    (candidateId && pipeline.diagnostics.rejectedCandidateIds.includes(candidateId)) ||
    (sourceCandidateId && pipeline.diagnostics.rejectedCandidateIds.includes(sourceCandidateId)),
  );
  const rejectedByScore = Boolean(
    sourceScore?.shouldReject ||
    sourceScore?.recommendedAction === "reject" ||
    (sourceScore?.rejectionReasonCode && sourceScore.rejectionReasonCode !== "none"),
  );
  const sourceTraceable = Boolean(sourceCandidateId && sourceScore);
  const recommended = Boolean(candidateId && pipeline.recommendedCandidateIds.includes(candidateId));
  const inFinalPool = Boolean(candidate);
  const rejected = rejectedByDiagnostics || rejectedByScore;
  return {
    candidateId,
    sourceCandidateId,
    inFinalPool,
    recommended,
    fallback,
    rejected,
    sourceTraceable,
    sourceShouldReject: sourceScore?.shouldReject,
    sourceRecommendedAction: sourceScore?.recommendedAction,
    sourceRejectionReasonCode: sourceScore?.rejectionReasonCode,
    rejectionCode: lineageRejectionCode({ inFinalPool, recommended, fallback, sourceTraceable, rejectedByDiagnostics, sourceScore }),
    productionEligible: inFinalPool && recommended && !fallback && !rejected && sourceTraceable,
  };
}

export function handoffRetryRejection(lineage: StandardGenerationCandidateLineage): string | undefined {
  if (!lineage.inFinalPool) return "candidate_not_in_final_pool";
  if (lineage.fallback) return "fallback_candidate_not_retry_eligible";
  if (lineage.rejected) return "rejected_candidate_not_retry_eligible";
  if (!lineage.sourceTraceable) return "source_not_traceable";
  return undefined;
}

function lineageRejectionCode(input: {
  inFinalPool: boolean;
  recommended: boolean;
  fallback: boolean;
  sourceTraceable: boolean;
  rejectedByDiagnostics: boolean;
  sourceScore?: GenerateScoredRefinedTitleCandidatesResult["scoringResult"]["results"][number];
}): string {
  if (!input.inFinalPool) return "not_in_final_pool";
  if (!input.recommended) return "not_recommended";
  if (input.fallback) return "fallback_candidate";
  if (!input.sourceTraceable) return "source_not_traceable";
  if (input.rejectedByDiagnostics) return "diagnostics_rejected_candidate";
  if (input.sourceScore?.shouldReject) return input.sourceScore.rejectionReasonCode === "none" ? "scorer_should_reject" : input.sourceScore.rejectionReasonCode;
  if (input.sourceScore?.recommendedAction === "reject") return input.sourceScore.rejectionReasonCode === "none" ? "scorer_recommended_reject" : input.sourceScore.rejectionReasonCode;
  if (input.sourceScore?.rejectionReasonCode && input.sourceScore.rejectionReasonCode !== "none") return input.sourceScore.rejectionReasonCode;
  return "none";
}
