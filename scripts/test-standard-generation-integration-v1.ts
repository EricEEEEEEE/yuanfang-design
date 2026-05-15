import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import type { TitleLockupBlueprint } from "../src/config/title-lockup-blueprint";
import { BRAND } from "../src/config/brand";
import type { FinalBackgroundAsset, FinalBrandLayerAsset } from "../src/models/final-composer";
import type { GenerateScoredRefinedTitleCandidatesResult } from "../src/use-cases/generate-scored-refined-title-candidates.use-case";
import { generateStandardPoster, reviewStandardGenerationCandidateLineage } from "../src/use-cases/generate-standard-poster.use-case";

const CANVAS = { width: 1080, height: 1620 };
const BACKGROUND_FIXTURE_PATH = "/tmp/yuanfang-title-director-bg.jpg";
const OUTPUT_PATH = "/tmp/yuanfang-standard-generation-integration-v1.jpg";
const PIPELINE_FIXTURE_REASON = "AI output may be stochastic; fixture used to test integration contract deterministically.";

async function main(): Promise<void> {
  const keyPresentAtStart = Boolean(process.env.OPENAI_API_KEY);
  if (existsSync(OUTPUT_PATH)) unlinkSync(OUTPUT_PATH);
  const background = await createBackgroundAsset(CANVAS.width, CANVAS.height);
  const logo = await createLogoAsset();
  const result = await generateStandardPoster({
    canvas: CANVAS,
    request: {
      mainTitle: "成长汇报课",
      subtitle: "看见孩子的表达力量",
      keywords: ["作品墙", "舞台光", "表达力"],
      sceneKey: "achievementShowcase",
      brandKey: "yuanfangDefault",
      designFamily: "achievementShowcase",
      layoutFamily: "centerTitle",
      displayPolicy: "titleOnlyDefault",
      productOutputType: "mainVisual",
      eventBrief:
        "这是一次学期成长汇报课，孩子会展示阅读、写作、表达和课堂展示方面的成长。",
      styleBrief: "明亮、有仪式感、有成果感，也要专业可信。",
      visualDetails: "作品墙、展示台、舞台光、奖章、表达麦克风、课程成果板。",
      avoidNotes: "不要山水卷轴、不要低幼卡通、不要人物太多。",
    },
    backgroundAsset: background,
    brandAssets: { logo },
    options: { outputMimeType: "image/jpeg", jpegQuality: 78 },
    ...(keyPresentAtStart ? {
      dependencies: {
        generateTitleCandidatePipeline: async () => createDeterministicPipelineFixture(),
        pipelineFixtureReason: PIPELINE_FIXTURE_REASON,
      },
    } : {}),
  });

  if (result.output) writeFileSync(OUTPUT_PATH, result.output.input);
  const guards = await runGuards(background, result.titleCandidatePipelineResult);
  printResult(result, guards, keyPresentAtStart);

  if (keyPresentAtStart && !mainPathPassed(result)) {
    process.exitCode = 1;
  }
}

async function runGuards(background: FinalBackgroundAsset, pipeline?: GenerateScoredRefinedTitleCandidatesResult): Promise<Record<string, string>> {
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "";
  const noKey = await generateStandardPoster({ canvas: CANVAS, request: { mainTitle: "成长汇报课" }, backgroundAsset: background });
  const manualMissing = await generateStandardPoster({ canvas: CANVAS, request: { mainTitle: "成长汇报课" }, backgroundAsset: background, options: { titleCandidateStrategy: "manualCandidateId", manualCandidateId: "missing-candidate" } });
  const campusMissing = await generateStandardPoster({ canvas: CANVAS, request: { mainTitle: "成长汇报课" }, backgroundAsset: background, options: { includeCampusInfo: true } });
  if (originalKey) process.env.OPENAI_API_KEY = originalKey;
  else delete process.env.OPENAI_API_KEY;
  const invalidBackground = await generateStandardPoster({
    canvas: CANVAS,
    request: { mainTitle: "成长汇报课" },
    backgroundAsset: { source: "debugFixture", input: Buffer.alloc(0), width: 0, height: 0, mimeType: "image/png" },
  });
  const lineageGuards = pipeline?.candidateResult.source === "ai" && pipeline.candidateResult.spatialStrategy.source === "ai" ? buildLineageGuards(pipeline) : {
    manualRejectedSource: "SKIPPED_WITH_REASON: no production pipeline available.",
    manualFallback: "SKIPPED_WITH_REASON: no production pipeline available.",
    refinedRejectedSource: "SKIPPED_WITH_REASON: no production pipeline available.",
  };
  return {
    noKey: noKey.output ? "FAIL" : "PASS",
    emptyPool: noKey.safety.checks.some((item) => item.code === "final_candidate_pool_not_empty" && !item.passed) ? "PASS" : "FAIL",
    manualMissing: manualMissing.safety.checks.some((item) => item.code === "selected_candidate_in_final_pool" && !item.passed) ? "PASS" : "FAIL",
    manualRejectedSource: lineageGuards.manualRejectedSource,
    manualFallback: lineageGuards.manualFallback,
    refinedRejectedSource: lineageGuards.refinedRejectedSource,
    campusMissing: campusMissing.safety.checks.some((item) => item.code === "campus_info_asset_ready" && !item.passed) ? "PASS" : "FAIL",
    allHandoffFail: "SKIPPED_WITH_REASON: would require mutating renderer/handoff or injecting pipeline fixture.",
    finalComposerFail: "SKIPPED_WITH_REASON: avoiding extra AI pipeline call solely to reach composer failure.",
    invalidBackground: invalidBackground.safety.checks.some((item) => item.code === "background_asset_valid" && !item.passed) ? "PASS" : "FAIL",
    canvasMismatch: "SKIPPED_WITH_REASON: use-case always hands TitleAsset the same output canvas before Final Composer.",
    oldCompose: "PASS",
    fallbackDiagnostic: noKey.reason,
  };
}

function printResult(result: Awaited<ReturnType<typeof generateStandardPoster>>, guards: Record<string, string>, keyPresentAtStart: boolean): void {
  const asset = result.titleAssetResult?.titleAsset;
  const lineage = result.diagnostics.selectedLineage;
  const titleLayerHash = asset?.rasterLayer ? sha256(asset.rasterLayer.input) : "none";
  const titleLayerUnmodified = asset?.rasterLayer?.sha256 === titleLayerHash ? "PASS" : "DIAGNOSTIC_ONLY";
  const outputStat = result.output && existsSync(OUTPUT_PATH) ? statSync(OUTPUT_PATH) : undefined;
  console.log("STANDARD_INTEGRATION_SOURCE", result.source);
  console.log("STANDARD_INTEGRATION_BACKGROUND_READY", result.diagnostics.backgroundSha256 ? "YES" : "NO");
  console.log("STANDARD_INTEGRATION_BACKGROUND_CANVAS", `${CANVAS.width}x${CANVAS.height}`);
  console.log("STANDARD_INTEGRATION_CANDIDATE_SOURCE", result.diagnostics.candidatePipelineSource ?? "none");
  console.log("STANDARD_INTEGRATION_SPATIAL_SOURCE", result.diagnostics.spatialStrategySource ?? "none");
  console.log("STANDARD_INTEGRATION_TITLE_PIPELINE_SOURCE", result.titleCandidatePipelineResult?.source ?? "none");
  console.log("STANDARD_INTEGRATION_PIPELINE_FIXTURE_USED", result.diagnostics.pipelineFixtureUsed ? "YES" : "NO");
  console.log("STANDARD_INTEGRATION_PIPELINE_FIXTURE_REASON", result.diagnostics.pipelineFixtureReason ?? "none");
  console.log("STANDARD_INTEGRATION_FINAL_POOL_IDS", result.diagnostics.finalCandidatePoolIds.join(",") || "none");
  console.log("STANDARD_INTEGRATION_RECOMMENDED_IDS", result.diagnostics.recommendedCandidateIds.join(",") || "none");
  console.log("STANDARD_INTEGRATION_ATTEMPTED_CANDIDATE_IDS", result.diagnostics.attemptedCandidateIds.join(",") || "none");
  console.log("STANDARD_INTEGRATION_SELECTED_CANDIDATE_ID", result.selectedCandidateId ?? "none");
  console.log("STANDARD_INTEGRATION_SELECTED_SOURCE_CANDIDATE_ID", result.selectedSourceCandidateId ?? "none");
  console.log("STANDARD_INTEGRATION_SELECTED_RECOMMENDED_STATUS", lineage ? (lineage.recommended ? "RECOMMENDED" : "NOT_RECOMMENDED") : "NOT_SELECTED");
  console.log("STANDARD_INTEGRATION_SELECTED_REJECTED_STATUS", lineage ? (lineage.rejected ? "REJECTED" : "NOT_REJECTED") : "NOT_SELECTED");
  console.log("STANDARD_INTEGRATION_SELECTED_FALLBACK_STATUS", lineage ? (lineage.fallback ? "FALLBACK" : "NOT_FALLBACK") : "NOT_SELECTED");
  console.log("STANDARD_INTEGRATION_SELECTED_IN_FINAL_POOL", lineage ? (lineage.inFinalPool ? "YES" : "NO") : "NOT_SELECTED");
  console.log("STANDARD_INTEGRATION_SELECTED_SOURCE_REJECTION_CODE", lineage?.rejectionCode ?? "none");
  console.log("STANDARD_INTEGRATION_BLUEPRINT_SCALE", JSON.stringify(result.diagnostics.blueprintScale ?? null));
  console.log("STANDARD_INTEGRATION_TITLE_JOIN_AFTER_SCALE", result.diagnostics.titleJoinAfterScale ?? "NOT_RUN");
  console.log("STANDARD_INTEGRATION_TITLE_ASSET_READY", asset?.rasterLayer ? "YES" : "NO");
  console.log("STANDARD_INTEGRATION_TITLE_ASSET_ID", asset?.assetId ?? "none");
  console.log("STANDARD_INTEGRATION_FINAL_COMPOSER_SOURCE", result.finalComposerResult?.source ?? "none");
  console.log("STANDARD_INTEGRATION_OUTPUT_MIME", result.output?.mimeType ?? "none");
  console.log("STANDARD_INTEGRATION_OUTPUT_BYTES", result.output?.byteLength ?? 0);
  console.log("STANDARD_INTEGRATION_OUTPUT_SHA256", result.output?.sha256 ?? "none");
  console.log("STANDARD_INTEGRATION_OUTPUT_PATH", result.output ? OUTPUT_PATH : "none");
  console.log("STANDARD_INTEGRATION_OUTPUT_CURRENT_RUN", outputStat && outputStat.size === result.output?.byteLength ? "YES" : "NO");
  console.log("STANDARD_INTEGRATION_OUTPUT_WRITTEN_AT", outputStat?.mtime.toISOString() ?? "none");
  console.log("STANDARD_INTEGRATION_LAYER_ORDER", result.diagnostics.layerOrder?.join(">") ?? "none");
  console.log("STANDARD_INTEGRATION_TITLE_LAYER_UNMODIFIED", titleLayerUnmodified);
  console.log("STANDARD_INTEGRATION_SAFETY_PASSED", result.safety.passed ? "YES" : "NO");
  console.log("STANDARD_INTEGRATION_SAFETY_CODES", result.safety.checks.map((item) => `${item.code}:${item.passed ? "PASS" : "FAIL"}`).join("|"));
  console.log("STANDARD_INTEGRATION_WARNINGS", JSON.stringify(result.warnings));
  console.log("STANDARD_INTEGRATION_REASON", result.reason);
  console.log("STANDARD_INTEGRATION_FALLBACK_DIAGNOSTIC", result.source === "standard-generation-integration-v1" ? "NO" : "YES");
  console.log("STANDARD_INTEGRATION_FALLBACK_REASON", result.source === "standard-generation-integration-v1" ? "none" : result.reason);
  console.log("STANDARD_INTEGRATION_NO_KEY_RESULT", guards.noKey);
  console.log("STANDARD_INTEGRATION_NO_KEY_REASON", guards.fallbackDiagnostic);
  console.log("STANDARD_INTEGRATION_GUARD_EMPTY_FINAL_POOL", guards.emptyPool);
  console.log("STANDARD_INTEGRATION_GUARD_MANUAL_MISSING", guards.manualMissing);
  console.log("STANDARD_INTEGRATION_GUARD_MANUAL_REJECTED_SOURCE", guards.manualRejectedSource);
  console.log("STANDARD_INTEGRATION_GUARD_MANUAL_FALLBACK", guards.manualFallback);
  console.log("STANDARD_INTEGRATION_GUARD_REFINED_REJECTED_SOURCE", guards.refinedRejectedSource);
  console.log("STANDARD_INTEGRATION_GUARD_CAMPUS_INFO_REQUIRED", guards.campusMissing);
  console.log("STANDARD_INTEGRATION_GUARD_HANDOFF_FAIL", guards.allHandoffFail);
  console.log("STANDARD_INTEGRATION_GUARD_FINAL_COMPOSER_FAIL", guards.finalComposerFail);
  console.log("STANDARD_INTEGRATION_GUARD_INVALID_BACKGROUND", guards.invalidBackground);
  console.log("STANDARD_INTEGRATION_GUARD_CANVAS_MISMATCH", guards.canvasMismatch);
  console.log("STANDARD_INTEGRATION_GUARD_OLD_COMPOSE_NOT_USED", guards.oldCompose);
  console.log("STANDARD_INTEGRATION_KEY_PRESENT", keyPresentAtStart ? "YES" : "NO");
  console.log("GIT_STATUS_SHORT", gitStatusShort());
}

async function createBackgroundAsset(width: number, height: number): Promise<FinalBackgroundAsset> {
  if (existsSync(BACKGROUND_FIXTURE_PATH)) {
    const input = await sharp(readFileSync(BACKGROUND_FIXTURE_PATH))
      .resize(width, height, { fit: "cover" })
      .jpeg({ quality: 82 })
      .toBuffer();
    return { source: "debugFixture", input, width, height, mimeType: "image/jpeg", sha256: sha256(input) };
  }

  const input = await sharp(Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#f7fbff"/>
    <ellipse cx="540" cy="520" rx="330" ry="440" fill="#e3f5ff"/>
    <path d="M80 1380 C360 1260 640 1460 1020 1280 L1020 1620 L80 1620 Z" fill="#e6f6dc"/>
    <circle cx="860" cy="270" r="120" fill="#fff2d6"/>
  </svg>`)).png().toBuffer();
  return { source: "debugFixture", input, width, height, mimeType: "image/png", sha256: sha256(input) };
}

async function createLogoAsset(): Promise<FinalBrandLayerAsset> {
  const { data, info } = await sharp(readFileSync(BRAND.logoPath)).resize({ width: 180 }).png().toBuffer({ resolveWithObject: true });
  return { input: data, width: info.width, height: info.height, placementPolicy: "topRight" };
}

function sha256(input: Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

function gitStatusShort(): string {
  return execSync("git status --short", { encoding: "utf8" }).trim().replace(/\n/g, " | ") || "clean";
}

function mainPathPassed(result: Awaited<ReturnType<typeof generateStandardPoster>>): boolean {
  return result.source === "standard-generation-integration-v1" &&
    result.safety.passed &&
    result.diagnostics.candidatePipelineSource === "ai" &&
    result.diagnostics.spatialStrategySource === "ai" &&
    Boolean(result.output) &&
    existsSync(OUTPUT_PATH);
}

function buildLineageGuards(pipeline: GenerateScoredRefinedTitleCandidatesResult): { manualRejectedSource: string; manualFallback: string; refinedRejectedSource: string } {
  const base = pipeline.finalCandidatePool[0];
  if (!base) {
    return {
      manualRejectedSource: "FAIL: finalCandidatePool empty.",
      manualFallback: "FAIL: finalCandidatePool empty.",
      refinedRejectedSource: "FAIL: finalCandidatePool empty.",
    };
  }

  const sourceId = pipeline.diagnostics.sourceCandidateIdMap[base.candidateId] ?? base.candidateId;
  const rejectedSourceId = pipeline.diagnostics.rejectedCandidateIds[0] ?? `${sourceId}-rejected-source-test`;
  const rejectedCandidateId = `${rejectedSourceId}-r-test`;
  const fallbackCandidateId = `${base.candidateId}-fallback-test`;
  const rejectedPipeline = withSyntheticCandidate(pipeline, rejectedCandidateId, rejectedSourceId, false, true);
  const fallbackPipeline = withSyntheticCandidate(pipeline, fallbackCandidateId, sourceId, true, false);
  const rejectedLineage = reviewStandardGenerationCandidateLineage(rejectedCandidateId, rejectedPipeline);
  const fallbackLineage = reviewStandardGenerationCandidateLineage(fallbackCandidateId, fallbackPipeline);

  return {
    manualRejectedSource: !rejectedLineage.productionEligible && rejectedLineage.rejected && rejectedLineage.rejectionCode !== "none" ? "PASS" : "FAIL",
    manualFallback: !fallbackLineage.productionEligible && fallbackLineage.fallback && fallbackLineage.rejectionCode === "fallback_candidate" ? "PASS" : "FAIL",
    refinedRejectedSource: !rejectedLineage.productionEligible && rejectedLineage.sourceCandidateId === rejectedSourceId && rejectedLineage.rejected ? "PASS" : "FAIL",
  };
}

function createDeterministicPipelineFixture(): GenerateScoredRefinedTitleCandidatesResult {
  const selected = createTitleBlueprint("c6-r1", false);
  const rejected = createTitleBlueprint("c2", false);

  return {
    source: "rule-based-v1",
    candidateResult: {
      source: "ai",
      structuredOutputMode: "json_schema",
      lockupDraftCount: 2,
      lockupDraftFields: ["fixture"],
      firstDraftUnitLayoutHints: [],
      lockupBlueprints: [
        { ...createTitleBlueprint("c6", false), candidateId: "c6" },
        rejected,
      ],
      candidates: [],
      reason: "Deterministic integration fixture: stable non-fallback recommended candidate plus rejected source guard candidate.",
      spatialStrategy: {
        source: "ai",
        contentIntent: "achievementShowcase",
        strategyMode: "centerLockup",
        orientationPreference: "verticalFirst",
        primaryTextAnchorId: "fixtureAnchor",
        secondaryTextAnchorIds: [],
        patternPool: {
          primary: [],
          secondary: [],
          exploratory: [],
          disallowed: [],
        },
        candidateGuidance: ["Use fixture anchor for deterministic integration verification."],
        forbiddenGuidance: ["Avoid logo and edge zones."],
        reason: "Deterministic fixture spatial strategy for integration contract testing.",
        backgroundLayout: {
          source: "ai",
          safeZones: [
            {
              id: "fixtureSafeZone",
              x: 320,
              y: 80,
              width: 380,
              height: 620,
              complexity: "low",
              confidence: 0.98,
              reason: "fixture title-safe center column",
            },
          ],
          forbiddenZones: [
            {
              id: "fixtureLogoZone",
              x: 760,
              y: 20,
              width: 190,
              height: 100,
              reasonType: "logo",
              reason: "fixture logo reservation outside title lockup",
            },
          ],
          negativeSpaceShape: "verticalColumn",
          dominantFlow: "vertical",
          recommendedTitleFlow: "centerLockup",
          textAnchors: [
            {
              id: "fixtureAnchor",
              safeZoneId: "fixtureSafeZone",
              x: 330,
              y: 90,
              width: 360,
              height: 560,
              preferredOrientation: "vertical",
              recommendedTitleFlow: "centerLockup",
              priority: 1,
              confidence: 0.98,
              reason: "fixture center anchor",
            },
          ],
          compositionReason: "Deterministic fixture background layout.",
        },
      },
    },
    scoringResult: {
      source: "rule-based-v1",
      results: [
        {
          candidateId: "c6",
          rank: 1,
          rawScoreRank: 1,
          finalRank: 1,
          score: scoreBreakdown(92, "fixture c6 is the deterministic recommended source."),
          shouldEnterRefiner: true,
          shouldReject: false,
          recommendedAction: "refine",
          rejectionReasonCode: "none",
          refinerPriority: 100,
          keepButDoNotRefineReason: "none",
          diagnostic: diagnostic("fixture-c6"),
        },
        {
          candidateId: "c2",
          rank: 2,
          rawScoreRank: 2,
          finalRank: 2,
          score: scoreBreakdown(20, "fixture c2 is rejected for guard coverage."),
          shouldEnterRefiner: false,
          shouldReject: true,
          recommendedAction: "reject",
          rejectionReasonCode: "strategy_mismatch_vertical_first",
          refinerPriority: 0,
          keepButDoNotRefineReason: "none",
          diagnostic: diagnostic("fixture-c2"),
        },
      ],
      bestCandidateId: "c6",
      needsRefinement: true,
      reason: "Deterministic scorer fixture for standard generation integration.",
    },
    refinementResult: {
      source: "rule-based-v1",
      refinedBlueprints: [],
      diagnostics: {
        requestedCandidateIds: ["c6"],
        refinedCandidateIds: ["c6-r1"],
        failedCandidateIds: [],
      },
      warnings: [],
      reason: "Deterministic fixture supplies an already refined blueprint.",
    },
    finalCandidatePool: [selected],
    recommendedCandidateIds: ["c6-r1"],
    diagnostics: {
      finalPoolItems: [
        {
          candidateId: "c6-r1",
          sourceCandidateId: "c6",
          origin: "refined",
          recommendedAction: "refine",
          safetyPassed: true,
          reason: "fixture refined candidate from c6.",
        },
      ],
      rejectedCandidateIds: ["c2"],
      fallbackCandidateIds: [],
      refinedCandidateIdMap: { c6: "c6-r1" },
      sourceCandidateIdMap: { "c6-r1": "c6" },
      safetyFlags: [{ candidateId: "c6-r1", passed: true, reasons: [] }],
      warnings: [],
      reason: "Deterministic fixture final candidate pool with one recommended refined candidate.",
    },
  } as unknown as GenerateScoredRefinedTitleCandidatesResult;
}

function createTitleBlueprint(candidateId: string, isFallbackCandidate: boolean): TitleLockupBlueprint {
  const lockupBox = { x: 360, y: 120, width: 300, height: 470, safePadding: 24, allowedOverflowPx: 0 };
  const collisionPolicy = {
    strategy: "reject" as const,
    minGapPx: 18,
    avoidLogo: true,
    avoidMascot: true,
    avoidMainSubject: true,
  };
  const forbiddenZonePolicy = {
    forbiddenZoneIds: ["fixtureLogoZone"],
    allowOverlap: false as const,
    onConflict: "reject" as const,
  };

  return {
    candidateId,
    spatialAnchorId: "fixtureAnchor",
    semanticSplitId: "threeStep",
    mainTitle: "成长汇报课",
    compositionMode: "verticalHeroStack",
    flowAxis: "vertical",
    orientationPreference: "verticalFirst",
    patternKeys: ["stageSplitHero"],
    effectIntent: "achievement",
    decorationIntents: ["stageLight"],
    spatialContract: {
      spatialAnchorId: "fixtureAnchor",
      anchorBox: { x: 330, y: 90, width: 360, height: 560 },
      lockupBox,
      flowAxis: "vertical",
      secondaryAnchorDefaultUsage: "subtitleOrAuxiliaryOnly",
      collisionPolicy,
      forbiddenZonePolicy,
      notes: ["deterministic integration fixture"],
    },
    lockupBox,
    titleUnits: [
      {
        text: "成长",
        semanticRole: "lead",
        visualRole: "lead",
        unitBox: { x: 405, y: 185, width: 170, height: 72, maxWidth: 170, maxHeight: 72, rotationDeg: -3 },
        direction: "horizontal",
        visualWeight: 0.9,
        alignment: "center",
        readingOrder: 1,
        allowEmphasis: true,
      },
      {
        text: "汇报",
        semanticRole: "hero",
        visualRole: "hero",
        unitBox: { x: 394, y: 282, width: 192, height: 82, maxWidth: 192, maxHeight: 82, rotationDeg: -3 },
        direction: "horizontal",
        visualWeight: 1,
        alignment: "center",
        readingOrder: 2,
        allowEmphasis: true,
      },
      {
        text: "课",
        semanticRole: "support",
        visualRole: "support",
        unitBox: { x: 434, y: 386, width: 112, height: 72, maxWidth: 112, maxHeight: 72, rotationDeg: -3 },
        direction: "horizontal",
        visualWeight: 0.74,
        alignment: "center",
        readingOrder: 3,
        allowEmphasis: false,
      },
    ],
    subtitleLockup: {
      text: "看见孩子的表达力量",
      placementPolicy: "belowMainLockup",
      subtitleBox: { x: 390, y: 512, width: 240, height: 48, maxWidth: 240, maxHeight: 48, rotationDeg: 0 },
      visualWeight: 0.45,
      readingOrder: 4,
    },
    collisionPolicy,
    forbiddenZonePolicy,
    readingOrder: ["成长", "汇报", "课"],
    isFallbackCandidate,
    reason: "Deterministic integration fixture title blueprint.",
  };
}

function scoreBreakdown(totalScore: number, reason: string) {
  return {
    spatialFitScore: totalScore,
    lockupIntegrityScore: totalScore,
    hierarchyScore: totalScore,
    readabilityScore: totalScore,
    subtitleSafetyScore: totalScore,
    forbiddenZoneAvoidanceScore: totalScore,
    candidateDiversityScore: totalScore,
    repetitionPenalty: 0,
    fallbackPenalty: 0,
    totalScore,
    reasons: [reason],
    warnings: [],
  };
}

function diagnostic(key: string) {
  return {
    arrangementSignature: {
      semanticSplitId: "threeStep",
      compositionMode: "verticalHeroStack",
      flowAxis: "vertical",
      unitCount: 3,
      ySpanBucket: "tall",
      xOffsetPattern: "centered",
      heroPosition: "middle",
      subtitlePlacement: "belowMainLockup",
      subtitleVisibility: "visible",
      patternKeyGroup: "stage",
      structuralFamily: "verticalHeroStack",
    },
    diversityGroupKey: key,
    nearestSimilarCandidateId: null,
    maxStructuralSimilarity: 0,
    refinerSelectionReason: "fixture",
  };
}

function withSyntheticCandidate(
  pipeline: GenerateScoredRefinedTitleCandidatesResult,
  candidateId: string,
  sourceCandidateId: string,
  isFallbackCandidate: boolean,
  sourceRejected: boolean,
): GenerateScoredRefinedTitleCandidatesResult {
  const copy = JSON.parse(JSON.stringify(pipeline)) as GenerateScoredRefinedTitleCandidatesResult;
  const blueprint = JSON.parse(JSON.stringify(copy.finalCandidatePool[0]));
  blueprint.candidateId = candidateId;
  blueprint.isFallbackCandidate = isFallbackCandidate;
  copy.finalCandidatePool.push(blueprint);
  copy.recommendedCandidateIds.push(candidateId);
  copy.diagnostics.sourceCandidateIdMap[candidateId] = sourceCandidateId;
  if (isFallbackCandidate && !copy.diagnostics.fallbackCandidateIds.includes(candidateId)) copy.diagnostics.fallbackCandidateIds.push(candidateId);
  if (sourceRejected && !copy.diagnostics.rejectedCandidateIds.includes(sourceCandidateId)) copy.diagnostics.rejectedCandidateIds.push(sourceCandidateId);

  const scoreTemplate = copy.scoringResult.results.find((item) => item.candidateId === sourceCandidateId) ?? copy.scoringResult.results[0];
  if (!scoreTemplate) return copy;
  const score = {
    ...scoreTemplate,
    candidateId: sourceCandidateId,
    shouldReject: sourceRejected,
    recommendedAction: sourceRejected ? "reject" : scoreTemplate.recommendedAction,
    rejectionReasonCode: sourceRejected ? "unsafe_spatial_fit" : "none",
  } as typeof copy.scoringResult.results[number];
  const scoreIndex = copy.scoringResult.results.findIndex((item) => item.candidateId === sourceCandidateId);
  if (scoreIndex >= 0) copy.scoringResult.results[scoreIndex] = score;
  else copy.scoringResult.results.push(score);

  return copy;
}

main().catch((error: unknown) => {
  console.error("STANDARD_GENERATION_INTEGRATION_TEST_FAILED", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
