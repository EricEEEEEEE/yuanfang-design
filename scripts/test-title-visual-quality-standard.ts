import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import type { TitleBox, TitleLockupBlueprint, TitleLockupUnit } from "../src/config/title-lockup-blueprint";
import type { FinalBackgroundAsset } from "../src/models/final-composer";
import type { StandardGenerationInput } from "../src/models/standard-generation";
import type { TitleHierarchyContext } from "../src/models/title-hierarchy-context";
import type { GenerateScoredRefinedTitleCandidatesResult } from "../src/use-cases/generate-scored-refined-title-candidates.use-case";
import { DEFAULT_TITLE_FONT_FALLBACK, TITLE_FONT_REGISTRY } from "../src/config/title-font-registry";
import { generateStandardPoster, scaleTitleLockupBlueprintToCanvas } from "../src/use-cases/generate-standard-poster.use-case";
import { renderMeasuredTitleAsset } from "../src/use-cases/render-measured-title-asset.use-case";
import { buildTitleVisualQualityDiagnostics, toTitleVisualQualityRow } from "./helpers/title-visual-quality-diagnostics";

const OUT_DIR = "/tmp/yuanfang-title-visual-quality-qa";
const CANVAS = { width: 1080, height: 1620 };

type UnitSpec = { text: string; role: TitleLockupUnit["visualRole"]; box: TitleBox };
type Sample = {
  id: string; name: string; mainTitle: string; subtitle: string; primaryMessage: string;
  productOutputType: string; eventBrief: string; styleBrief: string; visualDetails: string;
  background: string; lockupBox: TitleBox; compositionMode: TitleLockupBlueprint["compositionMode"];
  flowAxis: TitleLockupBlueprint["flowAxis"]; units: UnitSpec[];
};

const SAMPLES: Sample[] = [
  sample("A", "十周年成长庆典", "十周年成长庆典", "见证每一次表达成长", "成长庆典", "achievementShowcase", "#f5dfab", { x: 190, y: 145, width: 620, height: 330 }, "stageMonument", "centered", [
    { text: "十周年", role: "lead", box: { x: 270, y: 190, width: 460, height: 88 } },
    { text: "成长庆典", role: "hero", box: { x: 220, y: 290, width: 560, height: 140 } },
  ]),
  sample("B", "AI作文公开课", "AI作文公开课", "一次看懂作文升级路径", "AI作文", "campaign", "#d7ecff", { x: 155, y: 205, width: 690, height: 280 }, "splitLeadHero", "horizontal", [
    { text: "AI作文", role: "hero", box: { x: 190, y: 250, width: 370, height: 120 } },
    { text: "公开课", role: "lead", box: { x: 570, y: 280, width: 230, height: 86 } },
  ]),
  sample("C", "春季公开课", "春季公开课", "给孩子一次文学表达体验", "公开课", "campaign", "#fff4e1", { x: 250, y: 260, width: 500, height: 230 }, "centerStageLockup", "centered", [
    { text: "春季", role: "lead", box: { x: 320, y: 300, width: 200, height: 76 } },
    { text: "公开课", role: "hero", box: { x: 365, y: 380, width: 270, height: 92 } },
  ]),
  sample("D", "成语闯关营", "成语闯关营", "边玩边懂中国表达", "成语闯关", "ipEvent", "#e8f7dd", { x: 230, y: 155, width: 540, height: 380 }, "staggeredColumn", "vertical", [
    { text: "成语", role: "lead", box: { x: 300, y: 205, width: 270, height: 90 } },
    { text: "闯关营", role: "hero", box: { x: 390, y: 320, width: 320, height: 132 } },
  ]),
  sample("E", "教学质量风采赛", "教学质量风采赛", "看见老师的专业力量", "专业力量", "achievementShowcase", "#e9e3ff", { x: 135, y: 135, width: 730, height: 380 }, "verticalHeroStack", "vertical", [
    { text: "教学质量", role: "lead", box: { x: 230, y: 185, width: 520, height: 104 } },
    { text: "风采赛", role: "hero", box: { x: 210, y: 320, width: 580, height: 150 } },
  ]),
  sample("F", "文学咖啡馆", "文学咖啡馆", "在阅读里遇见表达", "阅读表达", "literary", "#f4eadf", { x: 285, y: 245, width: 430, height: 220 }, "badgeHeroLockup", "centered", [
    { text: "文学", role: "lead", box: { x: 340, y: 285, width: 180, height: 72 } },
    { text: "咖啡馆", role: "hero", box: { x: 385, y: 365, width: 270, height: 92 } },
  ]),
];

async function main(): Promise<void> {
  mkdirSync(`${OUT_DIR}/diagnostics`, { recursive: true });
  const diagnostics = [];
  for (const item of SAMPLES) {
    const backgroundAsset = await makeBackground(item);
    const blueprint = makeBlueprint(item);
    const result = await generateStandardPoster({
      canvas: CANVAS,
      request: request(item),
      backgroundAsset,
      options: { includeLogo: false, includeMascot: false, includeCampusInfo: false, outputMimeType: "image/jpeg", jpegQuality: 78 },
      dependencies: { generateTitleCandidatePipeline: async () => fixturePipeline(item, blueprint), pipelineFixtureReason: "title visual QA fixture; no OpenAI candidate generation." },
    });
    if (!result.titleAssetResult?.titleAsset) throw new Error(`TITLE_VISUAL_QA_TITLE_ASSET_MISSING ${item.id}: ${result.reason}; ${result.warnings.join(" | ")}; ${await directHandoffReason(blueprint)}`);
    const diagnostic = buildTitleVisualQualityDiagnostics({ sampleId: item.id, sampleName: item.name, result, backgroundLuminance: luminance(item.background) });
    diagnostics.push(diagnostic);
    writeFileSync(`${OUT_DIR}/diagnostics/${item.id}.json`, JSON.stringify({ diagnostic, overlay: diagnostic.overlayMetadata }, null, 2));
  }
  const rows = diagnostics.map(toTitleVisualQualityRow);
  writeFileSync(`${OUT_DIR}/title-visual-summary.json`, JSON.stringify({ source: "title-visual-quality-qa-v1", generatedImageMode: "fixtureOnly", rows, diagnostics }, null, 2));
  writeFileSync(`${OUT_DIR}/title-visual-review.md`, reviewMarkdown(rows));
  printRows(rows);
}

function sample(id: string, name: string, mainTitle: string, subtitle: string, primaryMessage: string, productOutputType: string, background: string, lockupBox: TitleBox, compositionMode: TitleLockupBlueprint["compositionMode"], flowAxis: TitleLockupBlueprint["flowAxis"], units: UnitSpec[]): Sample {
  return { id, name, mainTitle, subtitle, primaryMessage, productOutputType, background, lockupBox, compositionMode, flowAxis, units, eventBrief: `${name} 标准模式标题视觉质量诊断样本。`, styleBrief: "明亮、可信、有传播主视觉感。", visualDetails: "fixture 背景，仅用于标题 bbox 和 dominance 诊断。" };
}

function request(item: Sample): StandardGenerationInput["request"] {
  return { mainTitle: item.mainTitle, subtitle: item.subtitle, brandKey: "yuanfangDefault", designFamily: item.productOutputType, layoutFamily: "centerTitle", displayPolicy: "titleOnlyDefault", productOutputType: item.productOutputType, eventBrief: item.eventBrief, styleBrief: item.styleBrief, visualDetails: item.visualDetails, avoidNotes: "fixture only; do not generate background text.", titleHierarchyContext: context(item) };
}

function context(item: Sample): TitleHierarchyContext {
  return { source: "standard-form-v2-primary-message", mainTitle: item.mainTitle, subtitle: item.subtitle, primaryMessage: item.primaryMessage, hookSource: "manual", mainTitleMismatch: false, titleHierarchyRisk: "none", titleBrief: item.name, titleEmphasisWords: [item.primaryMessage], hierarchyIntent: item.mainTitle.includes(item.primaryMessage) ? "mainTitleKeywordEmphasis" : "subtitleHookSupport", recommendedSubtitlePriority: "strong", visibleTextPolicy: { preserveMainTitle: true, noNewTitleText: true, allowedVisibleText: [item.mainTitle, item.subtitle] }, warnings: [] };
}

async function makeBackground(item: Sample): Promise<FinalBackgroundAsset> {
  const input = await sharp({ create: { width: CANVAS.width, height: CANVAS.height, channels: 3, background: item.background } }).jpeg({ quality: 82 }).toBuffer();
  return { source: "debugFixture", input, width: CANVAS.width, height: CANVAS.height, mimeType: "image/jpeg", sha256: hash(input) };
}

function makeBlueprint(item: Sample): TitleLockupBlueprint {
  const subtitleBox = { x: item.lockupBox.x + 60, y: item.lockupBox.y + item.lockupBox.height + 38, width: item.lockupBox.width - 120, height: 42, maxWidth: item.lockupBox.width - 120, maxHeight: 42, rotationDeg: 0 };
  return {
    candidateId: `${item.id}-r1`, spatialAnchorId: "fixtureTitleAnchor", semanticSplitId: "fixtureSplit", mainTitle: item.mainTitle,
    compositionMode: item.compositionMode, flowAxis: item.flowAxis, orientationPreference: item.flowAxis === "vertical" ? "verticalFirst" : "balanced",
    patternKeys: ["cleanBrandCentered"], effectIntent: "campaignImpact", decorationIntents: ["colorBlock"],
    spatialContract: { spatialAnchorId: "fixtureTitleAnchor", anchorBox: { x: 100, y: 100, width: 800, height: 520 }, lockupBox: lockup(item.lockupBox), flowAxis: item.flowAxis, secondaryAnchorDefaultUsage: "subtitleOrAuxiliaryOnly", collisionPolicy: collision(), forbiddenZonePolicy: forbidden(), notes: ["fixture pipeline for title visual QA only"] },
    lockupBox: lockup(item.lockupBox),
    titleUnits: item.units.map((unit, index) => titleUnit(unit, index)),
    subtitleLockup: { text: item.subtitle, placementPolicy: "belowMainLockup", subtitleBox, visualWeight: 1.75, readingOrder: 99 },
    collisionPolicy: collision(), forbiddenZonePolicy: forbidden(), readingOrder: item.units.map((unit) => unit.text), isFallbackCandidate: false, reason: "Fixture blueprint for L6 title visual diagnostics.",
  };
}

function titleUnit(unit: UnitSpec, index: number): TitleLockupUnit {
  return { text: unit.text, semanticRole: unit.role, visualRole: unit.role, unitBox: { ...unit.box, maxWidth: unit.box.width, maxHeight: unit.box.height, rotationDeg: 0 }, direction: "horizontal", visualWeight: unit.role === "hero" ? 6 : 3, alignment: "center", readingOrder: index + 1, allowEmphasis: true };
}

function fixturePipeline(item: Sample, blueprint: TitleLockupBlueprint): GenerateScoredRefinedTitleCandidatesResult {
  const sourceId = `${item.id}-c1`;
  const sourceBlueprint = { ...blueprint, candidateId: sourceId };
  const score = scoreResult(sourceId);
  return {
    source: "rule-based-v1",
    candidateResult: { source: "ai", structuredOutputMode: "unavailable", lockupDraftCount: 1, lockupDraftFields: ["fixture"], firstDraftUnitLayoutHints: [], lockupBlueprints: [sourceBlueprint], candidates: [], reason: "Fixture candidate result for title visual QA; no OpenAI call.", spatialStrategy: spatialStrategy() },
    scoringResult: { source: "rule-based-v1", results: [score], bestCandidateId: sourceId, needsRefinement: false, reason: "Fixture scorer result for title visual QA." },
    refinementResult: { source: "rule-based-v1", refinedBlueprints: [{ sourceCandidateId: sourceId, refinedCandidateId: blueprint.candidateId, blueprint, actions: [], safety: { passed: true, reasons: [] } }], rejectedRefinementCandidates: [], refinementActions: [], warnings: [], reason: "Fixture refinement result." },
    finalCandidatePool: [blueprint], recommendedCandidateIds: [blueprint.candidateId],
    diagnostics: { finalPoolItems: [{ candidateId: blueprint.candidateId, sourceCandidateId: sourceId, origin: "refined", recommendedAction: "refine", safetyPassed: true, reason: "fixture" }], rejectedCandidateIds: [], fallbackCandidateIds: [], refinedCandidateIdMap: { [sourceId]: blueprint.candidateId }, sourceCandidateIdMap: { [blueprint.candidateId]: sourceId }, safetyFlags: [{ candidateId: blueprint.candidateId, passed: true, reasons: [] }], warnings: [], reason: "Fixture final pool for title visual QA." },
  };
}

async function directHandoffReason(blueprint: TitleLockupBlueprint): Promise<string> {
  const scaled = scaleTitleLockupBlueprintToCanvas(blueprint, { width: 1000, height: 1000 }, CANVAS);
  const result = await renderMeasuredTitleAsset({ source: "pipelineFinalPool", blueprint: scaled, canvas: CANVAS, titleStylePreset: "achievement", brandStyle: "yuanfangDefault", fontRegistry: TITLE_FONT_REGISTRY, fontFallback: DEFAULT_TITLE_FONT_FALLBACK, safetyContext: { forbiddenZones: [] } });
  return `${result.reason}; ${JSON.stringify(result.diagnostics)}`;
}

function scoreResult(candidateId: string): GenerateScoredRefinedTitleCandidatesResult["scoringResult"]["results"][number] {
  return { candidateId, rank: 1, rawScoreRank: 1, finalRank: 1, shouldEnterRefiner: true, shouldReject: false, recommendedAction: "refine", rejectionReasonCode: "none", refinerPriority: 100, keepButDoNotRefineReason: "none", score: { spatialFitScore: 90, lockupIntegrityScore: 90, hierarchyScore: 90, readabilityScore: 90, subtitleSafetyScore: 90, forbiddenZoneAvoidanceScore: 90, candidateDiversityScore: 90, repetitionPenalty: 0, fallbackPenalty: 0, totalScore: 90, reasons: [], warnings: [] }, diagnostic: { arrangementSignature: { semanticSplitId: "fixtureSplit", compositionMode: "fixture", flowAxis: "fixture", unitCount: 2, ySpanBucket: "medium", xOffsetPattern: "centered", heroPosition: "middle", subtitlePlacement: "belowMainLockup", subtitleVisibility: "visible", patternKeyGroup: "clean", structuralFamily: "centerStageDouble" }, diversityGroupKey: "fixture", nearestSimilarCandidateId: null, maxStructuralSimilarity: 0, refinerSelectionReason: "fixture" } };
}

function spatialStrategy(): GenerateScoredRefinedTitleCandidatesResult["candidateResult"]["spatialStrategy"] {
  return { source: "ai", contentIntent: "achievementShowcase", strategyMode: "centerLockup", orientationPreference: "verticalFirst", primaryTextAnchorId: "fixtureTitleAnchor", secondaryTextAnchorIds: [], patternPool: { primary: ["cleanBrandCentered"], secondary: ["stageSplitHero"], exploratory: [], disallowed: [] }, candidateGuidance: ["fixture"], forbiddenGuidance: ["fixture"], reason: "Fixture spatial strategy for title visual QA.", backgroundLayout: { source: "ai", safeZones: [{ id: "fixtureSafe", shape: "centerBlock", complexity: "low", confidence: 1, reason: "fixture", x: 100, y: 100, width: 800, height: 520 }], forbiddenZones: [{ id: "fixtureBottomDetail", reasonType: "highDetail", reason: "fixture bottom detail area", x: 0, y: 780, width: 1000, height: 220 }], negativeSpaceShape: "centerBlock", dominantFlow: "centered", recommendedTitleFlow: "centerLockup", textAnchors: [{ id: "fixtureTitleAnchor", safeZoneId: "fixtureSafe", x: 100, y: 100, width: 800, height: 520, preferredOrientation: "vertical", recommendedTitleFlow: "centerLockup", priority: 1, confidence: 1, reason: "fixture" }], compositionReason: "fixture" } };
}

function printRows(rows: ReturnType<typeof toTitleVisualQualityRow>[]): void {
  console.log("TITLE_VISUAL_QA_SOURCE", "title-visual-quality-qa-v1");
  console.log("TITLE_VISUAL_OPENAI_DEFAULT_DISABLED", "YES");
  console.log("TITLE_VISUAL_OUTPUT_DIR", OUT_DIR);
  for (const row of rows) console.log("TITLE_VISUAL_QA_ROW", JSON.stringify(row));
}

function reviewMarkdown(rows: ReturnType<typeof toTitleVisualQualityRow>[]): string {
  const lines = ["# Title Visual Quality QA v1", "", "Thresholds are provisional WARN/FAIL diagnostics, not production gates.", "", "| sample | candidate | title ratio | lockup ratio | subtitle | dominance | warnings | recommendation |", "|---|---:|---:|---:|---|---:|---|---|"];
  for (const row of rows) lines.push(`| ${row.sampleId} | ${row.selectedCandidateId} | ${row.titleAssetVisibleAreaRatio} | ${row.lockupBoxAreaRatio} | ${row.subtitleVisible ? "YES" : "NO"} | ${row.estimatedTitleDominanceScore} | ${row.warnings.join(",") || "none"} | ${row.recommendation} |`);
  return `${lines.join("\n")}\n`;
}

function lockup(box: TitleBox): TitleLockupBlueprint["lockupBox"] { return { ...box, safePadding: 24, allowedOverflowPx: 0 }; }
function collision(): TitleLockupBlueprint["collisionPolicy"] { return { strategy: "reject", minGapPx: 16, avoidLogo: true, avoidMascot: true, avoidMainSubject: true }; }
function forbidden(): TitleLockupBlueprint["forbiddenZonePolicy"] { return { forbiddenZoneIds: ["fixtureBottomDetail"], allowOverlap: false, onConflict: "reject" }; }
function hash(input: Buffer): string { return createHash("sha256").update(input).digest("hex"); }
function luminance(color: string): number { const hex = color.replace("#", ""); const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }

main().catch((error: unknown) => {
  console.error("TITLE_VISUAL_QA_FAILED", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
