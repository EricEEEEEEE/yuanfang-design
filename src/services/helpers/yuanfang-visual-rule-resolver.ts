import { YUANFANG_VISUAL_RULE_LAYER } from "@/config/yuanfang-design-rules";
import type { StandardImagePromptContext } from "@/models/standard-background-generation";
import type { YuanfangLayoutGrammarKey, YuanfangNegativeRule, YuanfangRuleDimension, YuanfangVisualBenchmarkFamily, YuanfangVisualFamilyKey } from "@/models/yuanfang-visual-rules";
import { allBriefText, hasAny } from "@/services/helpers/standard-background-prompt-utils";

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
  consumedRuleKeys: string[];
  negativeRules: YuanfangNegativeRule[];
  layoutSelectionReason: string;
};

export function resolveYuanfangVisualRules(context: StandardImagePromptContext): ResolvedYuanfangVisualRules {
  const family = YUANFANG_VISUAL_RULE_LAYER.families[selectFamily(context)];
  const layoutKey = selectLayout(context, family);
  const layout = YUANFANG_VISUAL_RULE_LAYER.layouts[layoutKey];
  const l3Dimensions = family.requiredDimensions
    .map((key) => YUANFANG_VISUAL_RULE_LAYER.dimensions[key])
    .filter((dimension): dimension is YuanfangRuleDimension => dimension.consumers.includes("L3_BACKGROUND"));
  const consumedRuleKeys = unique([
    `l2.family.${family.key}`,
    `l2.layout.${layout.key}`,
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
    consumedRuleKeys,
    negativeRules: YUANFANG_VISUAL_RULE_LAYER.negativeRules.filter((rule) => rule.consumers.includes("L3_BACKGROUND")),
    layoutSelectionReason: `selected ${layout.key} from ${family.key} preferred layouts using product type, primary hook, and brief hash.`,
  };
}

function selectFamily(context: StandardImagePromptContext): YuanfangVisualFamilyKey {
  const text = allBriefText(context);
  const product = context.form.productOutputType;
  if (hasAny(text, ["教学比赛", "教师风采", "赛课", "比赛"])) return "teachingCompetition";
  if (hasAny(text, ["品牌升级", "课程体系", "课程发布", "发布会", "总部活动"])) return "brandEvent";
  if (hasAny(text, ["周年", "公司活动", "年会"])) return "companyActivity";
  if (product === "festival" && hasAny(text, ["诗词", "端午", "节日", "传统文化"])) return "poetryFestival";
  if (hasAny(text, ["国风", "四大名著", "国学", "名著", "古典", "山水", "卷轴"])) return product === "enrollment" ? "literaryActivity" : "guofengLiterature";
  if (product === "achievementShowcase" || product === "classReview" || hasAny(text, ["成果", "汇报", "作品墙", "表达成长"])) return "achievementShowcase";
  if (hasAny(text, ["校区活动", "校区", "家长开放日"])) return "campusActivity";
  if (product === "enrollment" && hasAny(text, ["公开课", "试听", "体验课", "线下课"])) return "openClass";
  if (product === "enrollment") return "enrollment";
  if (hasAny(text, ["阅读", "文学", "读书", "整本书"])) return "literaryActivity";
  return product === "socialPost" || product === "parentNotice" ? "brandEvent" : "openClass";
}

function selectLayout(context: StandardImagePromptContext, family: YuanfangVisualBenchmarkFamily): YuanfangLayoutGrammarKey {
  const text = allBriefText(context);
  const preferred = family.preferredLayouts.filter((key) => YUANFANG_VISUAL_RULE_LAYER.layouts[key]?.families.includes(family.key));
  const candidates = preferred.length > 0 ? preferred : family.preferredLayouts;
  const forced = forcedLayout(text, candidates);
  if (forced) return forced;
  const nonCenter = candidates.filter((key) => key !== "centerHeroLockup");
  const pool = nonCenter.length > 0 && !hasAny(text, ["中心", "主视觉标题", "发布会主屏", "聚光"]) ? nonCenter : candidates;
  return pool[stableIndex(context, pool.length)] ?? candidates[0] ?? "topHeroTitle";
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
