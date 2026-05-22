import type {
  StandardApiBoxSummary,
  StandardApiCandidateDiagnosticSummary,
  StandardApiForbiddenOverlapSummary,
  StandardGenerateV1Response,
} from "@/models/standard-generation-api";
import type { generateStandardPoster } from "@/use-cases/generate-standard-poster.use-case";

type StandardPosterResult = Awaited<ReturnType<typeof generateStandardPoster>>;

export function buildDiagnostics(
  result: StandardPosterResult,
  assetWarnings: string[],
): StandardGenerateV1Response["diagnostics"] {
  const pipeline = result.titleCandidatePipelineResult;
  return {
    candidateSource: result.diagnostics.candidatePipelineSource,
    spatialSource: result.diagnostics.spatialStrategySource,
    pipelineSource: pipeline?.source,
    finalCandidatePoolIds: result.diagnostics.finalCandidatePoolIds,
    recommendedCandidateIds: result.diagnostics.recommendedCandidateIds,
    rejectedCandidateIds: pipeline?.diagnostics.rejectedCandidateIds ?? [],
    rejectionReasonCodes: pipeline?.scoringResult.results.map((item) => `${item.candidateId}:${item.rejectionReasonCode}`) ?? [],
    titleDesignDiagnostic: pipeline ? titleDesignDiagnostic(pipeline) : undefined,
    spatialDiagnostic: pipeline ? spatialDiagnostic(pipeline) : undefined,
    candidateDiagnostics: pipeline ? candidateDiagnostics(pipeline) : undefined,
    selectedCandidateId: result.selectedCandidateId,
    selectedSourceCandidateId: result.selectedSourceCandidateId,
    layerOrder: result.diagnostics.layerOrder,
    titleAssetId: result.diagnostics.titleAssetId,
    warnings: [...assetWarnings, ...result.warnings],
  };
}

function spatialDiagnostic(pipeline: NonNullable<StandardPosterResult["titleCandidatePipelineResult"]>): NonNullable<StandardGenerateV1Response["diagnostics"]>["spatialDiagnostic"] {
  const strategy = pipeline.candidateResult.spatialStrategy;
  const layout = strategy.backgroundLayout;
  return {
    backgroundLayoutSource: layout.source,
    backgroundLayoutReason: layout.compositionReason,
    backgroundLayoutFallbackReasonCode: layout.diagnostics?.fallbackReasonCode,
    backgroundLayoutFallbackReason: layout.diagnostics?.fallbackReason,
    normalizationWarnings: layout.diagnostics?.normalizationWarnings,
    spatialStrategySource: strategy.source,
    spatialStrategyReason: strategy.reason,
    spatialFallbackReasonCode: strategy.source === "fallback" ? layout.diagnostics?.fallbackReasonCode : undefined,
    spatialFallbackReason: strategy.source === "fallback" ? layout.diagnostics?.fallbackReason : undefined,
    primaryTextAnchorId: strategy.primaryTextAnchorId,
    negativeSpaceShape: layout.negativeSpaceShape,
    dominantFlow: layout.dominantFlow,
    recommendedTitleFlow: layout.recommendedTitleFlow,
    safeZones: layout.safeZones.map((zone) => ({ ...box(zone), id: zone.id, shape: zone.shape, complexity: zone.complexity, confidence: zone.confidence })),
    forbiddenZones: layout.forbiddenZones.map((zone) => ({ ...box(zone), id: zone.id, reasonType: zone.reasonType })),
    textAnchors: layout.textAnchors.map((anchor) => ({ ...box(anchor), id: anchor.id, safeZoneId: anchor.safeZoneId, preferredOrientation: anchor.preferredOrientation, priority: anchor.priority, confidence: anchor.confidence })),
  };
}

function candidateDiagnostics(pipeline: NonNullable<StandardPosterResult["titleCandidatePipelineResult"]>): StandardApiCandidateDiagnosticSummary[] {
  const scoreById = new Map(pipeline.scoringResult.results.map((item) => [item.candidateId, item]));
  const byId = new Map([...pipeline.candidateResult.lockupBlueprints, ...pipeline.finalCandidatePool].map((item) => [item.candidateId, item]));
  return [...byId.values()].map((blueprint) => {
    const sourceCandidateId = pipeline.diagnostics.sourceCandidateIdMap[blueprint.candidateId] ?? blueprint.candidateId;
    const score = scoreById.get(sourceCandidateId);
    return {
      candidateId: blueprint.candidateId,
      sourceCandidateId,
      isFallbackCandidate: blueprint.isFallbackCandidate,
      recommendedAction: score?.recommendedAction,
      shouldReject: score?.shouldReject,
      rejectionReasonCode: score?.rejectionReasonCode,
      l7DesignSystemScore: score?.score.l7DesignSystemScore,
      l7DesignGateSummary: score?.diagnostic.l7DesignGateSummary,
      lockupBox: box(blueprint.lockupBox),
      unitBoxes: blueprint.titleUnits.map((unit) => ({ ...box(unit.unitBox), text: unit.text, rotationDeg: unit.unitBox.rotationDeg })),
      subtitleBox: blueprint.subtitleLockup.subtitleBox ? box(blueprint.subtitleLockup.subtitleBox) : null,
      forbiddenOverlapSummary: forbiddenOverlapSummary(blueprint, pipeline.candidateResult.spatialStrategy.backgroundLayout.forbiddenZones),
    };
  });
}

function titleDesignDiagnostic(pipeline: NonNullable<StandardPosterResult["titleCandidatePipelineResult"]>): NonNullable<StandardGenerateV1Response["diagnostics"]>["titleDesignDiagnostic"] {
  const plan = pipeline.candidateResult.titleDesignPlan;
  if (!plan) return undefined;
  return {
    planId: plan.planId,
    scene: plan.sceneStyleProfile.sceneKey,
    fontShape: plan.fontShapePlan.key,
    titleStylePreset: plan.rendererStylePlan.titleStylePreset,
    targetLockupAreaRatio: plan.adaptiveSizingPolicy.targetLockupAreaRatio,
    minAcceptableLockupAreaRatio: plan.adaptiveSizingPolicy.minAcceptableLockupAreaRatio,
    primaryPatterns: plan.referencePatternPlan.primary,
    allowedCompositionModes: plan.lockupCompositionPlan.allowedModes,
    qualityGates: plan.designQualityGates,
    diagnostics: plan.diagnostics,
  };
}

function forbiddenOverlapSummary(
  blueprint: NonNullable<StandardPosterResult["titleCandidatePipelineResult"]>["candidateResult"]["lockupBlueprints"][number],
  zones: NonNullable<StandardPosterResult["titleCandidatePipelineResult"]>["candidateResult"]["spatialStrategy"]["backgroundLayout"]["forbiddenZones"],
): StandardApiForbiddenOverlapSummary[] {
  const targets = [
    { target: "lockupBox" as const, box: blueprint.lockupBox },
    ...blueprint.titleUnits.map((unit) => ({ target: "unitBox" as const, text: unit.text, box: unit.unitBox })),
    ...(blueprint.subtitleLockup.subtitleBox ? [{ target: "subtitleBox" as const, box: blueprint.subtitleLockup.subtitleBox }] : []),
  ];
  return targets
    .flatMap((item) => zones.map((zone) => overlap(item.box, zone, zone.id, item.target, "text" in item ? item.text : undefined)))
    .filter((item): item is StandardApiForbiddenOverlapSummary => Boolean(item));
}

function overlap(
  left: StandardApiBoxSummary,
  right: StandardApiBoxSummary,
  zoneId: string,
  target: StandardApiForbiddenOverlapSummary["target"],
  text?: string,
): StandardApiForbiddenOverlapSummary | undefined {
  const width = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x));
  const height = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));
  const overlapArea = width * height;
  const overlapRatio = overlapArea / Math.max(1, Math.min(area(left), area(right)));
  return overlapRatio > 0.02 ? { zoneId, target, ...(text ? { text } : {}), overlapArea: round(overlapArea), overlapRatio: round(overlapRatio) } : undefined;
}

function box(input: StandardApiBoxSummary): StandardApiBoxSummary {
  return { x: input.x, y: input.y, width: input.width, height: input.height };
}

function area(input: StandardApiBoxSummary): number {
  return Math.max(0, input.width) * Math.max(0, input.height);
}

function round(input: number): number {
  return Math.round(input * 10000) / 10000;
}
