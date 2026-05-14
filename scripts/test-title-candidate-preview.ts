import { existsSync, readFileSync } from "node:fs";
import type { TitleLockupBlueprint } from "../src/config/title-lockup-blueprint";
import { generateTitleCandidates } from "../src/services/title-candidate.service";
import { renderTitleCandidatePreviews } from "../src/services/title-candidate-preview.service";

const BACKGROUND_IMAGE_PATH = "/tmp/yuanfang-title-director-bg.jpg";
const OUTPUT_DIR = "/tmp";

async function main(): Promise<void> {
  if (!existsSync(BACKGROUND_IMAGE_PATH)) {
    console.error("TITLE_CANDIDATE_PREVIEW_BACKGROUND_MISSING", BACKGROUND_IMAGE_PATH);
    process.exit(1);
  }

  const backgroundImageBase64 = readFileSync(BACKGROUND_IMAGE_PATH).toString("base64");
  const candidateResult = await generateTitleCandidates({
    backgroundImageBase64,
    mainTitle: "成长汇报课",
    subtitle: "看见孩子的表达力量",
    designFamily: "achievementShowcase",
    layoutFamily: "centerTitle",
    displayPolicy: "titleOnlyDefault",
    productOutputType: "mainVisual",
    eventBrief:
      "这是一次学期成长汇报课，孩子会展示阅读、写作、表达和课堂展示方面的成长。",
    styleBrief: "明亮、有仪式感、有成果感，也要专业可信。",
    visualDetails: "作品墙、展示台、舞台光、奖章、表达麦克风、课程成果板。",
    avoidNotes: "不要山水卷轴、不要低幼卡通、不要人物太多。",
  });
  const previewResult = await renderTitleCandidatePreviews({
    backgroundImagePath: BACKGROUND_IMAGE_PATH,
    outputDir: OUTPUT_DIR,
    candidates: candidateResult.candidates,
    lockupBlueprints: candidateResult.lockupBlueprints,
    debugOverlay: true,
    spatialStrategy: candidateResult.spatialStrategy,
  });

  console.log("PREVIEW_SOURCE", candidateResult.source);
  console.log("PREVIEW_REASON", candidateResult.reason);
  console.log("PREVIEW_CANDIDATE_COUNT", candidateResult.candidates.length);
  console.log("PREVIEW_BLUEPRINT_COUNT", candidateResult.lockupBlueprints.length);
  console.log("PREVIEW_DEBUG_OVERLAY", "true");
  console.log("SPATIAL_STRATEGY_SOURCE", candidateResult.spatialStrategy.source);
  console.log("CONTENT_INTENT", candidateResult.spatialStrategy.contentIntent);
  console.log("STRATEGY_MODE", candidateResult.spatialStrategy.strategyMode);
  console.log("ORIENTATION_PREFERENCE", candidateResult.spatialStrategy.orientationPreference);
  console.log("PRIMARY_TEXT_ANCHOR", candidateResult.spatialStrategy.primaryTextAnchorId);
  console.log("PRIMARY_PATTERNS", candidateResult.spatialStrategy.patternPool.primary.join(","));
  console.log("DISALLOWED_PATTERNS", candidateResult.spatialStrategy.patternPool.disallowed.join(","));
  console.log("FIRST_PREVIEW_LOCKUP_BOX", JSON.stringify(candidateResult.lockupBlueprints[0]?.lockupBox ?? null));
  console.log(
    "FIRST_PREVIEW_UNIT_BOXES",
    JSON.stringify(candidateResult.lockupBlueprints[0]?.titleUnits.map((unit) => unit.unitBox) ?? []),
  );
  console.log(
    "FIRST_PREVIEW_SUBTITLE_BOX",
    JSON.stringify(candidateResult.lockupBlueprints[0]?.subtitleLockup.subtitleBox ?? null),
  );
  console.log(
    "BLUEPRINT_VERTICAL_ORGANIZATION_FLAGS",
    candidateResult.lockupBlueprints.map((blueprint) => String(blueprintUsesVerticalOrganization(blueprint))).join(","),
  );
  console.log(
    "BLUEPRINT_LOCKUP_BOX_ASPECTS",
    candidateResult.lockupBlueprints.map((blueprint) => getBlueprintLockupBoxAspect(blueprint)).join(","),
  );
  console.log(
    "BLUEPRINT_UNIT_Y_SPANS",
    candidateResult.lockupBlueprints.map((blueprint) => getBlueprintUnitYSpan(blueprint)).join(","),
  );
  console.log("PREVIEW_PATHS", previewResult.previewPaths.join(","));
  console.log("CONTACT_SHEET_PATH", previewResult.contactSheetPath);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error("TITLE_CANDIDATE_PREVIEW_FAILED", message);
  process.exit(1);
});

function blueprintUsesVerticalOrganization(blueprint: TitleLockupBlueprint): boolean {
  if (blueprint.flowAxis === "vertical") return true;
  if (blueprint.compositionMode === "verticalHeroStack" || blueprint.compositionMode === "staggeredColumn") return true;
  if (blueprint.titleUnits.some((unit) => unit.direction === "vertical")) return true;
  if (blueprint.titleUnits.length < 2) return false;

  const ySpan = getBlueprintUnitYSpan(blueprint);
  const aspect = getBlueprintLockupBoxAspect(blueprint);
  const spanThreshold = Math.max(60, Math.min(120, blueprint.lockupBox.height * 0.22));

  if (
    blueprint.orientationPreference === "verticalFirst" &&
    (blueprint.compositionMode === "centerStageLockup" || blueprint.compositionMode === "badgeHeroLockup") &&
    ySpan >= spanThreshold
  ) {
    return true;
  }

  return aspect > 1.15 && ySpan >= spanThreshold || ySpan >= 80;
}

function getBlueprintUnitYSpan(blueprint: TitleLockupBlueprint): number {
  if (blueprint.titleUnits.length < 2) return 0;

  const yCenters = blueprint.titleUnits.map((unit) => unit.unitBox.y + unit.unitBox.height / 2);

  return Math.round(Math.max(...yCenters) - Math.min(...yCenters));
}

function getBlueprintLockupBoxAspect(blueprint: TitleLockupBlueprint): number {
  return Number((blueprint.lockupBox.height / Math.max(1, blueprint.lockupBox.width)).toFixed(2));
}
