import { YUANFANG_VISUAL_BENCHMARK_FAMILIES } from "@/config/yuanfang-visual-benchmark";
import { YUANFANG_LAYOUT_GRAMMAR, YUANFANG_RULE_DIMENSIONS } from "@/config/yuanfang-visual-grammar";
import type {
  YuanfangBackgroundRule,
  YuanfangNegativeRule,
  YuanfangRuleConsumer,
  YuanfangTitleRule,
  YuanfangVisualRuleLayer,
} from "@/models/yuanfang-visual-rules";

export const YUANFANG_TITLE_RULES: YuanfangTitleRule[] = [
  {
    key: "titleVisualAsset",
    ruleKey: "l2.title.visualAsset",
    description: "title must be visual asset, not ordinary overlay text.",
    acceptance: ["mainTitle has dominant area and clear hierarchy", "title lockup coordinates with background shape"],
    failureSignals: ["small center text", "plain overlay", "title floats disconnected"],
    consumers: ["L6_TITLE", "L4_SPATIAL"],
  },
  {
    key: "titleDominance",
    ruleKey: "l2.title.dominance",
    description: "mainTitle should carry strong visual dominance and thumbnail readability.",
    acceptance: ["mainTitle is visually stronger than subtitle/support", "title is readable at thumbnail size"],
    failureSignals: ["mainTitle too small", "subtitle competes with hero title"],
    consumers: ["L6_TITLE"],
  },
  {
    key: "primaryMessageVisibility",
    ruleKey: "l2.title.primaryMessageVisibility",
    description: "subtitle or hook should remain visible when it carries primaryMessage.",
    acceptance: ["primaryMessage is represented by visible subtitle/hook or background motif", "no new title text is invented"],
    failureSignals: ["primaryMessage only hidden in diagnostics", "AI rewrites title text"],
    consumers: ["L5_PRIMARY_MESSAGE", "L6_TITLE"],
  },
  {
    key: "familyVariantLockup",
    ruleKey: "l2.title.familyVariantLockup",
    description: "title lockup should vary by benchmark family.",
    acceptance: ["family selects compatible layout grammar", "title can be top/left/right/center/diagonal/vertical"],
    failureSignals: ["same center lockup for every poster", "fixed coordinate tuning"],
    consumers: ["L6_TITLE"],
  },
  {
    key: "designedTitleArea",
    ruleKey: "l2.title.designedTitleArea",
    description: "title-safe zone should be designed, not blank.",
    acceptance: ["low-complexity texture/light/container supports title", "no text-like pattern near title"],
    failureSignals: ["empty placeholder", "overblank title zone", "over-crowded title zone"],
    consumers: ["L3_BACKGROUND", "L4_SPATIAL", "L6_TITLE"],
  },
];

export const YUANFANG_BACKGROUND_RULES: YuanfangBackgroundRule[] = [
  {
    key: "notEmptyBackground",
    ruleKey: "l2.background.notEmpty",
    description: "background must have theme area, shape, motion, texture, and visual focus.",
    acceptance: ["contains controlled motif and design density", "safe zones remain designed"],
    failureSignals: ["empty placeholder gradient", "blank center board", "lower decorative elements only"],
    consumers: ["L3_BACKGROUND"],
  },
  {
    key: "notGenericAiWallpaper",
    ruleKey: "l2.background.notGenericAiWallpaper",
    description: "background must not look like generic AI art, stock illustration, or wallpaper.",
    acceptance: ["family-specific motif is visible", "composition supports a poster title"],
    failureSignals: ["generic AI art", "stock illustration look", "decorative wallpaper without theme"],
    consumers: ["L3_BACKGROUND", "L5_PRIMARY_MESSAGE"],
  },
  {
    key: "familySpecificMotif",
    ruleKey: "l2.background.familySpecificMotif",
    description: "each benchmark family requires its own visual grammar and motifs.",
    acceptance: ["family primaryMotifs guide theme objects", "motifs stay outside title/logo safe zones"],
    failureSignals: ["one universal book/page/gradient template", "motif unrelated to user brief"],
    consumers: ["L3_BACKGROUND", "L5_PRIMARY_MESSAGE"],
  },
  {
    key: "supportTitleLockup",
    ruleKey: "l2.background.supportTitleLockup",
    description: "background must support a dominant title lockup instead of competing with it.",
    acceptance: ["title-safe zone is visible and low complexity", "background flow suggests title placement"],
    failureSignals: ["detailed subject in title zone", "title has nowhere to land"],
    consumers: ["L3_BACKGROUND", "L4_SPATIAL", "L6_TITLE"],
  },
  {
    key: "protectBrandAssets",
    ruleKey: "l2.background.protectBrandAssets",
    description: "background protects logo and optional mascot compositing areas.",
    acceptance: ["logo-safe zone protects full logo group", "mascot role remains auxiliary"],
    failureSignals: ["high detail behind logo", "generated mascot", "logo-safe zone too small"],
    consumers: ["L3_BACKGROUND", "L4_SPATIAL"],
  },
];

export const YUANFANG_NEGATIVE_RULES: YuanfangNegativeRule[] = [
  { key: "noReadableGeneratedText", ruleKey: "l2.negative.noReadableGeneratedText", description: "no readable generated text", consumers: ["L3_BACKGROUND", "L4_SPATIAL"] },
  { key: "noFakeChineseCharacters", ruleKey: "l2.negative.noFakeChineseCharacters", description: "no fake Chinese characters", consumers: ["L3_BACKGROUND", "L4_SPATIAL"] },
  { key: "noFakeLogo", ruleKey: "l2.negative.noFakeLogo", description: "no fake logo", consumers: ["L3_BACKGROUND"] },
  { key: "noGeneratedMascot", ruleKey: "l2.negative.noGeneratedMascot", description: "no generated mascot", consumers: ["L3_BACKGROUND"] },
  { key: "noQr", ruleKey: "l2.negative.noQr", description: "no QR", consumers: ["L3_BACKGROUND"] },
  { key: "noCampusPhoneAddressName", ruleKey: "l2.negative.noCampusPhoneAddressName", description: "no campus phone, campus address, or campus name", consumers: ["L3_BACKGROUND"] },
  { key: "noCheapPromoStyle", ruleKey: "l2.negative.noCheapPromoStyle", description: "no cheap promo style", consumers: ["L3_BACKGROUND"] },
  { key: "noGenericAiArt", ruleKey: "l2.negative.noGenericAiArt", description: "no generic AI art", consumers: ["L3_BACKGROUND", "L5_PRIMARY_MESSAGE"] },
  { key: "noStockIllustrationLook", ruleKey: "l2.negative.noStockIllustrationLook", description: "no stock illustration look", consumers: ["L3_BACKGROUND"] },
  { key: "noEmptyPlaceholderGradient", ruleKey: "l2.negative.noEmptyPlaceholderGradient", description: "no empty placeholder gradient", consumers: ["L3_BACKGROUND"] },
  { key: "noOverblankTitleZone", ruleKey: "l2.negative.noOverblankTitleZone", description: "no overblank title zone", consumers: ["L3_BACKGROUND", "L4_SPATIAL"] },
  { key: "noOvercrowdedTitleZone", ruleKey: "l2.negative.noOvercrowdedTitleZone", description: "no over-crowded title zone", consumers: ["L3_BACKGROUND", "L4_SPATIAL"] },
  { key: "noTextLikePatternsNearSafeZones", ruleKey: "l2.negative.noTextLikePatternsNearSafeZones", description: "no text-like patterns near title/logo zones", consumers: ["L3_BACKGROUND", "L4_SPATIAL"] },
];

export const YUANFANG_VISUAL_RULE_CONSUMER_MAPPING: Record<YuanfangRuleConsumer, string[]> = {
  L3_BACKGROUND: ["benchmark family", "visual density", "layout grammar", "safe-zone policy", "negative rules"],
  L4_SPATIAL: ["title-safe zone", "logo-safe zone", "composition intent"],
  L5_PRIMARY_MESSAGE: ["family-specific hook rules", "themeClarity", "aiGenericRisk"],
  L6_TITLE: ["title dominance", "layout grammar", "title lockup expectation", "hook/subtitle priority"],
};

export const YUANFANG_VISUAL_RULE_LAYER: YuanfangVisualRuleLayer = {
  source: "yuanfang-visual-rules-l2",
  benchmarkSource: "User-provided Yuanfang existing benchmark thumbnails.",
  families: YUANFANG_VISUAL_BENCHMARK_FAMILIES,
  dimensions: YUANFANG_RULE_DIMENSIONS,
  layouts: YUANFANG_LAYOUT_GRAMMAR,
  titleRules: YUANFANG_TITLE_RULES,
  backgroundRules: YUANFANG_BACKGROUND_RULES,
  negativeRules: YUANFANG_NEGATIVE_RULES,
  consumerMapping: YUANFANG_VISUAL_RULE_CONSUMER_MAPPING,
};
