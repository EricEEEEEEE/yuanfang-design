import type { TitleCompositionMode } from "@/config/title-composition-grammar";
import type { TitleSemanticSplitCandidate, TitleSemanticUnit } from "@/config/title-semantic-splitter";

type KnownSuffix = {
  suffix: string;
  heroLabel: string;
  suitableFor: string[];
  preferredCompositionModes: TitleCompositionMode[];
};

const KNOWN_TITLE_SUFFIXES: readonly KnownSuffix[] = [
  suffix("体验课", "课程体验主视觉", ["招生体验", "课程体验", "家长社群传播"]),
  suffix("公开课", "公开课主视觉", ["公开课", "招生转化", "课程展示"]),
  suffix("汇报课", "汇报课主视觉", ["成果展示", "家长开放日", "课堂展示"]),
  suffix("阅读课", "阅读课主视觉", ["阅读课程", "文学活动", "课程宣传"]),
  suffix("写作课", "写作课主视觉", ["写作课程", "作文训练", "课程宣传"]),
  suffix("体验营", "体验营主视觉", ["营期活动", "招生体验", "课程体验"]),
  suffix("训练营", "训练营主视觉", ["营期活动", "课程训练", "招生转化"]),
  suffix("诗词会", "诗词会主视觉", ["诗词活动", "传统文化", "课堂展示"]),
  suffix("分享会", "分享会主视觉", ["活动分享", "成果表达", "社群传播"]),
  suffix("发布会", "发布会主视觉", ["品牌活动", "课程发布", "公司活动"]),
  suffix("成果展", "成果展主视觉", ["成果展示", "作品展示", "家长开放日"]),
  suffix("展示课", "展示课主视觉", ["课堂展示", "成果表达", "家长开放日"]),
  suffix("招生", "招生行动主视觉", ["招生活动", "报名转化", "社群传播"]),
];

export function createGenericSemanticSplitCandidates(mainTitle: string): TitleSemanticSplitCandidate[] {
  const normalizedTitle = mainTitle.trim();
  const leadHero = createLeadHeroSplit(normalizedTitle);
  const fullHero = createFullHeroSplit(normalizedTitle);
  return leadHero ? [leadHero, fullHero] : [fullHero];
}

function createLeadHeroSplit(mainTitle: string): TitleSemanticSplitCandidate | undefined {
  const match = KNOWN_TITLE_SUFFIXES.find((item) => mainTitle.endsWith(item.suffix));
  if (!match) return undefined;
  const leadText = mainTitle.slice(0, -match.suffix.length);
  if (!validLead(leadText)) return undefined;

  return {
    splitId: "genericLeadHeroBySuffix",
    label: `${leadText}引导 + ${match.heroLabel}`,
    suitableFor: match.suitableFor,
    titleLengthRange: lengthRange(mainTitle),
    contentIntent: `让“${leadText}”提供场景入口，“${match.suffix}”成为视觉核心。`,
    units: [
      unit(leadText, "lead", 3, true, true),
      unit(match.suffix, "hero", 5, true, false),
    ],
    readingOrder: [leadText, match.suffix],
    preferredCompositionModes: match.preferredCompositionModes,
    avoidCompositionModes: ["platformCaption"],
    reason: "基于稳定中文活动/课程后缀做可逆语义切分，避免未知标题只能形成单行小字。",
    forbiddenSplitWarning: "禁止按字符平均切分；必须保持字组拼接后等于原始 mainTitle。",
  };
}

function createFullHeroSplit(mainTitle: string): TitleSemanticSplitCandidate {
  return {
    splitId: "fullTitleFallback",
    label: "完整标题兜底切分",
    suitableFor: ["未知标题", "诊断回退"],
    titleLengthRange: lengthRange(mainTitle),
    contentIntent: "未知标题先保持完整，避免错误切字。",
    units: [unit(mainTitle, "hero", 5, true, false)],
    readingOrder: [mainTitle],
    preferredCompositionModes: ["stageMonument", "centerStageLockup"],
    avoidCompositionModes: ["platformCaption"],
    reason: "没有命中稳定语义切分时，保持标题完整最安全。",
    forbiddenSplitWarning: "禁止为了造型随机切分未知中文标题。",
  };
}

function suffix(suffixText: string, heroLabel: string, suitableFor: string[]): KnownSuffix {
  return {
    suffix: suffixText,
    heroLabel,
    suitableFor,
    preferredCompositionModes: ["verticalHeroStack", "staggeredColumn", "stageMonument", "centerStageLockup"],
  };
}

function unit(
  text: string,
  role: TitleSemanticUnit["semanticRole"],
  importance: number,
  allowEmphasis: boolean,
  allowLineBreakAfter: boolean,
): TitleSemanticUnit {
  return {
    text,
    semanticRole: role,
    visualRoleHint: role === "hero" ? "hero" : "lead",
    importance,
    allowEmphasis,
    allowLineBreakAfter,
  };
}

function validLead(value: string): boolean {
  const length = Array.from(value).length;
  return length >= 2 && length <= 6;
}

function lengthRange(value: string): { min: number; max: number } {
  const length = Array.from(value).length;
  return { min: length, max: length };
}
