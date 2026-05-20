import { YUANFANG_VISUAL_RULE_LAYER } from "@/config/yuanfang-design-rules";
import type { StandardImagePromptContext } from "@/models/standard-background-generation";
import type { YuanfangCanvasIntentKey, YuanfangLayoutGrammarKey, YuanfangLogoStrategyKey, YuanfangNegativeRule, YuanfangRuleDimension, YuanfangStyleTreatmentKey, YuanfangVisualBenchmarkFamily, YuanfangVisualFamilyKey } from "@/models/yuanfang-visual-rules";
import { hasAny, positiveBriefText } from "@/services/helpers/standard-background-prompt-utils";

export type ResolvedYuanfangVisualRules = {
  source: "yuanfang-visual-rules-l2";
  family: YuanfangVisualBenchmarkFamily;
  layout: {
    key: YuanfangLayoutGrammarKey;
    label: string;
    titlePlacement: string;
    visualSubjectPlacement: string;
    titleSafeZone: string;
    logoSafeZone: string;
    forbiddenWhen: string[];
  };
  visualDensityTarget: string;
  titleSafePolicy: string;
  logoSafePolicy: string;
  selectedStyleTreatment: YuanfangStyleTreatmentKey;
  selectedCanvasIntent: YuanfangCanvasIntentKey;
  selectedLogoStrategy: YuanfangLogoStrategyKey;
  logoVariantHint: string;
  logoPlacementCandidates: string[];
  logoProtectionPolicy: string;
  aspectRatioClass: string;
  styleTreatmentReason: string;
  logoStrategyReason: string;
  consumedRuleKeys: string[];
  negativeRules: YuanfangNegativeRule[];
  layoutSelectionReason: string;
};

export function resolveYuanfangVisualRules(context: StandardImagePromptContext): ResolvedYuanfangVisualRules {
  const family = YUANFANG_VISUAL_RULE_LAYER.families[selectFamily(context)];
  const layoutKey = selectLayout(context, family);
  const layout = YUANFANG_VISUAL_RULE_LAYER.layouts[layoutKey];
  const selectedStyleTreatment = selectStyleTreatment(context, family);
  const selectedCanvasIntent = selectCanvasIntent(context, family);
  const selectedLogoStrategy = selectLogoStrategy(context, family, selectedStyleTreatment, layoutKey);
  const logoStrategy = YUANFANG_VISUAL_RULE_LAYER.logoStrategies[selectedLogoStrategy];
  const canvasIntent = YUANFANG_VISUAL_RULE_LAYER.canvasIntents[selectedCanvasIntent];
  const l3Dimensions = family.requiredDimensions
    .map((key) => YUANFANG_VISUAL_RULE_LAYER.dimensions[key])
    .filter((dimension): dimension is YuanfangRuleDimension => dimension.consumers.includes("L3_BACKGROUND"));
  const consumedRuleKeys = unique([
    `l2.family.${family.key}`,
    `l2.layout.${layout.key}`,
    `l2.styleTreatment.${selectedStyleTreatment}`,
    `l2.canvasIntent.${selectedCanvasIntent}`,
    `l2.logoStrategy.${selectedLogoStrategy}`,
    ...l3Dimensions.map((dimension) => dimension.ruleKey),
    ...YUANFANG_VISUAL_RULE_LAYER.backgroundRules.filter((rule) => rule.consumers.includes("L3_BACKGROUND")).map((rule) => rule.ruleKey),
  ]);
  return {
    source: "yuanfang-visual-rules-l2",
    family,
    layout: {
      key: layout.key,
      label: layout.label,
      titlePlacement: layout.titlePlacement,
      visualSubjectPlacement: layout.visualSubjectPlacement,
      titleSafeZone: layout.titleSafeZone,
      logoSafeZone: layout.logoSafeZone,
      forbiddenWhen: layout.forbiddenWhen,
    },
    visualDensityTarget: YUANFANG_VISUAL_RULE_LAYER.dimensions.visualDensity.target,
    titleSafePolicy: layout.titleSafeZone,
    logoSafePolicy: layout.logoSafeZone,
    selectedStyleTreatment,
    selectedCanvasIntent,
    selectedLogoStrategy,
    logoVariantHint: logoStrategy.logoVariantHint,
    logoPlacementCandidates: logoStrategy.placementCandidates,
    logoProtectionPolicy: logoStrategy.protectionPolicy,
    aspectRatioClass: canvasIntent.aspectRatioClass,
    styleTreatmentReason: `selected ${selectedStyleTreatment} from ${family.key} using product type, brief language, and visual hook.`,
    logoStrategyReason: `selected ${selectedLogoStrategy} for ${selectedStyleTreatment}/${layoutKey} without changing logo assets.`,
    consumedRuleKeys,
    negativeRules: YUANFANG_VISUAL_RULE_LAYER.negativeRules.filter((rule) => rule.consumers.includes("L3_BACKGROUND")),
    layoutSelectionReason: `selected ${layout.key} from ${family.key} preferred layouts using product type, primary hook, and brief hash.`,
  };
}

function selectFamily(context: StandardImagePromptContext): YuanfangVisualFamilyKey {
  const text = positiveBriefText(context);
  const product = context.form.productOutputType;
  if (hasAny(text, ["教学比赛", "教师风采", "赛课", "比赛"])) return "teachingCompetition";
  if (hasAny(text, ["品牌升级", "课程体系", "课程发布", "发布会", "总部活动"])) return "brandEvent";
  if (hasAny(text, ["周年", "公司活动", "年会"])) return "companyActivity";
  if (product === "festival" && hasAny(text, ["世界读书日", "阅读日", "读书节", "阅读节"])) return "literaryActivity";
  if (product === "festival" && hasStrongGuofengSignal(text)) return "poetryFestival";
  if (hasStrongGuofengSignal(text)) return product === "enrollment" ? "literaryActivity" : "guofengLiterature";
  if (hasAny(text, ["四大名著", "大唐", "三国", "西游", "名著", "文学旅行", "游记", "阅读营", "亲子共读", "世界读书日"])) return "literaryActivity";
  if (product === "achievementShowcase" || product === "classReview" || hasAny(text, ["成果", "汇报", "作品墙", "表达成长"])) return "achievementShowcase";
  if (hasAny(text, ["校区活动", "校区", "家长开放日"])) return "campusActivity";
  if (product === "enrollment" && hasAny(text, ["公开课", "试听", "体验课", "线下课"])) return "openClass";
  if (product === "enrollment") return "enrollment";
  if (hasAny(text, ["阅读", "文学", "读书", "整本书"])) return "literaryActivity";
  return product === "socialPost" || product === "parentNotice" ? "brandEvent" : "openClass";
}

function selectLayout(context: StandardImagePromptContext, family: YuanfangVisualBenchmarkFamily): YuanfangLayoutGrammarKey {
  const text = positiveBriefText(context);
  const preferred = family.preferredLayouts.filter((key) => YUANFANG_VISUAL_RULE_LAYER.layouts[key]?.families.includes(family.key));
  const candidates = preferred.length > 0 ? preferred : family.preferredLayouts;
  const forced = forcedLayout(text, candidates);
  if (forced) return forced;
  const nonCenter = candidates.filter((key) => key !== "centerHeroLockup");
  const pool = nonCenter.length > 0 && !hasAny(text, ["中心", "主视觉标题", "发布会主屏", "聚光"]) ? nonCenter : candidates;
  return pool[stableIndex(context, pool.length)] ?? candidates[0] ?? "topHeroTitle";
}

function selectStyleTreatment(context: StandardImagePromptContext, family: YuanfangVisualBenchmarkFamily): YuanfangStyleTreatmentKey {
  const text = positiveBriefText(context);
  if (hasAny(text, ["AI作文", "AI 作文", "智能批改", "作文批改", "科技"])) return "techBlueLearning";
  if (family.key === "brandEvent" || family.key === "companyActivity") return "brandKineticKV";
  if (family.key === "poetryFestival" || family.key === "guofengLiterature" || hasStrongGuofengSignal(text)) return "modernGuofengInk";
  if (family.key === "achievementShowcase") return "warmAchievementStage";
  if (family.key === "teachingCompetition" || family.key === "campusActivity") return "campusHonorFormal";
  if (family.key === "enrollment" || family.key === "openClass") return "boldEnrollmentCampaign";
  if (family.key === "literaryActivity" && hasAny(text, ["亲子", "窗边", "夜晚", "咖啡", "陪伴", "生活方式"])) return "premiumMinimalNotice";
  return family.preferredStyleTreatments[stableIndex(context, family.preferredStyleTreatments.length)] ?? "literaryEditorialCollage";
}

function hasStrongGuofengSignal(text: string): boolean {
  return hasAny(text, ["国风", "诗词", "古诗", "飞花令", "端午", "传统文化", "国学", "古典", "书法", "水墨"]);
}

function selectCanvasIntent(context: StandardImagePromptContext, family: YuanfangVisualBenchmarkFamily): YuanfangCanvasIntentKey {
  const text = positiveBriefText(context);
  if (hasAny(text, ["横版", "大屏", "主屏", "横幅"])) return "horizontalKeyVisual";
  if (hasAny(text, ["方图", "九宫格", "社群封面"])) return "squareSocial";
  if (family.key === "brandEvent" || family.key === "companyActivity" || family.key === "achievementShowcase" || family.key === "teachingCompetition") return "horizontalKeyVisual";
  if (family.key === "openClass" && hasAny(text, ["社群", "九宫格", "朋友圈封面"])) return "squareSocial";
  return family.preferredCanvasIntents[0] ?? "verticalPoster";
}

function selectLogoStrategy(context: StandardImagePromptContext, family: YuanfangVisualBenchmarkFamily, treatment: YuanfangStyleTreatmentKey, layout: YuanfangLayoutGrammarKey): YuanfangLogoStrategyKey {
  const text = positiveBriefText(context);
  if (treatment === "brandKineticKV") return "whiteLockup";
  if (treatment === "modernGuofengInk" || treatment === "literaryEditorialCollage") return "deepBlueLockup";
  if (treatment === "warmAchievementStage" || treatment === "campusHonorFormal" || layout === "stageShowcase" || layout === "frameContainer") return "repositionPreferred";
  if (hasAny(text, ["深色", "深蓝", "夜色"])) return "whiteLockup";
  if (hasAny(text, ["复杂", "热闹", "作品墙"])) return "repositionPreferred";
  return family.logoStrategyHints[0] ?? "colorFullLockup";
}

function forcedLayout(text: string, candidates: YuanfangLayoutGrammarKey[]): YuanfangLayoutGrammarKey | undefined {
  const options: Array<[YuanfangLayoutGrammarKey, string[]]> = [
    ["stageShowcase", ["舞台", "作品墙", "汇报", "成果", "展示台", "教学比赛"]],
    ["verticalSealTitle", ["诗词", "端午", "国风", "卷轴", "题签"]],
    ["splitColorBlock", ["品牌升级", "课程发布", "发布会", "色块"]],
    ["diagonalCampaignFlow", ["报名", "招生", "开班", "成长路径", "动线"]],
    ["frameContainer", ["文学", "阅读", "书页", "整本书", "名著"]],
  ];
  return options.find(([key, needles]) => candidates.includes(key) && hasAny(text, needles))?.[0];
}

function stableIndex(context: StandardImagePromptContext, size: number): number {
  const value = [context.form.productOutputType, context.visualHook?.primaryHook, context.visualHook?.primaryMessage, context.form.titleBrief, context.form.eventBrief].filter(Boolean).join("|");
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return size <= 0 ? 0 : hash % size;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
