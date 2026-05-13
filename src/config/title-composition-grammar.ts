// Title Composition Grammar defines lockup construction grammar, not fixed templates.
// It describes how title units form a visual lockup inside a spatial anchor.
// 这是标题组合语法，不是固定模板库。后续 Candidate Generator 可以组合、变形、约束生成，不得做固定 7 选 1。

export type TitleCompositionMode =
  | "verticalHeroStack"
  | "splitLeadHero"
  | "staggeredColumn"
  | "stageMonument"
  | "badgeHeroLockup"
  | "centerStageLockup"
  | "platformCaption";

export type TitleFlowAxis = "vertical" | "horizontal" | "diagonal" | "centered";

export type TitleLockupIntent =
  | "mainTitle"
  | "subtitle"
  | "auxiliary"
  | "badge"
  | "fallback";

export type TitleUnitVisualRole = "lead" | "hero" | "accent" | "support";

export type TitleUnitDirectionPolicy =
  | "horizontalPreferred"
  | "verticalAllowed"
  | "verticalPreferred"
  | "mixedAllowed";

export type SubtitlePlacementPolicy =
  | "belowMainLockup"
  | "sideOfMainLockup"
  | "secondaryAnchor"
  | "hidden";

export type AnchorUsagePolicy =
  | "mainTitleAllowed"
  | "subtitleOrAuxiliaryOnly"
  | "fallbackOnly";

export type TitleCompositionGrammar = {
  mode: TitleCompositionMode;
  label: string;
  suitableFor: string[];
  avoidFor: string[];
  lockupIntent: TitleLockupIntent;
  flowAxis: TitleFlowAxis;
  directionPolicy: TitleUnitDirectionPolicy;
  subtitlePlacementPolicy: SubtitlePlacementPolicy;
  anchorUsagePolicy: AnchorUsagePolicy;
  minUnits: number;
  maxUnits: number;
  heroRequired: boolean;
  allowUnitOverlap: boolean;
  allowRotation: boolean;
  visualPrinciples: string[];
  constructionRules: string[];
  forbiddenRules: string[];
  promptGuidance: string;
  templateRiskWarning: string;
};

export const TITLE_COMPOSITION_GRAMMAR: Record<
  TitleCompositionMode,
  TitleCompositionGrammar
> = {
  verticalHeroStack: {
    mode: "verticalHeroStack",
    label: "竖向主标题组合",
    suitableFor: ["成长汇报课", "成果展示", "舞台聚光柱", "verticalColumn", "followShape", "verticalFirst"],
    avoidFor: ["短横幅通知", "横向留白主导", "强斜向动线"],
    lockupIntent: "mainTitle",
    flowAxis: "vertical",
    directionPolicy: "mixedAllowed",
    subtitlePlacementPolicy: "belowMainLockup",
    anchorUsagePolicy: "mainTitleAllowed",
    minUnits: 2,
    maxUnits: 4,
    heroRequired: true,
    allowUnitOverlap: false,
    allowRotation: false,
    visualPrinciples: ["标题组合体沿竖向空间生长", "每个字组仍可横排", "hero unit 必须成为视觉重心"],
    constructionRules: ["lockupBox 应沿竖向空间组织", "lead unit 可小于 hero unit", "hero unit 必须成为视觉重心", "titleUnits 可上下排列形成阅读节奏", "允许 horizontal unit 沿 vertical flow 组织"],
    forbiddenRules: ["禁止把 verticalFirst 简化为逐字竖排", "禁止所有 unit 等大等距堆叠", "禁止副标题插入 lead 与 hero 中间"],
    promptGuidance: "适合竖向留白或聚光柱背景。生成时把字组沿竖向组织，但不要把每个汉字机械竖排。",
    templateRiskWarning: "不得固定为竖排模板；必须根据背景锚点高度、留白形状和标题语义生成多个 lockup 变体。",
  },
  splitLeadHero: {
    mode: "splitLeadHero",
    label: "引导词加主视觉标题",
    suitableFor: ["成长 / 汇报课", "春季 / 新班招生", "舞台成果", "发布会", "招生主视觉"],
    avoidFor: ["单字标题", "正式长通知", "无明显重点词的说明图"],
    lockupIntent: "mainTitle",
    flowAxis: "horizontal",
    directionPolicy: "horizontalPreferred",
    subtitlePlacementPolicy: "belowMainLockup",
    anchorUsagePolicy: "mainTitleAllowed",
    minUnits: 2,
    maxUnits: 3,
    heroRequired: true,
    allowUnitOverlap: false,
    allowRotation: false,
    visualPrinciples: ["小引导词加大主视觉词", "hero unit 明显大于 lead unit", "标题层级清楚"],
    constructionRules: ["lead unit 应引导阅读", "hero unit 应承担最大视觉重量", "subtitle 应附着在主 lockup 外侧或下方"],
    forbiddenRules: ["禁止 lead 与 hero 等大", "禁止随机切分中文词语", "禁止把 splitLeadHero 退化为普通横排"],
    promptGuidance: "先识别标题中的重点词，再生成 lead/hero 结构；hero 应更大、更稳、更容易第一眼读到。",
    templateRiskWarning: "不得固定为左小右大；lead 与 hero 的相对位置必须服从背景锚点和阅读方向。",
  },
  staggeredColumn: {
    mode: "staggeredColumn",
    label: "竖向错落标题柱",
    suitableFor: ["竖向空间", "动态节奏背景", "儿童活动", "成果展示", "轻活动"],
    avoidFor: ["正式说明图", "需要严肃品牌感的发布会"],
    lockupIntent: "mainTitle",
    flowAxis: "vertical",
    directionPolicy: "mixedAllowed",
    subtitlePlacementPolicy: "secondaryAnchor",
    anchorUsagePolicy: "mainTitleAllowed",
    minUnits: 2,
    maxUnits: 4,
    heroRequired: true,
    allowUnitOverlap: false,
    allowRotation: true,
    visualPrinciples: ["字组沿竖向错落", "读序必须清楚", "错落形成节奏但不是散乱"],
    constructionRules: ["unit 可轻微左右错位", "hero unit 应最醒目", "rotation 只能用于轻微动势"],
    forbiddenRules: ["禁止把字随意撒开", "禁止破坏阅读顺序", "禁止装饰密度压过主标题"],
    promptGuidance: "用于有动态节奏的竖向空间。候选应比较不同错落幅度，而不是只改坐标。",
    templateRiskWarning: "不得固定成同一种错落阶梯；错落方向、幅度和节奏必须随背景空间变化。",
  },
  stageMonument: {
    mode: "stageMonument",
    label: "舞台纪念碑标题",
    suitableFor: ["舞台", "成果展示", "发布会", "仪式感背景", "主视觉强标题"],
    avoidFor: ["轻松游园会", "杂志留白图", "低压说明图"],
    lockupIntent: "mainTitle",
    flowAxis: "centered",
    directionPolicy: "horizontalPreferred",
    subtitlePlacementPolicy: "belowMainLockup",
    anchorUsagePolicy: "mainTitleAllowed",
    minUnits: 1,
    maxUnits: 3,
    heroRequired: true,
    allowUnitOverlap: false,
    allowRotation: false,
    visualPrinciples: ["标题像舞台中心纪念碑", "稳重厚重居中", "主标题具有压场重量"],
    constructionRules: ["hero unit 应居中压住视觉重心", "support unit 不得抢主标题", "整体应形成稳定底座感"],
    forbiddenRules: ["禁止轻飘散乱", "禁止过度卡通化", "禁止把舞台标题缩成普通说明文字"],
    promptGuidance: "当背景有中心舞台或仪式感时优先考虑。生成候选要比较重量、层级和中心稳定性。",
    templateRiskWarning: "不得固定为居中大字；应根据舞台透视、聚光位置和标题长度调整 lockup。",
  },
  badgeHeroLockup: {
    mode: "badgeHeroLockup",
    label: "荣誉徽章主标题",
    suitableFor: ["奖章", "荣誉", "成果榜", "作品展", "教学成果"],
    avoidFor: ["普通通知", "低龄游园会", "纯文学杂志"],
    lockupIntent: "badge",
    flowAxis: "centered",
    directionPolicy: "horizontalPreferred",
    subtitlePlacementPolicy: "belowMainLockup",
    anchorUsagePolicy: "mainTitleAllowed",
    minUnits: 1,
    maxUnits: 3,
    heroRequired: true,
    allowUnitOverlap: true,
    allowRotation: false,
    visualPrinciples: ["标题可与荣誉线条形成组合", "徽章感服务成果语义", "主字仍需清晰可读"],
    constructionRules: ["badge shape 只能辅助 title lockup", "hero unit 应位于徽章视觉中心", "荣誉装饰应克制"],
    forbiddenRules: ["禁止固定贴奖章", "禁止徽章遮挡主标题", "禁止没有荣誉语义时强行使用"],
    promptGuidance: "用于成果荣誉类标题。可以生成徽章、线条、星光的不同密度候选。",
    templateRiskWarning: "不得固定为同一个奖章模板；徽章形态必须跟活动主题、标题长度和背景空间匹配。",
  },
  centerStageLockup: {
    mode: "centerStageLockup",
    label: "中心舞台标题组合",
    suitableFor: ["中心舞台", "发布会", "品牌正式主视觉", "横向或上下两层标题"],
    avoidFor: ["斜向强动势背景", "边缘留白标题区"],
    lockupIntent: "mainTitle",
    flowAxis: "centered",
    directionPolicy: "horizontalPreferred",
    subtitlePlacementPolicy: "belowMainLockup",
    anchorUsagePolicy: "mainTitleAllowed",
    minUnits: 1,
    maxUnits: 3,
    heroRequired: true,
    allowUnitOverlap: false,
    allowRotation: false,
    visualPrinciples: ["居中稳定", "标题与舞台中轴对齐", "可以横向或上下两层组织"],
    constructionRules: ["主标题应锁定中心锚点", "副标题可在下方形成次层级", "上下层间距必须服务整体重量"],
    forbiddenRules: ["禁止退化成普通横排", "禁止忽略背景中轴", "禁止把所有标题都放在中心"],
    promptGuidance: "用于中心舞台和正式发布场景。候选应比较层级、间距和中心稳定性。",
    templateRiskWarning: "不得固定为中心模板；只有背景和主题支持中心舞台感时才使用。",
  },
  platformCaption: {
    mode: "platformCaption",
    label: "平台区辅助标题",
    suitableFor: ["舞台平台区", "底部辅助说明", "副标题", "辅助信息"],
    avoidFor: ["主标题主锚点", "需要强记忆点的主视觉"],
    lockupIntent: "auxiliary",
    flowAxis: "horizontal",
    directionPolicy: "horizontalPreferred",
    subtitlePlacementPolicy: "secondaryAnchor",
    anchorUsagePolicy: "subtitleOrAuxiliaryOnly",
    minUnits: 1,
    maxUnits: 2,
    heroRequired: false,
    allowUnitOverlap: false,
    allowRotation: false,
    visualPrinciples: ["承载辅助说明", "不抢主标题", "贴合舞台平台或底部信息区"],
    constructionRules: ["只能用于 subtitle 或 auxiliary", "应使用次级字号", "应服从主标题 lockup 的视觉层级"],
    forbiddenRules: ["禁止作为主标题主锚点", "禁止承载 hero unit", "禁止与主标题竞争视觉中心"],
    promptGuidance: "用于副标题或辅助说明，不能替代主标题方案。候选应验证其是否降低主标题可读性。",
    templateRiskWarning: "不得把 platformCaption 当作主标题模板；它只允许作为副标题或辅助信息语法。",
  },
};

