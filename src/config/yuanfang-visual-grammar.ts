import type {
  YuanfangLayoutGrammar,
  YuanfangLayoutGrammarKey,
  YuanfangRuleDimension,
  YuanfangRuleDimensionKey,
  YuanfangVisualFamilyKey,
} from "@/models/yuanfang-visual-rules";

const ALL_FAMILIES: YuanfangVisualFamilyKey[] = [
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

function dimension(input: YuanfangRuleDimension): YuanfangRuleDimension {
  return input;
}

export const YUANFANG_RULE_DIMENSIONS: Record<YuanfangRuleDimensionKey, YuanfangRuleDimension> = {
  themeClarity: dimension({
    key: "themeClarity",
    ruleKey: "l2.themeClarity",
    target: "用户一眼看出本次主题，不靠生成文字解释。",
    acceptance: ["主视觉 hook 是画面最大或第二大非文字元素", "family motif 与用户 brief 明确相关"],
    failureSignals: ["主题只出现在标题里", "背景像通用壁纸", "缩略图看不出课程或活动类型"],
    appliesTo: ALL_FAMILIES,
    consumers: ["L3_BACKGROUND", "L5_PRIMARY_MESSAGE"],
  }),
  visualDensity: dimension({
    key: "visualDensity",
    ruleKey: "l2.visualDensity",
    target: "画面有设计层次，不是空背景，也不是元素堆满。",
    acceptance: ["至少有前景/中景/背景或色块/光效/纹理层次", "标题区低复杂度但不是纯空白"],
    failureSignals: ["左右两侧元素 + 中间空一大片", "下方缩略元素 + 中间小标题", "过度拥挤"],
    appliesTo: ALL_FAMILIES,
    consumers: ["L3_BACKGROUND", "L4_SPATIAL"],
  }),
  brandFeeling: dimension({
    key: "brandFeeling",
    ruleKey: "l2.brandFeeling",
    target: "整体有远方教育品牌气质，不只靠右上角 Logo。",
    acceptance: ["使用远方五色或其克制组合", "文学/阅读/表达/成长气质可见"],
    failureSignals: ["普通 AI 插画", "国际学校广告感", "低端培训班广告感"],
    appliesTo: ALL_FAMILIES,
    consumers: ["L3_BACKGROUND", "L6_TITLE"],
  }),
  titleDominance: dimension({
    key: "titleDominance",
    ruleKey: "l2.titleDominance",
    target: "标题是主视觉资产，有强层级和显著面积。",
    acceptance: ["mainTitle 是视觉核心之一", "subtitle/hook 承载 primaryMessage 时可见"],
    failureSignals: ["small center text", "标题像普通 overlay", "标题与背景脱节"],
    appliesTo: ALL_FAMILIES,
    consumers: ["L6_TITLE", "L4_SPATIAL"],
  }),
  layoutDiversity: dimension({
    key: "layoutDiversity",
    ruleKey: "l2.layoutDiversity",
    target: "不同场景使用不同构图语法，避免模板化中心小字。",
    acceptance: ["family 绑定多个 layout grammar", "允许左/右/顶部/中心/斜向/竖向变化"],
    failureSignals: ["所有图都是中间小字 + 下方元素", "固定坐标调参"],
    appliesTo: ALL_FAMILIES,
    consumers: ["L3_BACKGROUND", "L6_TITLE"],
  }),
  titleSafeZone: dimension({
    key: "titleSafeZone",
    ruleKey: "l2.titleSafeZone",
    target: "标题承载区被设计过，低复杂度但不空洞。",
    acceptance: ["有浅纹理/光效/色块/容器", "无高细节、无文字污染"],
    failureSignals: ["空白白板", "高复杂度压标题", "text-like patterns near title"],
    appliesTo: ALL_FAMILIES,
    consumers: ["L3_BACKGROUND", "L4_SPATIAL", "L6_TITLE"],
  }),
  logoSafeZone: dimension({
    key: "logoSafeZone",
    ruleKey: "l2.logoSafeZone",
    target: "保护整组 Logo 的中文名、英文名和图标可读性。",
    acceptance: ["logo-safe zone 低复杂度、高对比", "不只保护图标，也保护字标"],
    failureSignals: ["Logo 背后有复杂元素", "只给图标留白", "Logo 被主题物体穿过"],
    appliesTo: ALL_FAMILIES,
    consumers: ["L3_BACKGROUND", "L4_SPATIAL"],
  }),
  mascotRole: dimension({
    key: "mascotRole",
    ruleKey: "l2.mascotRole",
    target: "吉祥物是辅助品牌元素，不能抢主视觉。",
    acceptance: ["只有用户选择时预留辅助位置", "吉祥物不成为背景生成内容"],
    failureSignals: ["AI 生成或模仿大象", "吉祥物压住主视觉或标题"],
    appliesTo: ALL_FAMILIES,
    consumers: ["L3_BACKGROUND", "L4_SPATIAL"],
  }),
  backgroundComplexity: dimension({
    key: "backgroundComplexity",
    ruleKey: "l2.backgroundComplexity",
    target: "背景丰富但受控，支撑标题和品牌合成。",
    acceptance: ["主题区复杂、标题区低复杂、Logo 区低复杂", "密度随 family 变化"],
    failureSignals: ["generic AI art", "空渐变", "背景和标题互相打架"],
    appliesTo: ALL_FAMILIES,
    consumers: ["L3_BACKGROUND", "L4_SPATIAL"],
  }),
  textPollutionRisk: dimension({
    key: "textPollutionRisk",
    ruleKey: "l2.textPollutionRisk",
    target: "AI 不生成任何可读文字、假字或类文字纹理。",
    acceptance: ["negative rules 明确禁止文字污染", "标题/Logo/校区信息都由系统合成"],
    failureSignals: ["fake Chinese", "乱码", "文字纹理靠近 title/logo safe-zone"],
    appliesTo: ALL_FAMILIES,
    consumers: ["L3_BACKGROUND", "L4_SPATIAL"],
  }),
  aiGenericRisk: dimension({
    key: "aiGenericRisk",
    ruleKey: "l2.aiGenericRisk",
    target: "避免普通 AI 插画、壁纸、库存图感。",
    acceptance: ["每个 family 有专属 motif 和 layout grammar", "不以单张样图作为唯一目标"],
    failureSignals: ["stock illustration look", "empty placeholder gradient", "泛书页山水"],
    appliesTo: ALL_FAMILIES,
    consumers: ["L3_BACKGROUND", "L5_PRIMARY_MESSAGE"],
  }),
  customerUsability: dimension({
    key: "customerUsability",
    ruleKey: "l2.customerUsability",
    target: "校区老师能直接用于朋友圈、家长群和活动传播。",
    acceptance: ["主题、标题、品牌都清楚", "缩略图可读", "不需要设计师二次解释"],
    failureSignals: ["看不懂主题", "标题太弱", "审美像实验艺术图"],
    appliesTo: ALL_FAMILIES,
    consumers: ["L3_BACKGROUND", "L6_TITLE"],
  }),
};

function layout(input: YuanfangLayoutGrammar): YuanfangLayoutGrammar {
  return input;
}

export const YUANFANG_LAYOUT_GRAMMAR: Record<YuanfangLayoutGrammarKey, YuanfangLayoutGrammar> = {
  topHeroTitle: layout({ key: "topHeroTitle", label: "顶部强标题", families: ALL_FAMILIES, titlePlacement: "top or upper-center hero zone", visualSubjectPlacement: "middle/lower themed field", logoSafeZone: "top-right separated from title", titleSafeZone: "designed top band, not blank board", canvasSuitability: ["vertical", "horizontal", "square"], forbiddenWhen: ["top area has high-detail subject", "logo conflicts with title"] }),
  leftTitleRightVisual: layout({ key: "leftTitleRightVisual", label: "左题右图", families: ["openClass", "enrollment", "literaryActivity", "achievementShowcase"], titlePlacement: "left third or left-center lockup", visualSubjectPlacement: "right and lower-right", logoSafeZone: "top-right above visual subject", titleSafeZone: "left low-complexity color/light structure", canvasSuitability: ["vertical", "horizontal", "square"], forbiddenWhen: ["left side already crowded", "reading order becomes unclear"] }),
  rightTitleLeftVisual: layout({ key: "rightTitleLeftVisual", label: "右题左图", families: ["guofengLiterature", "poetryFestival", "companyActivity", "brandEvent"], titlePlacement: "right third or right-center lockup", visualSubjectPlacement: "left and lower-left", logoSafeZone: "top-right must stay independent from title", titleSafeZone: "right structured title field", canvasSuitability: ["vertical"], forbiddenWhen: ["right area needed for logo", "right visual complexity is high"] }),
  centerHeroLockup: layout({ key: "centerHeroLockup", label: "中心主视觉标题组", families: ALL_FAMILIES, titlePlacement: "center or upper-center dominant lockup", visualSubjectPlacement: "surrounding, lower, side, or behind low-contrast field", logoSafeZone: "top-right clean patch", titleSafeZone: "center designed low-complexity structure", canvasSuitability: ["vertical", "square"], forbiddenWhen: ["center becomes empty placeholder", "center has high-detail subject"] }),
  diagonalCampaignFlow: layout({ key: "diagonalCampaignFlow", label: "斜向活动动线", families: ["companyActivity", "brandEvent", "openClass", "enrollment"], titlePlacement: "along or against diagonal flow", visualSubjectPlacement: "opposite diagonal anchor", logoSafeZone: "top-right clear of diagonal streaks", titleSafeZone: "diagonal low-complexity lane", canvasSuitability: ["vertical", "horizontal", "square"], forbiddenWhen: ["diagonal motion harms readability", "looks like stock sale banner"] }),
  verticalSealTitle: layout({ key: "verticalSealTitle", label: "竖向题签 / 国风标题", families: ["guofengLiterature", "poetryFestival"], titlePlacement: "vertical or stacked title asset", visualSubjectPlacement: "scroll/mountain/book scene around title", logoSafeZone: "top-right calm paper/light area", titleSafeZone: "designed title plaque/seal lane", canvasSuitability: ["vertical"], forbiddenWhen: ["per-character vertical text would reduce readability", "old-fashioned red-gold overload"] }),
  bottomInformationPanel: layout({ key: "bottomInformationPanel", label: "底部信息承载区", families: ["literaryActivity", "poetryFestival", "campusActivity"], titlePlacement: "upper/middle title with lower support area", visualSubjectPlacement: "upper or side theme scene", logoSafeZone: "top-right", titleSafeZone: "not the same as future campus bar", canvasSuitability: ["vertical"], forbiddenWhen: ["raw campus text is expected", "bottom panel dominates mainTitle"] }),
  stageShowcase: layout({ key: "stageShowcase", label: "舞台成果展示", families: ["campusActivity", "teachingCompetition", "achievementShowcase"], titlePlacement: "stage center or upper light column", visualSubjectPlacement: "works wall/stage/lights around lower and side zones", logoSafeZone: "top-right above stage detail", titleSafeZone: "spotlight column with texture", canvasSuitability: ["vertical"], forbiddenWhen: ["looks like commercial concert", "stage lights wash out title"] }),
  splitColorBlock: layout({ key: "splitColorBlock", label: "品牌色块分割", families: ["companyActivity", "brandEvent", "enrollment"], titlePlacement: "inside strong color block or adjacent calm zone", visualSubjectPlacement: "contrasting block with motif", logoSafeZone: "own color-safe patch", titleSafeZone: "color block with enough contrast", canvasSuitability: ["vertical", "horizontal"], forbiddenWhen: ["color blocks become empty template", "brand colors clash harshly"] }),
  frameContainer: layout({ key: "frameContainer", label: "主题框景 / 容器", families: ["literaryActivity", "guofengLiterature", "poetryFestival", "campusActivity", "brandEvent"], titlePlacement: "inside or attached to designed frame", visualSubjectPlacement: "around frame edges or secondary scene", logoSafeZone: "outside frame or top-right frame gap", titleSafeZone: "container has texture and depth", canvasSuitability: ["vertical", "square"], forbiddenWhen: ["frame looks like blank board", "container implies generated text"] }),
};
