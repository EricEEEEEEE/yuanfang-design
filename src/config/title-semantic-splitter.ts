import type { TitleCompositionMode } from "@/config/title-composition-grammar";

// Semantic Title Splitter defines semantic split grammar, not fixed title templates.
// It prevents random Chinese title cutting and provides reversible title units
// for future lockupBox / unitBox / visualWeight / readingOrder decisions.

export type TitleSemanticRole = "lead" | "hero" | "accent" | "support";

export type TitleVisualRoleHint = "lead" | "hero" | "accent" | "support";

export type TitleSemanticSplitKey =
  | "growthReportClass"
  | "springNewClassRecruitment"
  | "chineseStudiesYouthTalk";

export type TitleLengthRange = {
  min: number;
  max: number;
};

export type TitleSemanticUnit = {
  text: string;
  semanticRole: TitleSemanticRole;
  visualRoleHint: TitleVisualRoleHint;
  importance: number;
  allowEmphasis: boolean;
  allowLineBreakAfter: boolean;
};

export type TitleSemanticSplitCandidate = {
  splitId: string;
  label: string;
  suitableFor: string[];
  titleLengthRange: TitleLengthRange;
  contentIntent: string;
  units: TitleSemanticUnit[];
  readingOrder: string[];
  preferredCompositionModes: TitleCompositionMode[];
  avoidCompositionModes: TitleCompositionMode[];
  reason: string;
  forbiddenSplitWarning: string;
};

export type TitleSemanticSplit = {
  mainTitle: string;
  description: string;
  candidates: TitleSemanticSplitCandidate[];
};

export const TITLE_FORBIDDEN_SEMANTIC_SPLITS: string[] = [
  "禁止错误切分：成长汇 / 报课",
  "禁止错误切分：春季新 / 班招生",
  "禁止错误切分：国学少 / 年说",
  "禁止把中文标题按字符平均切分",
  "禁止为了竖向排版而逐字拆开",
];

export const TITLE_SEMANTIC_SPLITS: Record<
  TitleSemanticSplitKey,
  TitleSemanticSplit
> = {
  growthReportClass: {
    mainTitle: "成长汇报课",
    description: "成果展示与舞台仪式感标题，重点在成长结果和汇报展示。",
    candidates: [
      {
        splitId: "leadHero",
        label: "成长引导 + 汇报课主视觉",
        suitableFor: ["成长汇报课", "成果展示", "家长开放日"],
        titleLengthRange: { min: 5, max: 5 },
        contentIntent: "突出成长成果，让“汇报课”成为家长第一眼读到的主视觉词。",
        units: [
          {
            text: "成长",
            semanticRole: "lead",
            visualRoleHint: "lead",
            importance: 3,
            allowEmphasis: true,
            allowLineBreakAfter: true,
          },
          {
            text: "汇报课",
            semanticRole: "hero",
            visualRoleHint: "hero",
            importance: 5,
            allowEmphasis: true,
            allowLineBreakAfter: false,
          },
        ],
        readingOrder: ["成长", "汇报课"],
        preferredCompositionModes: ["splitLeadHero", "verticalHeroStack", "stageMonument"],
        avoidCompositionModes: ["platformCaption", "badgeHeroLockup"],
        reason: "“成长”是语义引导，“汇报课”是活动核心，适合形成 lead / hero 层级。",
        forbiddenSplitWarning: "不得切成“成长汇 / 报课”，也不得为了竖向排版逐字拆开。",
      },
      {
        splitId: "fullHero",
        label: "完整主视觉标题",
        suitableFor: ["正式主视觉", "舞台背景", "标题较短且需要稳重"],
        titleLengthRange: { min: 5, max: 5 },
        contentIntent: "保留完整标题作为单一视觉资产，强调稳定和整体识别。",
        units: [
          {
            text: "成长汇报课",
            semanticRole: "hero",
            visualRoleHint: "hero",
            importance: 5,
            allowEmphasis: true,
            allowLineBreakAfter: false,
          },
        ],
        readingOrder: ["成长汇报课"],
        preferredCompositionModes: ["stageMonument", "centerStageLockup"],
        avoidCompositionModes: ["platformCaption", "staggeredColumn"],
        reason: "标题短且语义完整时，可作为整体 hero 处理，避免过度设计。",
        forbiddenSplitWarning: "不得按字符平均切分，也不得切成“成长汇 / 报课”。",
      },
      {
        splitId: "threeStep",
        label: "成长 + 汇报 + 课三段节奏",
        suitableFor: ["竖向空间", "错落标题", "强舞台节奏"],
        titleLengthRange: { min: 5, max: 5 },
        contentIntent: "用三段语义制造节奏，让“汇报”承担视觉核心，“课”作为收束。",
        units: [
          {
            text: "成长",
            semanticRole: "lead",
            visualRoleHint: "lead",
            importance: 3,
            allowEmphasis: true,
            allowLineBreakAfter: true,
          },
          {
            text: "汇报",
            semanticRole: "hero",
            visualRoleHint: "hero",
            importance: 5,
            allowEmphasis: true,
            allowLineBreakAfter: true,
          },
          {
            text: "课",
            semanticRole: "accent",
            visualRoleHint: "accent",
            importance: 2,
            allowEmphasis: false,
            allowLineBreakAfter: false,
          },
        ],
        readingOrder: ["成长", "汇报", "课"],
        preferredCompositionModes: ["verticalHeroStack", "staggeredColumn", "splitLeadHero"],
        avoidCompositionModes: ["platformCaption"],
        reason: "三段切分仍保持语义可读，可服务竖向空间和字组节奏。",
        forbiddenSplitWarning: "三段不是平均切字；禁止“成长汇 / 报课”和逐字竖排。",
      },
    ],
  },
  springNewClassRecruitment: {
    mainTitle: "春季新班招生",
    description: "招生转化类标题，重点在季节窗口、新班机会和报名行动。",
    candidates: [
      {
        splitId: "seasonHero",
        label: "春季引导 + 新班招生主视觉",
        suitableFor: ["春季招生", "新班招生", "报名提醒"],
        titleLengthRange: { min: 6, max: 6 },
        contentIntent: "让“春季”成为时间窗口，“新班招生”成为转化核心。",
        units: [
          {
            text: "春季",
            semanticRole: "lead",
            visualRoleHint: "lead",
            importance: 3,
            allowEmphasis: true,
            allowLineBreakAfter: true,
          },
          {
            text: "新班招生",
            semanticRole: "hero",
            visualRoleHint: "hero",
            importance: 5,
            allowEmphasis: true,
            allowLineBreakAfter: false,
          },
        ],
        readingOrder: ["春季", "新班招生"],
        preferredCompositionModes: ["splitLeadHero", "verticalHeroStack", "centerStageLockup"],
        avoidCompositionModes: ["platformCaption", "badgeHeroLockup"],
        reason: "时间词和动作词清楚分层，适合招生主视觉快速识别。",
        forbiddenSplitWarning: "不得切成“春季新 / 班招生”，不得按字符平均切分。",
      },
      {
        splitId: "actionHero",
        label: "春季新班引导 + 招生行动",
        suitableFor: ["招生冲刺", "报名提醒", "短期活动"],
        titleLengthRange: { min: 6, max: 6 },
        contentIntent: "把“招生”作为强行动词放大，强化转化意图。",
        units: [
          {
            text: "春季新班",
            semanticRole: "lead",
            visualRoleHint: "lead",
            importance: 4,
            allowEmphasis: true,
            allowLineBreakAfter: true,
          },
          {
            text: "招生",
            semanticRole: "hero",
            visualRoleHint: "hero",
            importance: 5,
            allowEmphasis: true,
            allowLineBreakAfter: false,
          },
        ],
        readingOrder: ["春季新班", "招生"],
        preferredCompositionModes: ["splitLeadHero", "staggeredColumn", "centerStageLockup"],
        avoidCompositionModes: ["platformCaption"],
        reason: "“招生”是转化动作，可以成为更大的 hero unit。",
        forbiddenSplitWarning: "不得切成“春季新 / 班招生”，不得为了斜排或竖排逐字拆开。",
      },
    ],
  },
  chineseStudiesYouthTalk: {
    mainTitle: "国学少年说",
    description: "国风文化表达类标题，重点在文化主题和少年表达。",
    candidates: [
      {
        splitId: "culturalHero",
        label: "国学引导 + 少年说主视觉",
        suitableFor: ["国学", "诗词", "传统文化", "少年表达"],
        titleLengthRange: { min: 5, max: 5 },
        contentIntent: "让“国学”提供文化语境，“少年说”成为表达主视觉。",
        units: [
          {
            text: "国学",
            semanticRole: "lead",
            visualRoleHint: "lead",
            importance: 4,
            allowEmphasis: true,
            allowLineBreakAfter: true,
          },
          {
            text: "少年说",
            semanticRole: "hero",
            visualRoleHint: "hero",
            importance: 5,
            allowEmphasis: true,
            allowLineBreakAfter: false,
          },
        ],
        readingOrder: ["国学", "少年说"],
        preferredCompositionModes: ["verticalHeroStack", "splitLeadHero", "centerStageLockup"],
        avoidCompositionModes: ["platformCaption", "badgeHeroLockup"],
        reason: "文化语境和表达主体自然分层，适合国风题签或现代文化 KV。",
        forbiddenSplitWarning: "不得切成“国学少 / 年说”，不得把国风标题机械逐字竖排。",
      },
      {
        splitId: "fullHero",
        label: "完整国风主标题",
        suitableFor: ["现代国风主视觉", "文化活动", "留白构图"],
        titleLengthRange: { min: 5, max: 5 },
        contentIntent: "保持完整标题的文化气质和识别度，避免过度切分。",
        units: [
          {
            text: "国学少年说",
            semanticRole: "hero",
            visualRoleHint: "hero",
            importance: 5,
            allowEmphasis: true,
            allowLineBreakAfter: false,
          },
        ],
        readingOrder: ["国学少年说"],
        preferredCompositionModes: ["centerStageLockup", "verticalHeroStack"],
        avoidCompositionModes: ["platformCaption", "badgeHeroLockup"],
        reason: "标题短且整体有品牌感时，可作为完整文化标题处理。",
        forbiddenSplitWarning: "不得切成“国学少 / 年说”，也不得按字符平均切分。",
      },
    ],
  },
};

