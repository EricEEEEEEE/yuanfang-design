import { existsSync, readFileSync } from "node:fs";
import type { TitleLockupBlueprint } from "../src/config/title-lockup-blueprint";
import { generateTitleCandidates } from "../src/services/title-candidate.service";

const BACKGROUND_IMAGE_PATH = "/tmp/yuanfang-title-director-bg.jpg";

async function main(): Promise<void> {
  if (!existsSync(BACKGROUND_IMAGE_PATH)) {
    console.error("TITLE_CANDIDATES_TEST_IMAGE_MISSING", BACKGROUND_IMAGE_PATH);
    process.exit(1);
  }

  const backgroundImageBase64 = readFileSync(BACKGROUND_IMAGE_PATH).toString("base64");
  const result = await generateTitleCandidates({
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

  console.error("TITLE_CANDIDATES_SOURCE", result.source);
  console.error("TITLE_CANDIDATES_REASON", result.reason);
  console.error("TITLE_CANDIDATES_COUNT", result.candidates.length);
  if (result.source === "fallback") {
    console.error("TITLE_CANDIDATES_SOURCE fallback FAIL", result.reason);
  }
  if (result.source === "fallback" && result.candidates.length === 0) {
    console.error("TITLE_CANDIDATES_COUNT 0 FAIL", result.reason);
  }
  console.error("STRUCTURED_OUTPUT_MODE", result.structuredOutputMode);
  console.error("LOCKUP_DRAFT_COUNT", result.lockupDraftCount);
  console.error("LOCKUP_DRAFT_FIELDS", result.lockupDraftFields.join(","));
  console.error(
    "FIRST_DRAFT_UNIT_LAYOUT_HINTS",
    JSON.stringify(result.firstDraftUnitLayoutHints),
  );
  console.error("TITLE_LOCKUP_BLUEPRINT_COUNT", result.lockupBlueprints.length);
  if (result.source === "fallback" && result.lockupBlueprints.length === 0) {
    console.error("TITLE_LOCKUP_BLUEPRINT_COUNT 0 FAIL", result.reason);
  }
  console.error(
    "TITLE_LOCKUP_BLUEPRINTS",
    result.lockupBlueprints
      .map((blueprint) => [
        blueprint.candidateId,
        blueprint.spatialAnchorId,
        blueprint.semanticSplitId,
        blueprint.compositionMode,
        blueprint.flowAxis,
      ].join(":"))
      .join(" | "),
  );
  console.error(
    "BLUEPRINT_CANDIDATE_IDS",
    result.lockupBlueprints.map((blueprint) => blueprint.candidateId).join(","),
  );
  console.error(
    "BLUEPRINT_PATTERN_KEYS",
    result.lockupBlueprints
      .map((blueprint) => `${blueprint.candidateId}:${blueprint.patternKeys.join("+")}`)
      .join(" | "),
  );
  console.error(
    "BLUEPRINT_COMPOSITION_MODES",
    result.lockupBlueprints.map((blueprint) => blueprint.compositionMode).join(","),
  );
  console.error(
    "BLUEPRINT_FLOW_AXES",
    result.lockupBlueprints.map((blueprint) => blueprint.flowAxis).join(","),
  );
  console.error(
    "BLUEPRINT_ORIENTATION_PREFERENCES",
    result.lockupBlueprints.map((blueprint) => blueprint.orientationPreference).join(","),
  );
  console.error(
    "BLUEPRINT_SEMANTIC_SPLITS",
    result.lockupBlueprints.map((blueprint) => blueprint.semanticSplitId).join(","),
  );
  console.error(
    "BLUEPRINT_IS_FALLBACK_FLAGS",
    result.lockupBlueprints.map((blueprint) => String(blueprint.isFallbackCandidate)).join(","),
  );
  console.error(
    "BLUEPRINT_VERTICAL_ORGANIZATION_FLAGS",
    result.lockupBlueprints.map((blueprint) => String(blueprintUsesVerticalOrganization(blueprint))).join(","),
  );
  console.error(
    "BLUEPRINT_LOCKUP_BOX_ASPECTS",
    result.lockupBlueprints.map((blueprint) => getBlueprintLockupBoxAspect(blueprint)).join(","),
  );
  console.error(
    "BLUEPRINT_UNIT_Y_SPANS",
    result.lockupBlueprints.map((blueprint) => getBlueprintUnitYSpan(blueprint)).join(","),
  );
  console.error(
    "FIRST_BLUEPRINT_LOCKUP_BOX",
    JSON.stringify(result.lockupBlueprints[0]?.lockupBox ?? null),
  );
  console.error(
    "FIRST_BLUEPRINT_READING_ORDER",
    JSON.stringify(result.lockupBlueprints[0]?.readingOrder ?? null),
  );
  console.error(
    "FIRST_BLUEPRINT_UNIT_BOXES",
    JSON.stringify(result.lockupBlueprints[0]?.titleUnits.map((unit) => ({
      text: unit.text,
      box: unit.unitBox,
    })) ?? null),
  );
  console.error(
    "FIRST_BLUEPRINT_SUBTITLE_LOCKUP",
    JSON.stringify(result.lockupBlueprints[0]?.subtitleLockup ?? null),
  );
  console.error("SPATIAL_STRATEGY_SOURCE", result.spatialStrategy.source);
  console.error("CONTENT_INTENT", result.spatialStrategy.contentIntent);
  console.error("STRATEGY_MODE", result.spatialStrategy.strategyMode);
  console.error("ORIENTATION_PREFERENCE", result.spatialStrategy.orientationPreference);
  console.error("PRIMARY_TEXT_ANCHOR", result.spatialStrategy.primaryTextAnchorId);
  console.error("PRIMARY_PATTERNS", result.spatialStrategy.patternPool.primary.join(","));
  console.error("DISALLOWED_PATTERNS", result.spatialStrategy.patternPool.disallowed.join(","));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error("TITLE_CANDIDATES_TEST_FAILED", message);
  process.exit(1);
});

function blueprintUsesVerticalOrganization(blueprint: TitleLockupBlueprint): boolean {
  if (blueprint.flowAxis === "vertical") return true;
  if (blueprint.compositionMode === "verticalHeroStack" || blueprint.compositionMode === "staggeredColumn") return true;
  if (blueprint.titleUnits.some((unit) => unit.direction === "vertical")) return true;
  if (blueprint.titleUnits.length < 2) return false;

  const ySpan = getBlueprintUnitYSpan(blueprint);
  const aspect = getBlueprintLockupBoxAspect(blueprint);
  const spanThreshold = Math.max(40, Math.min(120, blueprint.lockupBox.height * 0.22));

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
