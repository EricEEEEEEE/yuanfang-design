import type { TitleBox, TitleLockupBlueprint, TitleLockupBox, TitleUnitBox } from "@/config/title-lockup-blueprint";
import { DEFAULT_TITLE_FONT_FALLBACK, TITLE_FONT_REGISTRY } from "@/config/title-font-registry";
import type { FinalBackgroundAsset, FinalCampusInfoAsset } from "@/models/final-composer";
import type { StandardGenerationCandidateLineage, StandardGenerationInput, StandardGenerationResult, StandardGenerationSafetyCheck } from "@/models/standard-generation";
import type { TitleAssetHandoffResult } from "@/models/title-asset";
import { composeFinalPoster } from "@/services/final-composer.service";
import type { ForbiddenZone } from "@/services/background-layout-intelligence.service";
import { generateScoredRefinedTitleCandidates, type GenerateScoredRefinedTitleCandidatesInput, type GenerateScoredRefinedTitleCandidatesResult } from "@/use-cases/generate-scored-refined-title-candidates.use-case";
import { renderMeasuredTitleAsset } from "@/use-cases/render-measured-title-asset.use-case";

const FROM_CANVAS = { width: 1000, height: 1000 };

type AttemptResult = { blueprint: TitleLockupBlueprint; handoff: TitleAssetHandoffResult };
type Diagnostics = StandardGenerationResult["diagnostics"];

export async function generateStandardPoster(input: StandardGenerationInput): Promise<StandardGenerationResult> {
  const warnings: string[] = [];
  const baseChecks = [
    check("background_asset_valid", validBackground(input.backgroundAsset), "error", "backgroundAsset must be a supported non-empty image buffer."),
    check("campus_info_asset_ready", input.options?.includeCampusInfo !== true || usableCampusInfo(input.campusInfoAsset), "error", "includeCampusInfo requires a pre-rendered campusInfoAsset."),
    check("no_old_image_compose_used", true, "error", "integration uses Final Composer only."),
    check("no_side_effect_outputs", true, "error", "integration returns only an in-memory artifact."),
  ];
  if (!passed(baseChecks)) return result(input, undefined, undefined, undefined, baseChecks, warnings, "Standard generation input failed contract validation.");

  const pipelineGenerator = input.dependencies?.generateTitleCandidatePipeline ?? generateScoredRefinedTitleCandidates;
  const pipeline = await pipelineGenerator(buildTitlePipelineInput(input));
  const candidates = new Map(pipeline.finalCandidatePool.map((item) => [item.candidateId, item]));
  const selectedIds = candidateIds(input, pipeline);
  const selectedLineages = selectedIds.map((id) => reviewStandardGenerationCandidateLineage(id, pipeline));
  const initialChecks = [
    ...baseChecks,
    check("title_pipeline_not_fallback", pipeline.candidateResult.source !== "fallback" && pipeline.candidateResult.spatialStrategy.source !== "fallback", "error", "candidate pipeline and spatial strategy must not be fallback."),
    check("final_candidate_pool_not_empty", pipeline.finalCandidatePool.length > 0, "error", "finalCandidatePool must contain production-eligible candidates."),
    check("recommended_candidate_ids_not_empty", pipeline.recommendedCandidateIds.length > 0, "error", "topRecommended strategy requires at least one recommended candidate."),
    check("selected_candidate_in_final_pool", selectedIds.length > 0 && selectedIds.every((id) => candidates.has(id)), "error", "selected candidate must exist in finalCandidatePool."),
    check("selected_candidate_recommended", selectedLineages.length > 0 && selectedLineages.every((item) => item.recommended), "error", "selected candidate must come from recommendedCandidateIds."),
    check("selected_source_traceable", selectedLineages.length > 0 && selectedLineages.every((item) => item.sourceTraceable), "error", "selected candidate must trace to scorer source candidate."),
  ];
  if (!passed(initialChecks)) return result(input, pipeline, undefined, undefined, initialChecks, warnings, "Standard generation rejected title candidate pipeline.");

  const scaledForbiddenZones = scaleForbiddenZonesToCanvas(pipeline.candidateResult.spatialStrategy.backgroundLayout.forbiddenZones, FROM_CANVAS, input.canvas);
  const attemptedCandidateIds: string[] = [];
  const attempt = await firstSuccessfulHandoff(input, pipeline, selectedIds, scaledForbiddenZones, attemptedCandidateIds, warnings);
  const joinPassed = attempt ? titleJoin(attempt.blueprint) === attempt.blueprint.mainTitle : false;
  const handoffChecks = [
    ...initialChecks,
    check("selected_candidate_not_fallback", Boolean(attempt && !attempt.blueprint.isFallbackCandidate), "error", "selected candidate cannot be fallback."),
    check("selected_candidate_not_rejected", Boolean(attempt && !reviewStandardGenerationCandidateLineage(attempt.blueprint.candidateId, pipeline).rejected), "error", "selected candidate cannot be rejected by scorer."),
    check("blueprint_scaled_to_canvas", attempt?.handoff.titleAsset?.canvas.width === input.canvas.width && attempt.handoff.titleAsset.canvas.height === input.canvas.height, "error", "selected blueprint must be scaled from 1000 design space to output canvas."),
    check("title_join_preserved_after_scaling", joinPassed, "error", "scaled titleUnits must still join mainTitle."),
    check("title_asset_handoff_passed", Boolean(attempt?.handoff.titleAsset?.rasterLayer && attempt.handoff.safety?.passed), "error", "Title Asset Handoff must produce a safe rasterLayer."),
    check("no_measurement_or_debug_svg_as_final", attempt?.handoff.titleAsset?.assetKind === "titleRasterLayer", "error", "Final output cannot use measurementSvg or debugSvg."),
  ];
  if (!attempt || !passed(handoffChecks)) return result(input, pipeline, attempt?.handoff, undefined, handoffChecks, warnings, "No recommended title candidate produced a safe TitleAsset.", undefined, attemptedCandidateIds);
  const finalChecks = handoffChecks;
  if (input.options?.includeLogo !== false && !input.brandAssets?.logo) warnings.push("logo asset omitted; Final Composer will skip logo layer.");
  if (input.options?.includeMascot === true && !input.brandAssets?.mascot) warnings.push("mascot requested but asset omitted; Final Composer will skip mascot layer.");

  const finalComposer = await composeFinalPoster({
    canvas: input.canvas,
    backgroundAsset: input.backgroundAsset,
    titleAsset: attempt.handoff.titleAsset!,
    brandAssets: {
      ...(input.options?.includeLogo !== false && input.brandAssets?.logo ? { logo: input.brandAssets.logo } : {}),
      ...(input.options?.includeMascot === true && input.brandAssets?.mascot ? { mascot: input.brandAssets.mascot } : {}),
    },
    ...(input.options?.includeCampusInfo === true ? { campusInfoAsset: input.campusInfoAsset } : { campusInfoAsset: { enabled: false } }),
    compositionPolicy: {
      respectTitleAssetBounds: true,
      doNotModifyTitleAsset: true,
      doNotReflowTitle: true,
      doNotRegenerateBackground: true,
      requireTitleAssetSafetyPassed: true,
      outputMimeType: input.options?.outputMimeType ?? "image/jpeg",
      jpegQuality: input.options?.jpegQuality ?? 78,
    },
  });
  const checks = [
    ...finalChecks,
    check("final_composer_passed", finalComposer.safety.passed, "error", "Final Composer safety must pass."),
    check("final_output_exists", Boolean(finalComposer.output), "error", "Final Composer must return output artifact."),
  ];
  return result(input, pipeline, attempt.handoff, finalComposer, checks, [...warnings, ...finalComposer.warnings], finalComposer.output ? "Standard generation integration v1 produced final poster artifact." : finalComposer.reason, attempt.blueprint, attemptedCandidateIds);
}

function candidateIds(input: StandardGenerationInput, pipeline?: GenerateScoredRefinedTitleCandidatesResult): string[] {
  if (!pipeline) return input.options?.manualCandidateId ? [input.options.manualCandidateId] : [];
  return input.options?.titleCandidateStrategy === "manualCandidateId"
    ? [input.options.manualCandidateId ?? ""].filter(Boolean)
    : pipeline.recommendedCandidateIds;
}

function buildTitlePipelineInput(input: StandardGenerationInput): GenerateScoredRefinedTitleCandidatesInput {
  const keywordText = (input.request.keywords ?? []).join("、");

  return {
    backgroundImageBase64: input.backgroundAsset.input.toString("base64"),
    mainTitle: input.request.mainTitle,
    subtitle: input.request.subtitle,
    designFamily: input.request.designFamily,
    layoutFamily: input.request.layoutFamily ?? "centerTitle",
    displayPolicy: input.request.displayPolicy ?? "titleOnlyDefault",
    productOutputType: input.request.productOutputType ?? "mainVisual",
    eventBrief: input.request.eventBrief ?? [input.request.sceneKey, keywordText].filter(Boolean).join(" "),
    styleBrief: input.request.styleBrief ?? "明亮、有仪式感、有成果感，也要专业可信。",
    visualDetails: input.request.visualDetails ?? keywordText,
    avoidNotes: input.request.avoidNotes ?? "不要生成文字、不要生成 logo、不要生成二维码。",
    titleHierarchyContext: input.request.titleHierarchyContext,
  };
}

async function firstSuccessfulHandoff(input: StandardGenerationInput, pipeline: GenerateScoredRefinedTitleCandidatesResult, ids: string[], zones: ForbiddenZone[], attempted: string[], failures: string[]): Promise<AttemptResult | undefined> {
  const byId = new Map(pipeline.finalCandidatePool.map((item) => [item.candidateId, item]));
  for (const id of ids) {
    attempted.push(id);
    const source = byId.get(id);
    const lineage = reviewStandardGenerationCandidateLineage(id, pipeline);
    if (!source || !lineage.productionEligible) continue;
    const blueprint = scaleTitleLockupBlueprintToCanvas(source, FROM_CANVAS, input.canvas);
    const handoff = await renderMeasuredTitleAsset({
      source: "pipelineFinalPool",
      blueprint,
      canvas: input.canvas,
      titleStylePreset: "achievement",
      brandStyle: "yuanfangDefault",
      fontRegistry: TITLE_FONT_REGISTRY,
      fontFallback: DEFAULT_TITLE_FONT_FALLBACK,
      safetyContext: { forbiddenZones: zones },
    });
    if (handoff.titleAsset?.rasterLayer && handoff.safety?.passed) return { blueprint, handoff };
    failures.push(`${id}: ${handoff.reason}`);
  }
  return undefined;
}

export function scaleTitleLockupBlueprintToCanvas(blueprint: TitleLockupBlueprint, fromCanvas: { width: number; height: number }, toCanvas: { width: number; height: number }): TitleLockupBlueprint {
  const copy = JSON.parse(JSON.stringify(blueprint)) as TitleLockupBlueprint;
  const sx = toCanvas.width / fromCanvas.width;
  const sy = toCanvas.height / fromCanvas.height;
  const ss = Math.min(sx, sy);
  copy.lockupBox = scaleLockupBox(copy.lockupBox, sx, sy, ss);
  copy.spatialContract.anchorBox = scaleBox(copy.spatialContract.anchorBox, sx, sy);
  copy.spatialContract.lockupBox = scaleLockupBox(copy.spatialContract.lockupBox, sx, sy, ss);
  copy.spatialContract.collisionPolicy.minGapPx = scaleScalar(copy.spatialContract.collisionPolicy.minGapPx, ss);
  copy.collisionPolicy.minGapPx = scaleScalar(copy.collisionPolicy.minGapPx, ss);
  copy.titleUnits = copy.titleUnits.map((unit) => ({ ...unit, unitBox: scaleUnitBox(unit.unitBox, sx, sy) }));
  copy.subtitleLockup = {
    ...copy.subtitleLockup,
    subtitleBox: copy.subtitleLockup.subtitleBox ? scaleUnitBox(copy.subtitleLockup.subtitleBox, sx, sy) : null,
  };
  return copy;
}

export function scaleForbiddenZonesToCanvas(zones: ForbiddenZone[], fromCanvas: { width: number; height: number }, toCanvas: { width: number; height: number }): ForbiddenZone[] {
  const sx = toCanvas.width / fromCanvas.width;
  const sy = toCanvas.height / fromCanvas.height;
  return zones.map((zone) => ({ ...zone, ...scaleBox(zone, sx, sy) }));
}

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
  const rejectionCode = lineageRejectionCode({
    inFinalPool,
    recommended,
    fallback,
    sourceTraceable,
    rejectedByDiagnostics,
    sourceScore,
  });

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
    rejectionCode,
    productionEligible: inFinalPool && recommended && !fallback && !rejected && sourceTraceable,
  };
}

function result(input: StandardGenerationInput, pipeline: GenerateScoredRefinedTitleCandidatesResult | undefined, titleAsset: TitleAssetHandoffResult | undefined, finalComposer: StandardGenerationResult["finalComposerResult"], checks: StandardGenerationSafetyCheck[], warnings: string[], reason: string, selected?: TitleLockupBlueprint, attempted: string[] = []): StandardGenerationResult {
  const selectedLineage = pipeline && selected ? reviewStandardGenerationCandidateLineage(selected.candidateId, pipeline) : undefined;
  const diagnostics: Diagnostics = {
    backgroundSource: input.backgroundAsset.source,
    backgroundSha256: input.backgroundAsset.sha256,
    candidatePipelineSource: pipeline?.candidateResult.source,
    spatialStrategySource: pipeline?.candidateResult.spatialStrategy.source,
    finalCandidatePoolIds: pipeline?.finalCandidatePool.map((item) => item.candidateId) ?? [],
    recommendedCandidateIds: pipeline?.recommendedCandidateIds ?? [],
    attemptedCandidateIds: attempted.length > 0 ? attempted : (titleAsset ? [titleAsset.candidateId] : candidateIds(input, pipeline)),
    selectedTitleCandidateId: selected?.candidateId,
    titleAssetId: titleAsset?.titleAsset?.assetId,
    finalOutputSha256: finalComposer?.output?.sha256,
    layerOrder: finalComposer?.diagnostics.layerOrder,
    titleAssetFailureReasons: warnings.filter((item) => item.includes(":")),
    selectedLineage,
    pipelineFixtureUsed: Boolean(input.dependencies?.generateTitleCandidatePipeline),
    pipelineFixtureReason: input.dependencies?.pipelineFixtureReason,
    blueprintScale: { fromCanvas: FROM_CANVAS, toCanvas: input.canvas, scaleX: input.canvas.width / 1000, scaleY: input.canvas.height / 1000 },
    titleJoinAfterScale: selected ? (titleJoin(selected) === selected.mainTitle ? "PASS" : "FAIL") : "NOT_RUN",
    warnings,
  };
  return {
    source: passed(checks) && finalComposer?.output ? "standard-generation-integration-v1" : "diagnostic-only",
    output: finalComposer?.output,
    finalComposerResult: finalComposer,
    titleAssetResult: titleAsset,
    titleCandidatePipelineResult: pipeline,
    selectedCandidateId: selected?.candidateId,
    selectedSourceCandidateId: titleAsset?.titleAsset?.sourceCandidateId,
    diagnostics,
    safety: { passed: passed(checks), checks },
    warnings,
    reason,
  };
}

function validBackground(asset: FinalBackgroundAsset): boolean { return Buffer.isBuffer(asset.input) && asset.input.byteLength > 0 && positive(asset.width) && positive(asset.height) && (asset.mimeType === "image/png" || asset.mimeType === "image/jpeg"); }
function usableCampusInfo(asset?: FinalCampusInfoAsset): boolean { return Boolean(asset?.enabled && Buffer.isBuffer(asset.input) && asset.input.byteLength > 0 && positive(asset.width) && positive(asset.height)); }
function titleJoin(blueprint: TitleLockupBlueprint): string { return blueprint.titleUnits.slice().sort((a, b) => a.readingOrder - b.readingOrder).map((unit) => unit.text).join(""); }
function scaleBox<T extends TitleBox>(box: T, sx: number, sy: number): T {
  return { ...box, x: scaleScalar(box.x, sx), y: scaleScalar(box.y, sy), width: scaleScalar(box.width, sx), height: scaleScalar(box.height, sy) };
}
function scaleUnitBox(box: TitleUnitBox, sx: number, sy: number): TitleUnitBox {
  return { ...scaleBox(box, sx, sy), maxWidth: scaleScalar(box.maxWidth, sx), maxHeight: scaleScalar(box.maxHeight, sy), rotationDeg: box.rotationDeg };
}
function scaleLockupBox(box: TitleLockupBox, sx: number, sy: number, ss: number): TitleLockupBox {
  return { ...scaleBox(box, sx, sy), safePadding: scaleScalar(box.safePadding, ss), allowedOverflowPx: scaleScalar(box.allowedOverflowPx, ss) };
}
function scaleScalar(value: number, scale: number): number { return Math.round(value * scale * 100) / 100; }
function check(code: string, passedValue: boolean, severity: "error" | "warning", reason: string): StandardGenerationSafetyCheck { return { code, passed: passedValue, severity, reason }; }
function passed(checks: StandardGenerationSafetyCheck[]): boolean { return checks.every((item) => item.passed || item.severity !== "error"); }
function positive(value: unknown): value is number { return Number.isInteger(value) && Number(value) > 0; }
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
