import { existsSync, readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { TitleBox, TitleLockupBlueprint, TitleLockupUnit } from "../src/config/title-lockup-blueprint";
import type { TitleCandidate } from "../src/services/title-candidate.service";
import { renderTitleCandidatePreviews } from "../src/services/title-candidate-preview.service";
import {
  generateScoredRefinedTitleCandidates,
  type GenerateScoredRefinedTitleCandidatesResult,
} from "../src/use-cases/generate-scored-refined-title-candidates.use-case";

const BACKGROUND_IMAGE_PATH = "/tmp/yuanfang-title-director-bg.jpg";
const OUTPUT_DIR = "/tmp/yuanfang-title-candidate-pipeline-preview-comparison";
const CONTACT_SHEET_PATH = "/tmp/yuanfang-title-candidate-pipeline-preview-comparison.jpg";
const PAIRS = [
  { sourceId: "c6", refinedId: "c6-r1" },
  { sourceId: "c3", refinedId: "c3-r1" },
  { sourceId: "c1", refinedId: "c1-r1" },
] as const;
const KEEP_IDS = ["c4", "c5"] as const;
const EFFECTS: TitleCandidate["effectIntent"][] = ["stageDepth", "cleanReadable", "chineseSeal", "campaignImpact", "editorialSoft", "playfulBadge"];
const DECORATIONS: TitleCandidate["decorationIntents"][number][] = ["none", "stageLight", "smallStars", "medalLine", "goldLine", "sealStamp", "paperTag", "bookMark", "campaignLabel", "growthArrow", "colorBlock", "badge", "playfulDot"];

type PreviewMap = Record<string, string>;
type PairRow = { sourceId: string; refinedId: string; original: TitleLockupBlueprint; refined: TitleLockupBlueprint; actions: string };
type SheetRow = { label: string; path?: string; note: string };
type ComparableBox = TitleBox & Partial<{ safePadding: number; allowedOverflowPx: number }>;

async function main(): Promise<void> {
  if (!existsSync(BACKGROUND_IMAGE_PATH)) {
    console.error("TITLE_CANDIDATE_PIPELINE_PREVIEW_COMPARISON_IMAGE_MISSING", BACKGROUND_IMAGE_PATH);
    process.exit(1);
  }

  const backgroundImageBase64 = readFileSync(BACKGROUND_IMAGE_PATH).toString("base64");
  const result = await generateScoredRefinedTitleCandidates({
    backgroundImageBase64,
    mainTitle: "成长汇报课",
    subtitle: "看见孩子的表达力量",
    designFamily: "achievementShowcase",
    layoutFamily: "centerTitle",
    displayPolicy: "titleOnlyDefault",
    productOutputType: "mainVisual",
    eventBrief: "这是一次学期成长汇报课，孩子会展示阅读、写作、表达和课堂展示方面的成长。",
    styleBrief: "明亮、有仪式感、有成果感，也要专业可信。",
    visualDetails: "作品墙、展示台、舞台光、奖章、表达麦克风、课程成果板。",
    avoidNotes: "不要山水卷轴、不要低幼卡通、不要人物太多。",
  });
  const failures = runSafetyChecks(result);
  if (failures.length > 0) throw new Error(`COMPARISON_SAFETY_CHECK_FAILED: ${failures.join(" | ")}`);

  const pairRows = result.candidateResult.source === "fallback" ? [] : buildPairRows(result);
  const keepRows = buildKeepRows(result);
  const rejectedRows = buildRejectedRows(result);
  const originalPreviewPaths = await renderPreviewSet("original", pairRows.map((row) => row.original), result);
  const refinedPreviewPaths = await renderPreviewSet("refined", pairRows.map((row) => row.refined), result);
  const keepPreviewPaths = await renderPreviewSet("keep", keepRows.map((row) => row.blueprint), result);
  const rejectedPreviewPaths = await renderPreviewSet("rejected", rejectedRows.map((row) => row.blueprint), result);
  const geometryDeltas = buildGeometryDeltas(pairRows);
  const visualReviewNotes = buildVisualReviewNotes(pairRows, result);

  await renderComparisonContactSheet({
    pairs: pairRows,
    originalPaths: originalPreviewPaths,
    refinedPaths: refinedPreviewPaths,
    keepRows: keepRows.map((row) => ({ label: row.blueprint.candidateId, path: keepPreviewPaths[row.blueprint.candidateId], note: row.note })),
    rejectedRows: rejectedRows.map((row) => ({ label: row.blueprint.candidateId, path: rejectedPreviewPaths[row.blueprint.candidateId], note: row.note })),
    isFallback: result.candidateResult.source === "fallback",
  });

  console.log("COMPARISON_SOURCE", result.source);
  console.log("COMPARISON_CANDIDATE_SOURCE", result.candidateResult.source);
  console.log("COMPARISON_PIPELINE_FINAL_IDS", result.finalCandidatePool.map((item) => item.candidateId).join(","));
  console.log("COMPARISON_RECOMMENDED_IDS", result.recommendedCandidateIds.join(","));
  console.log("COMPARISON_ORIGINAL_PREVIEW_PATHS", JSON.stringify(originalPreviewPaths));
  console.log("COMPARISON_REFINED_PREVIEW_PATHS", JSON.stringify(refinedPreviewPaths));
  console.log("COMPARISON_CONTACT_SHEET_PATH", CONTACT_SHEET_PATH);
  console.log("COMPARISON_REJECTED_DIAGNOSTIC_PATHS", JSON.stringify(rejectedPreviewPaths));
  console.log("COMPARISON_REFINED_ID_MAP", JSON.stringify(result.diagnostics.refinedCandidateIdMap));
  console.log("COMPARISON_SOURCE_ID_MAP", JSON.stringify(result.diagnostics.sourceCandidateIdMap));
  console.log("COMPARISON_GEOMETRY_DELTAS", JSON.stringify(geometryDeltas));
  console.log("COMPARISON_ORIGINAL_SAFETY_FLAGS", JSON.stringify(originalSafetyFlags(result)));
  console.log("COMPARISON_REFINED_SAFETY_FLAGS", JSON.stringify(refinedSafetyFlags(result)));
  console.log("COMPARISON_VISUAL_REVIEW_NOTES", JSON.stringify(visualReviewNotes));
  console.log(JSON.stringify({ contactSheetPath: CONTACT_SHEET_PATH, geometryDeltas, visualReviewNotes }, null, 2));
}

function buildPairRows(result: GenerateScoredRefinedTitleCandidatesResult): PairRow[] {
  const originalById = toMap(result.candidateResult.lockupBlueprints);
  const finalById = toMap(result.finalCandidatePool);
  return PAIRS.map(({ sourceId, refinedId }) => {
    const original = originalById.get(sourceId);
    const refined = finalById.get(refinedId);
    if (!original || !refined) throw new Error(`COMPARISON_PAIR_MISSING: ${sourceId}->${refinedId}`);
    return { sourceId, refinedId, original, refined, actions: actionSummary(result, sourceId) };
  });
}

function buildKeepRows(result: GenerateScoredRefinedTitleCandidatesResult): Array<{ blueprint: TitleLockupBlueprint; note: string }> {
  const finalById = toMap(result.finalCandidatePool);
  return KEEP_IDS.map((id) => {
    const blueprint = finalById.get(id);
    return blueprint ? { blueprint, note: scoringNote(result, id) } : undefined;
  }).filter((row): row is { blueprint: TitleLockupBlueprint; note: string } => Boolean(row));
}

function buildRejectedRows(result: GenerateScoredRefinedTitleCandidatesResult): Array<{ blueprint: TitleLockupBlueprint; note: string }> {
  const original = toMap(result.candidateResult.lockupBlueprints).get("c2");
  const note = scoringNote(result, "c2");
  return original ? [{ blueprint: original, note }] : [];
}

async function renderPreviewSet(label: string, blueprints: TitleLockupBlueprint[], result: GenerateScoredRefinedTitleCandidatesResult): Promise<PreviewMap> {
  if (blueprints.length === 0) return {};
  const previewResult = await renderTitleCandidatePreviews({
    backgroundImagePath: BACKGROUND_IMAGE_PATH,
    outputDir: path.join(OUTPUT_DIR, label),
    candidates: blueprints.map(previewCandidateFromBlueprint),
    lockupBlueprints: blueprints,
    debugOverlay: true,
    spatialStrategy: result.candidateResult.spatialStrategy,
  });
  return Object.fromEntries(blueprints.map((blueprint, index) => [blueprint.candidateId, previewResult.previewPaths[index] ?? ""]));
}

function previewCandidateFromBlueprint(blueprint: TitleLockupBlueprint): TitleCandidate {
  return {
    candidateId: blueprint.candidateId,
    spatialAnchorId: blueprint.spatialAnchorId,
    strategyMode: blueprint.flowAxis === "diagonal" ? "contrastMotion" : blueprint.flowAxis === "centered" ? "centerLockup" : "followBackgroundShape",
    orientationPreference: blueprint.orientationPreference === "diagonalFirst" ? "diagonalAllowed" : blueprint.orientationPreference === "horizontalFirst" ? "horizontalFirst" : blueprint.orientationPreference === "verticalFirst" ? "verticalFirst" : "stackedAllowed",
    patternKeys: blueprint.patternKeys as TitleCandidate["patternKeys"],
    hybridStrategy: `低保真 preview adapter from ${blueprint.compositionMode}.`,
    titleUnits: blueprint.titleUnits.slice().sort((a, b) => a.readingOrder - b.readingOrder).map(previewUnitFromBlueprint),
    ...(previewSubtitleFromBlueprint(blueprint) ? { subtitle: previewSubtitleFromBlueprint(blueprint) } : {}),
    effectIntent: EFFECTS.includes(blueprint.effectIntent as TitleCandidate["effectIntent"]) ? blueprint.effectIntent as TitleCandidate["effectIntent"] : "cleanReadable",
    decorationIntents: blueprint.decorationIntents.filter((item): item is TitleCandidate["decorationIntents"][number] => DECORATIONS.includes(item as TitleCandidate["decorationIntents"][number])),
    readabilityPlan: "由 lockupBox / unitBox 中心点派生，仅服务低保真 debug preview。",
    backgroundFitReason: blueprint.reason,
    whyNotTemplate: "主结构来自 TitleLockupBlueprint，legacy candidate 仅用于低保真 preview 兼容。",
  };
}

function previewUnitFromBlueprint(unit: TitleLockupUnit): TitleCandidate["titleUnits"][number] {
  return {
    text: unit.text,
    role: unit.visualRole === "hero" ? "main" : unit.visualRole,
    direction: unit.direction === "vertical" ? "vertical" : "horizontal",
    x: Math.round(unit.unitBox.x + unit.unitBox.width / 2),
    y: Math.round(unit.unitBox.y + unit.unitBox.height / 2),
    scale: clamp(0.72 + unit.visualWeight * 0.14, 0.72, 1.4),
    rotationDeg: unit.unitBox.rotationDeg,
  };
}

function previewSubtitleFromBlueprint(blueprint: TitleLockupBlueprint): TitleCandidate["subtitle"] | undefined {
  const box = blueprint.subtitleLockup.subtitleBox;
  if (!box || blueprint.subtitleLockup.placementPolicy === "hidden") return undefined;
  return {
    text: blueprint.subtitleLockup.text,
    x: Math.round(box.x + box.width / 2),
    y: Math.round(box.y + box.height / 2),
    scale: clamp(0.72 + blueprint.subtitleLockup.visualWeight * 0.06, 0.72, 1.05),
    placement: blueprint.subtitleLockup.placementPolicy === "belowMainLockup" ? "below" : "side",
  };
}

function runSafetyChecks(result: GenerateScoredRefinedTitleCandidatesResult): string[] {
  const failures: string[] = [];
  const refinedIds = Object.values(result.diagnostics.refinedCandidateIdMap);
  const sourceByRefined = result.diagnostics.sourceCandidateIdMap;
  const originalById = toMap(result.candidateResult.lockupBlueprints);
  const finalIds = result.finalCandidatePool.map((item) => item.candidateId);
  if (new Set(refinedIds).size !== refinedIds.length) failures.push("refined candidateId not unique");
  refinedIds.forEach((id) => { if (!sourceByRefined[id] || !originalById.has(sourceByRefined[id])) failures.push(`refined id cannot trace source: ${id}`); });
  if (result.finalCandidatePool.some((item) => item.isFallbackCandidate)) failures.push("final pool contains fallback");
  if (result.candidateResult.source === "fallback" && result.finalCandidatePool.length > 0) failures.push("fallback run produced formal final pool");
  result.finalCandidatePool.forEach((item) => { if (result.diagnostics.rejectedCandidateIds.includes(sourceByRefined[item.candidateId] ?? item.candidateId)) failures.push(`final pool contains scorer rejected: ${item.candidateId}`); });
  [...result.candidateResult.lockupBlueprints, ...result.finalCandidatePool].forEach((item) => {
    if (orderedTitle(item) !== item.mainTitle) failures.push(`readingOrder mismatch: ${item.candidateId}`);
    if (!sameBox(item.spatialContract.lockupBox, item.lockupBox, true)) failures.push(`spatialContract lockupBox drift: ${item.candidateId}`);
  });
  if (result.finalCandidatePool.some((item) => (sourceByRefined[item.candidateId] ?? item.candidateId) === "c2")) failures.push("c2 entered final pool body");
  KEEP_IDS.forEach((id) => { if (result.recommendedCandidateIds.includes(id)) failures.push(`${id} entered recommended ids`); });
  if (result.candidateResult.source !== "fallback") checkExpectedShape(result, failures);
  return failures;
}

function checkExpectedShape(result: GenerateScoredRefinedTitleCandidatesResult, failures: string[]): void {
  PAIRS.forEach(({ sourceId, refinedId }) => {
    if (result.diagnostics.refinedCandidateIdMap[sourceId] !== refinedId) failures.push(`refined map mismatch: ${sourceId}`);
    if (!result.finalCandidatePool.some((item) => item.candidateId === refinedId)) failures.push(`final pool missing: ${refinedId}`);
  });
  KEEP_IDS.forEach((id) => { if (scoringAction(result, id) !== "keep") failures.push(`${id} is not keep`); });
  const c2 = result.scoringResult.results.find((item) => item.candidateId === "c2");
  if (!c2?.shouldReject || c2.rejectionReasonCode !== "strategy_mismatch_vertical_first") failures.push("c2 rejected diagnostic mismatch");
}

function buildGeometryDeltas(rows: PairRow[]): Record<string, unknown> {
  return Object.fromEntries(rows.map((row) => [`${row.sourceId}->${row.refinedId}`, {
    lockupBox: { before: box(row.original.lockupBox), after: box(row.refined.lockupBox) },
    unitBoxes: { before: unitBoxes(row.original), after: unitBoxes(row.refined) },
    subtitleBox: { before: maybeBox(row.original.subtitleLockup.subtitleBox), after: maybeBox(row.refined.subtitleLockup.subtitleBox) },
    minUnitGap: { before: minUnitGap(row.original), after: minUnitGap(row.refined) },
    heroToLeadRatio: { before: heroToLeadRatio(row.original), after: heroToLeadRatio(row.refined) },
  }]));
}

function buildVisualReviewNotes(rows: PairRow[], result: GenerateScoredRefinedTitleCandidatesResult): Record<string, unknown> {
  return {
    unitSpacing: rows.map((row) => `${row.sourceId}->${row.refinedId}: ${minUnitGap(row.refined) >= minUnitGap(row.original) ? "increased_or_preserved" : "reduced"} (${minUnitGap(row.original)}->${minUnitGap(row.refined)})`),
    hierarchy: rows.map((row) => `${row.sourceId}->${row.refinedId}: hero/lead ${heroToLeadRatio(row.original)}->${heroToLeadRatio(row.refined)}, actions=${row.actions}`),
    subtitleSafety: rows.map((row) => `${row.sourceId}->${row.refinedId}: ${subtitleSummary(row.original)} -> ${subtitleSummary(row.refined)}`),
    mainTitlePreserved: rows.every((row) => orderedTitle(row.original) === row.original.mainTitle && orderedTitle(row.refined) === row.refined.mainTitle),
    rejectedC2: `c2 only appears in diagnostic panel because scorer rejected it with ${scoringNote(result, "c2")}.`,
    fallbackPolicy: result.candidateResult.source === "fallback" ? "fallback run is diagnostic-only; no formal comparison pairs are fabricated." : "ai run uses formal final pool pairs.",
  };
}

async function renderComparisonContactSheet(input: { pairs: PairRow[]; originalPaths: PreviewMap; refinedPaths: PreviewMap; keepRows: SheetRow[]; rejectedRows: SheetRow[]; isFallback: boolean }): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const margin = 32, gap = 28, thumbWidth = 360, thumbHeight = 540, rowHeight = 636, panelHeight = 360;
  const width = margin * 2 + thumbWidth * 2 + gap;
  const pairHeight = input.pairs.length * rowHeight;
  const keepTop = margin + pairHeight;
  const rejectedTop = keepTop + (input.keepRows.length > 0 ? panelHeight : 92);
  const height = rejectedTop + (input.rejectedRows.length > 0 ? panelHeight : 160) + margin;
  const labels: string[] = [];
  const composites: sharp.OverlayOptions[] = [];
  labels.push(`<text class="h" x="${margin}" y="28">Pipeline Preview Comparison ${input.isFallback ? "(fallback diagnostic-only)" : ""}</text>`);
  for (const [index, row] of input.pairs.entries()) {
    const top = margin + index * rowHeight;
    labels.push(`<text class="h" x="${margin}" y="${top + 34}">${escapeXml(`${row.sourceId} -> ${row.refinedId} | ${shortActions(row.actions)}`)}</text>`);
    labels.push(`<text class="m" x="${margin}" y="${top + 64}">original ${row.sourceId}</text><text class="m" x="${margin + thumbWidth + gap}" y="${top + 64}">refined ${row.refinedId}</text>`);
    await addImage(composites, input.originalPaths[row.sourceId], margin, top + 78, thumbWidth, thumbHeight);
    await addImage(composites, input.refinedPaths[row.refinedId], margin + thumbWidth + gap, top + 78, thumbWidth, thumbHeight);
  }
  labels.push(`<rect x="20" y="${keepTop}" width="${width - 40}" height="${input.keepRows.length > 0 ? panelHeight - 24 : 76}" rx="10" fill="#E0F2FE"/><text class="h" x="${margin}" y="${keepTop + 42}">Keep panel</text>`);
  for (const [index, row] of input.keepRows.entries()) {
    const left = index === 0 ? margin : margin + thumbWidth + gap;
    labels.push(`<text class="m" x="${left}" y="${keepTop + 76}">${escapeXml(`${row.label} keep | ${shortNote(row.note)}`)}</text>`);
    await addImage(composites, row.path, left, keepTop + 92, 220, 220);
  }
  labels.push(`<rect x="20" y="${rejectedTop}" width="${width - 40}" height="${input.rejectedRows.length > 0 ? panelHeight - 24 : 96}" rx="10" fill="#FEE2E2"/><text class="h" x="${margin}" y="${rejectedTop + 42}">Rejected diagnostic panel</text>`);
  for (const [index, row] of input.rejectedRows.entries()) {
    const left = margin + index * (220 + gap);
    labels.push(`<text class="m" x="${left}" y="${rejectedTop + 76}">${escapeXml(`${row.label} rejected | ${shortNote(row.note)}`)}</text>`);
    await addImage(composites, row.path, left, rejectedTop + 92, 220, 220);
  }
  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><style>.h{font-family:Arial,"PingFang SC",sans-serif;font-size:22px;font-weight:800;fill:#0F172A}.m{font-family:Arial,"PingFang SC",sans-serif;font-size:16px;font-weight:700;fill:#334155}</style>${labels.join("\n")}</svg>`;
  await sharp({ create: { width, height, channels: 3, background: "#F8FAFC" } }).composite([{ input: Buffer.from(svg), top: 0, left: 0 }, ...composites]).jpeg({ quality: 86 }).toFile(CONTACT_SHEET_PATH);
}

async function addImage(composites: sharp.OverlayOptions[], inputPath: string | undefined, left: number, top: number, width: number, height: number): Promise<void> {
  if (!inputPath) return;
  composites.push({ input: await sharp(inputPath).resize(width, height, { fit: "cover" }).toBuffer(), left, top });
}

function originalSafetyFlags(result: GenerateScoredRefinedTitleCandidatesResult): unknown {
  return result.scoringResult.results.map((item) => ({ candidateId: item.candidateId, recommendedAction: item.recommendedAction, shouldReject: item.shouldReject, rejectionReasonCode: item.rejectionReasonCode, totalScore: item.score.totalScore, warnings: item.score.warnings }));
}
function refinedSafetyFlags(result: GenerateScoredRefinedTitleCandidatesResult): unknown {
  return { finalPool: result.diagnostics.safetyFlags, refined: result.refinementResult.refinedBlueprints.map((item) => ({ sourceCandidateId: item.sourceCandidateId, refinedCandidateId: item.refinedCandidateId, passed: item.safety.passed, reasons: item.safety.reasons })) };
}
function actionSummary(result: GenerateScoredRefinedTitleCandidatesResult, id: string): string { return result.refinementResult.refinementActions.filter((item) => item.sourceCandidateId === id).map((item) => item.type).join("+") || "preserveAsIs"; }
function scoringAction(result: GenerateScoredRefinedTitleCandidatesResult, id: string): string | undefined { return result.scoringResult.results.find((item) => item.candidateId === id)?.recommendedAction; }
function scoringNote(result: GenerateScoredRefinedTitleCandidatesResult, id: string): string { const item = result.scoringResult.results.find((score) => score.candidateId === id); return item ? `${item.recommendedAction}:${item.rejectionReasonCode}:${item.keepButDoNotRefineReason ?? "none"}` : "missing"; }
function shortActions(value: string): string { return value.replace(/expandLockupBox/g, "expand").replace(/normalizeThreeStepSpacing/g, "spacing").replace(/increaseHeroUnitHeight/g, "heroHeight").replace(/restoreSubtitleBelowLockup/g, "subtitle").replace(/rebalanceUnitBoxes/g, "rebalance"); }
function shortNote(value: string): string { const parts = value.split(":"); return parts.find((part) => part !== "keep" && part !== "reject" && part !== "none") ?? value; }
function toMap(blueprints: readonly TitleLockupBlueprint[]): Map<string, TitleLockupBlueprint> { return new Map(blueprints.map((item) => [item.candidateId, item])); }
function orderedTitle(blueprint: TitleLockupBlueprint): string { return blueprint.titleUnits.slice().sort((a, b) => a.readingOrder - b.readingOrder).map((unit) => unit.text).join(""); }
function unitBoxes(blueprint: TitleLockupBlueprint): unknown[] { return blueprint.titleUnits.slice().sort((a, b) => a.readingOrder - b.readingOrder).map((unit) => ({ text: unit.text, role: unit.visualRole, box: box(unit.unitBox) })); }
function maybeBox(value: TitleBox | null): TitleBox | null { return value ? box(value) : null; }
function box(value: TitleBox): TitleBox { return { x: value.x, y: value.y, width: value.width, height: value.height }; }
function sameBox(left: ComparableBox, right: ComparableBox, withLockupFields = false): boolean { return Math.round(left.x) === Math.round(right.x) && Math.round(left.y) === Math.round(right.y) && Math.round(left.width) === Math.round(right.width) && Math.round(left.height) === Math.round(right.height) && (!withLockupFields || (left.safePadding === right.safePadding && left.allowedOverflowPx === right.allowedOverflowPx)); }
function minUnitGap(blueprint: TitleLockupBlueprint): number { const boxes = blueprint.titleUnits.map((unit) => unit.unitBox).sort((a, b) => a.y - b.y); if (boxes.length < 2) return 0; return Math.min(...boxes.slice(1).map((item, index) => Math.round(item.y - (boxes[index].y + boxes[index].height)))); }
function heroToLeadRatio(blueprint: TitleLockupBlueprint): number { const hero = Math.max(1, ...blueprint.titleUnits.filter((unit) => unit.visualRole === "hero").map((unit) => unit.unitBox.height)); const other = Math.max(1, ...blueprint.titleUnits.filter((unit) => unit.visualRole !== "hero").map((unit) => unit.unitBox.height)); return Number((hero / other).toFixed(2)); }
function subtitleSummary(blueprint: TitleLockupBlueprint): string { const subtitleBox = blueprint.subtitleLockup.subtitleBox; return subtitleBox ? `${blueprint.subtitleLockup.placementPolicy}@${subtitleBox.y}` : "hidden"; }
function clamp(value: number, min: number, max: number): number { return Number(Math.max(min, Math.min(max, value)).toFixed(2)); }
function escapeXml(value: string): string { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;"); }

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("TITLE_CANDIDATE_PIPELINE_PREVIEW_COMPARISON_FAILED", message);
  process.exit(1);
});
