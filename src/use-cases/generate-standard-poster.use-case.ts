import type { TitleLockupBlueprint } from "@/config/title-lockup-blueprint";
import type { FinalBackgroundAsset, FinalCampusInfoAsset } from "@/models/final-composer";
import type { StandardGenerationInput, StandardGenerationMeasuredCandidateAttempt, StandardGenerationResult, StandardGenerationSafetyCheck } from "@/models/standard-generation";
import type { TitleAssetHandoffResult } from "@/models/title-asset";
import { composeFinalPoster } from "@/services/final-composer.service";
import { generateScoredRefinedTitleCandidates, type GenerateScoredRefinedTitleCandidatesInput, type GenerateScoredRefinedTitleCandidatesResult } from "@/use-cases/generate-scored-refined-title-candidates.use-case";
import { firstSuccessfulStandardTitleHandoff, standardCandidateIds, standardCandidateRetryIds } from "@/services/helpers/standard-generation-title-handoff";
import { handoffRetryRejection, reviewStandardGenerationCandidateLineage } from "@/services/helpers/standard-generation-title-lineage";
import { scaleForbiddenZonesToCanvas, STANDARD_TITLE_FROM_CANVAS } from "@/services/helpers/standard-generation-title-scale";

type Diagnostics = StandardGenerationResult["diagnostics"];

export { reviewStandardGenerationCandidateLineage } from "@/services/helpers/standard-generation-title-lineage";
export { scaleTitleLockupBlueprintToCanvas } from "@/services/helpers/standard-generation-title-scale";

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
  const selectedIds = standardCandidateIds(input, pipeline);
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

  const scaledForbiddenZones = scaleForbiddenZonesToCanvas(pipeline.candidateResult.spatialStrategy.backgroundLayout.forbiddenZones, STANDARD_TITLE_FROM_CANVAS, input.canvas);
  const measuredCandidateAttempts: StandardGenerationMeasuredCandidateAttempt[] = [];
  const attempt = await firstSuccessfulStandardTitleHandoff(input, pipeline, standardCandidateRetryIds(input, pipeline, selectedIds), selectedIds, scaledForbiddenZones, measuredCandidateAttempts, warnings);
  const joinPassed = attempt ? titleJoin(attempt.blueprint) === attempt.blueprint.mainTitle : false;
  const handoffChecks = [
    ...initialChecks,
    check("selected_candidate_retry_eligible", Boolean(attempt && !handoffRetryRejection(reviewStandardGenerationCandidateLineage(attempt.blueprint.candidateId, pipeline))), "error", "selected candidate must remain final-pool, non-fallback, non-rejected, and source-traceable."),
    check("selected_candidate_not_fallback", Boolean(attempt && !attempt.blueprint.isFallbackCandidate), "error", "selected candidate cannot be fallback."),
    check("selected_candidate_not_rejected", Boolean(attempt && !reviewStandardGenerationCandidateLineage(attempt.blueprint.candidateId, pipeline).rejected), "error", "selected candidate cannot be rejected by scorer."),
    check("blueprint_scaled_to_canvas", attempt?.handoff.titleAsset?.canvas.width === input.canvas.width && attempt.handoff.titleAsset.canvas.height === input.canvas.height, "error", "selected blueprint must be scaled from 1000 design space to output canvas."),
    check("title_join_preserved_after_scaling", joinPassed, "error", "scaled titleUnits must still join mainTitle."),
    check("title_asset_handoff_passed", Boolean(attempt?.handoff.titleAsset?.rasterLayer && attempt.handoff.safety?.passed), "error", "Title Asset Handoff must produce a safe rasterLayer."),
    check("no_measurement_or_debug_svg_as_final", attempt?.handoff.titleAsset?.assetKind === "titleRasterLayer", "error", "Final output cannot use measurementSvg or debugSvg."),
  ];
  if (!attempt || !passed(handoffChecks)) return result(input, pipeline, attempt?.handoff, undefined, handoffChecks, warnings, "no_measured_safe_title_candidate: No measured-safe title candidate available.", undefined, measuredCandidateAttempts);
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
  return result(input, pipeline, attempt.handoff, finalComposer, checks, [...warnings, ...finalComposer.warnings], finalComposer.output ? "Standard generation integration v1 produced final poster artifact." : finalComposer.reason, attempt.blueprint, measuredCandidateAttempts, attempt.selectedByMeasuredRetry);
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

function result(input: StandardGenerationInput, pipeline: GenerateScoredRefinedTitleCandidatesResult | undefined, titleAsset: TitleAssetHandoffResult | undefined, finalComposer: StandardGenerationResult["finalComposerResult"], checks: StandardGenerationSafetyCheck[], warnings: string[], reason: string, selected?: TitleLockupBlueprint, attempts: StandardGenerationMeasuredCandidateAttempt[] = [], selectedByMeasuredRetry = false): StandardGenerationResult {
  const selectedLineage = pipeline && selected ? reviewStandardGenerationCandidateLineage(selected.candidateId, pipeline) : undefined;
  const attemptedIds = attempts.map((item) => item.attemptedCandidateId);
  const diagnostics: Diagnostics = {
    backgroundSource: input.backgroundAsset.source,
    backgroundSha256: input.backgroundAsset.sha256,
    candidatePipelineSource: pipeline?.candidateResult.source,
    spatialStrategySource: pipeline?.candidateResult.spatialStrategy.source,
    finalCandidatePoolIds: pipeline?.finalCandidatePool.map((item) => item.candidateId) ?? [],
    recommendedCandidateIds: pipeline?.recommendedCandidateIds ?? [],
    attemptedCandidateIds: attemptedIds.length > 0 ? attemptedIds : (titleAsset ? [titleAsset.candidateId] : standardCandidateIds(input, pipeline)),
    measuredCandidateAttempts: attempts,
    selectedByMeasuredRetry,
    retryCount: Math.max(0, attempts.length - 1),
    noMeasuredSafeTitleCandidate: attempts.length > 0 && !attempts.some((item) => item.measuredPass),
    selectedTitleCandidateId: selected?.candidateId,
    titleAssetId: titleAsset?.titleAsset?.assetId,
    finalOutputSha256: finalComposer?.output?.sha256,
    layerOrder: finalComposer?.diagnostics.layerOrder,
    titleAssetFailureReasons: warnings.filter((item) => item.includes(":")),
    selectedLineage,
    pipelineFixtureUsed: Boolean(input.dependencies?.generateTitleCandidatePipeline),
    pipelineFixtureReason: input.dependencies?.pipelineFixtureReason,
    blueprintScale: { fromCanvas: STANDARD_TITLE_FROM_CANVAS, toCanvas: input.canvas, scaleX: input.canvas.width / 1000, scaleY: input.canvas.height / 1000 },
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
function check(code: string, passedValue: boolean, severity: "error" | "warning", reason: string): StandardGenerationSafetyCheck { return { code, passed: passedValue, severity, reason }; }
function passed(checks: StandardGenerationSafetyCheck[]): boolean { return checks.every((item) => item.passed || item.severity !== "error"); }
function positive(value: unknown): value is number { return Number.isInteger(value) && Number(value) > 0; }
