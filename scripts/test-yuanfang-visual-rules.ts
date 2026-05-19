import {
  YUANFANG_CANVAS_INTENTS,
  YUANFANG_BACKGROUND_RULES,
  YUANFANG_LOGO_STRATEGIES,
  YUANFANG_NEGATIVE_RULES,
  YUANFANG_STYLE_TREATMENTS,
  YUANFANG_TITLE_RULES,
  YUANFANG_VISUAL_RULE_CONSUMER_MAPPING,
  YUANFANG_VISUAL_RULE_LAYER,
} from "../src/config/yuanfang-design-rules";
import { YUANFANG_VISUAL_BENCHMARK_FAMILIES } from "../src/config/yuanfang-visual-benchmark";
import { YUANFANG_LAYOUT_GRAMMAR, YUANFANG_RULE_DIMENSIONS } from "../src/config/yuanfang-visual-grammar";
import type { YuanfangCanvasIntentKey, YuanfangLayoutGrammarKey, YuanfangLogoStrategyKey, YuanfangRuleDimensionKey, YuanfangStyleTreatmentKey, YuanfangVisualFamilyKey } from "../src/models/yuanfang-visual-rules";

const REQUIRED_FAMILIES: YuanfangVisualFamilyKey[] = [
  "companyActivity",
  "brandEvent",
  "openClass",
  "enrollment",
  "literaryActivity",
  "campusActivity",
  "teachingCompetition",
  "guofengLiterature",
  "poetryFestival",
  "achievementShowcase",
];
const REQUIRED_DIMENSIONS: YuanfangRuleDimensionKey[] = [
  "themeClarity",
  "visualDensity",
  "brandFeeling",
  "titleDominance",
  "layoutDiversity",
  "titleSafeZone",
  "logoSafeZone",
  "mascotRole",
  "backgroundComplexity",
  "textPollutionRisk",
  "aiGenericRisk",
  "customerUsability",
];
const REQUIRED_LAYOUTS: YuanfangLayoutGrammarKey[] = [
  "topHeroTitle",
  "leftTitleRightVisual",
  "rightTitleLeftVisual",
  "centerHeroLockup",
  "diagonalCampaignFlow",
  "verticalSealTitle",
  "bottomInformationPanel",
  "stageShowcase",
  "splitColorBlock",
  "frameContainer",
];
const REQUIRED_LOGO_STRATEGIES: YuanfangLogoStrategyKey[] = ["colorFullLockup", "whiteLockup", "deepBlueLockup", "repositionPreferred", "minimalProtectionPatch"];
const REQUIRED_CANVAS_INTENTS: YuanfangCanvasIntentKey[] = ["verticalPoster", "horizontalKeyVisual", "squareSocial"];
const REQUIRED_STYLE_TREATMENTS: YuanfangStyleTreatmentKey[] = ["brandKineticKV", "boldEnrollmentCampaign", "literaryEditorialCollage", "modernGuofengInk", "warmAchievementStage", "campusHonorFormal", "techBlueLearning", "premiumMinimalNotice"];

const failures: string[] = [];

assert("families source matches aggregate", YUANFANG_VISUAL_RULE_LAYER.families === YUANFANG_VISUAL_BENCHMARK_FAMILIES);
assert("dimensions source matches aggregate", YUANFANG_VISUAL_RULE_LAYER.dimensions === YUANFANG_RULE_DIMENSIONS);
assert("layouts source matches aggregate", YUANFANG_VISUAL_RULE_LAYER.layouts === YUANFANG_LAYOUT_GRAMMAR);
assert("logo strategies source matches aggregate", YUANFANG_VISUAL_RULE_LAYER.logoStrategies === YUANFANG_LOGO_STRATEGIES);
assert("canvas intents source matches aggregate", YUANFANG_VISUAL_RULE_LAYER.canvasIntents === YUANFANG_CANVAS_INTENTS);
assert("style treatments source matches aggregate", YUANFANG_VISUAL_RULE_LAYER.styleTreatments === YUANFANG_STYLE_TREATMENTS);
assert("required families exist", includesAll(Object.keys(YUANFANG_VISUAL_BENCHMARK_FAMILIES), REQUIRED_FAMILIES));
assert("required dimensions exist", includesAll(Object.keys(YUANFANG_RULE_DIMENSIONS), REQUIRED_DIMENSIONS));
assert("required layouts exist", includesAll(Object.keys(YUANFANG_LAYOUT_GRAMMAR), REQUIRED_LAYOUTS));
assert("required logo strategies exist", includesAll(Object.keys(YUANFANG_LOGO_STRATEGIES), REQUIRED_LOGO_STRATEGIES));
assert("required canvas intents exist", includesAll(Object.keys(YUANFANG_CANVAS_INTENTS), REQUIRED_CANVAS_INTENTS));
assert("required style treatments exist", includesAll(Object.keys(YUANFANG_STYLE_TREATMENTS), REQUIRED_STYLE_TREATMENTS));

for (const family of Object.values(YUANFANG_VISUAL_BENCHMARK_FAMILIES)) {
  assert(`${family.key} is not empty`, family.visualRequirements.length >= 5 && family.primaryMotifs.length >= 3);
  assert(`${family.key} has all required dimensions`, includesAll(family.requiredDimensions, REQUIRED_DIMENSIONS));
  assert(`${family.key} has layout grammar`, family.preferredLayouts.length >= 3);
  assert(`${family.key} has diversity hints`, family.preferredStyleTreatments.length > 0 && family.preferredCanvasIntents.length > 0 && family.logoStrategyHints.length > 0);
  assert(`${family.key} is not single-sample-only`, family.usedFor.length >= 3 && family.aliases.length >= 1);
}

for (const dimension of Object.values(YUANFANG_RULE_DIMENSIONS)) {
  assert(`${dimension.key} has stable rule key`, dimension.ruleKey.startsWith("l2."));
  assert(`${dimension.key} has acceptance and failures`, dimension.acceptance.length > 0 && dimension.failureSignals.length > 0);
  assert(`${dimension.key} has L3/L4/L5/L6 consumers`, dimension.consumers.length > 0);
}

for (const layout of Object.values(YUANFANG_LAYOUT_GRAMMAR)) {
  assert(`${layout.key} has family mapping`, layout.families.length > 0);
  assert(`${layout.key} has title/logo/safe-zone info`, Boolean(layout.titlePlacement && layout.logoSafeZone && layout.titleSafeZone));
  assert(`${layout.key} has forbidden cases`, layout.forbiddenWhen.length > 0);
}

for (const logo of Object.values(YUANFANG_LOGO_STRATEGIES)) {
  assert(`${logo.key} has full logo policy`, logo.protectionPolicy.includes("logo") || logo.protectionPolicy.includes("Logo"));
  assert(`${logo.key} has placement candidates`, logo.placementCandidates.length > 0);
}

for (const canvas of Object.values(YUANFANG_CANVAS_INTENTS)) {
  assert(`${canvas.key} has aspect class`, ["vertical", "horizontal", "square"].includes(canvas.aspectRatioClass));
  assert(`${canvas.key} has prompt guidance`, Boolean(canvas.promptGuidance));
}

for (const treatment of Object.values(YUANFANG_STYLE_TREATMENTS)) {
  assert(`${treatment.key} has style guidance`, treatment.suitableFamilies.length > 0 && Boolean(treatment.promptGuidance));
  assert(`${treatment.key} has avoid list`, treatment.avoid.length > 0);
}

assert("title rules mention no small center text", containsText(YUANFANG_TITLE_RULES, "small center text"));
assert("background rules mention empty placeholder", containsText(YUANFANG_BACKGROUND_RULES, "empty placeholder"));
assert("negative rules include no readable", containsText(YUANFANG_NEGATIVE_RULES, "no readable"));
assert("negative rules include fake Chinese", containsText(YUANFANG_NEGATIVE_RULES, "fake Chinese"));
assert("negative rules include fake logo", containsText(YUANFANG_NEGATIVE_RULES, "fake logo"));
assert("negative rules include generated mascot", containsText(YUANFANG_NEGATIVE_RULES, "generated mascot"));
assert("negative rules include campus phone", containsText(YUANFANG_NEGATIVE_RULES, "campus phone"));
assert("consumer mapping covers L3", YUANFANG_VISUAL_RULE_CONSUMER_MAPPING.L3_BACKGROUND.length >= 5);
assert("consumer mapping covers L6", YUANFANG_VISUAL_RULE_CONSUMER_MAPPING.L6_TITLE.length >= 4);

console.log("YUANFANG_VISUAL_FAMILIES_COUNT", Object.keys(YUANFANG_VISUAL_BENCHMARK_FAMILIES).length);
console.log("YUANFANG_VISUAL_RULE_DIMENSIONS_PASS", passLabel(failures.length === 0));
console.log("YUANFANG_LAYOUT_GRAMMAR_PASS", passLabel(REQUIRED_LAYOUTS.every((key) => YUANFANG_LAYOUT_GRAMMAR[key])));
console.log("YUANFANG_TITLE_RULES_PASS", passLabel(YUANFANG_TITLE_RULES.length >= 5));
console.log("YUANFANG_BACKGROUND_RULES_PASS", passLabel(YUANFANG_BACKGROUND_RULES.length >= 5));
console.log("YUANFANG_NEGATIVE_RULES_PASS", passLabel(YUANFANG_NEGATIVE_RULES.length >= 10));
console.log("YUANFANG_LOGO_STRATEGIES_PASS", passLabel(REQUIRED_LOGO_STRATEGIES.every((key) => YUANFANG_LOGO_STRATEGIES[key])));
console.log("YUANFANG_CANVAS_INTENTS_PASS", passLabel(REQUIRED_CANVAS_INTENTS.every((key) => YUANFANG_CANVAS_INTENTS[key])));
console.log("YUANFANG_STYLE_TREATMENTS_PASS", passLabel(REQUIRED_STYLE_TREATMENTS.every((key) => YUANFANG_STYLE_TREATMENTS[key])));
console.log("YUANFANG_L2_READY_FOR_L3", failures.length === 0 ? "YES" : "NO");

if (failures.length > 0) {
  console.error("YUANFANG_VISUAL_RULE_FAILURES", JSON.stringify(failures));
  process.exitCode = 1;
}

function assert(label: string, value: boolean): void {
  if (!value) failures.push(label);
}

function includesAll<T extends string>(values: readonly string[], required: readonly T[]): boolean {
  return required.every((item) => values.includes(item));
}

function containsText(values: unknown, needle: string): boolean {
  return JSON.stringify(values).includes(needle);
}

function passLabel(value: boolean): "PASS" | "FAIL" {
  return value ? "PASS" : "FAIL";
}
