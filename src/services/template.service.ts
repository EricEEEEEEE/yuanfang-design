import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STANDARD_DESIGN_FAMILIES, type StandardDesignFamilyKey } from "@/config/design-families";
import { STANDARD_DISPLAY_POLICIES } from "@/config/display-policies";
import { STANDARD_LAYOUT_FAMILIES, type StandardLayoutFamilyKey } from "@/config/layout-families";
import type { StandardElementKey, StandardStyleKey, StandardThemeKey } from "@/config/scenes";
import type { ProductOutputType, StandardDesignBriefPromptFields } from "@/models/design-brief";
import { assertBaseTemplate, assertBrandRulesTemplate, assertPromptFragmentMap, TEMPLATE_INVALID, type BaseTemplate, type BrandRulesTemplate, type PromptFragmentMap } from "@/utils/template-validation";

export type StandardPromptInput = { theme: StandardThemeKey; style: StandardStyleKey; element: StandardElementKey; designFamily?: StandardDesignFamilyKey; layoutFamily?: StandardLayoutFamilyKey; displayPolicy?: string; productOutputType?: ProductOutputType; eventBrief?: string; styleBrief?: string; visualDetails?: string; avoidNotes?: string; visualBrief?: string; mainTitle: string; subtitle?: string; campusName: string; campusAddress?: string; campusPhone: string };
export type StandardPromptOverlayData = { mainTitle: string; subtitle?: string; campusName: string; campusAddress?: string; campusPhone: string };
export type BuildStandardPromptResult = { prompt: string; overlayData: StandardPromptOverlayData; templateMeta: { theme: StandardThemeKey; style: StandardStyleKey; element: StandardElementKey } };
const INVALID_TEMPLATE_INPUT = "INVALID_TEMPLATE_INPUT";
const TEMPLATE_NOT_FOUND = "TEMPLATE_NOT_FOUND";
const PRODUCT_OUTPUT_TYPE_LABELS: Record<ProductOutputType, string> = {
  mainVisual: "活动主视觉", socialPoster: "朋友圈海报", noticeCard: "通知卡片", wechatHeader: "公众号头图",
  courseIntro: "课程介绍图", longPoster: "招生长图", eventSchedule: "活动流程图", checkInCard: "打卡图",
  workShowcase: "作品展示图", displayBoard: "展板/易拉宝", videoCover: "视频封面", xiaohongshuCover: "小红书封面",
};
const baseTemplate = loadTemplate<BaseTemplate>("templates/_base.json", assertBaseTemplate);
const brandRules = loadTemplate<BrandRulesTemplate>("templates/_brand-rules.json", assertBrandRulesTemplate);
const themeTemplates = loadTemplate<PromptFragmentMap>("templates/standard/themes.json", assertPromptFragmentMap);
const styleTemplates = loadTemplate<PromptFragmentMap>("templates/standard/styles.json", assertPromptFragmentMap);
const elementTemplates = loadTemplate<PromptFragmentMap>("templates/standard/elements.json", assertPromptFragmentMap);
export function buildStandardPrompt(input: StandardPromptInput): BuildStandardPromptResult {
  const overlayData = buildOverlayData(input);
  const themeTemplate = themeTemplates[input.theme];
  const styleTemplate = styleTemplates[input.style];
  const elementTemplate = elementTemplates[input.element];
  if (!themeTemplate || !styleTemplate || !elementTemplate) throw new Error(TEMPLATE_NOT_FOUND);
  return {
    prompt: [
      "【输出任务】",
      `生成${getProductOutputLabel(input.productOutputType)}的背景主视觉 / 设计背景，不是完整海报成品。`,
      "画面必须服务后期排版与品牌合成，同时根据本次活动需求形成差异化视觉记忆点。",
      "",
      "【品牌 DNA】",
      `品牌名称：${brandRules.brandName}`,
      `英文名称：${brandRules.englishName}`,
      `品牌精神：${brandRules.brandSpirit.join("、")}`,
      `品牌颜色：${formatColors(brandRules.colors)}`,
      `视觉语言：${brandRules.visualLanguage.join("、")}`,
      `可用视觉母题：${brandRules.allowedVisualMotifs.join("、")}。这些是可选参考，不是每张图都必须出现。`,
      `Logo 规则：${brandRules.logoRules.join("；")}`,
      `吉祥物规则：${brandRules.mascotRules.join("；")}`,
      baseTemplate.basePrompt,
      "",
      "【设计方法论】",
      "信息先于装饰：标题区低复杂度，主题视觉区有记忆点，辅助区保持克制，画面必须帮助家长快速理解活动价值。",
      "目标先于风格：先围绕本次物料的传播目标组织视觉，再选择风格、符号和构图。",
      "克制不等于空：留白要有层次、材质、光感或浅色结构，不要纯空白模板。",
      "一题一语汇：不同活动要有不同主题符号和构图记忆点，品牌一致不等于模板一致。",
      "可批量落地：结果必须适合校区直接传播，兼顾美观、信息清晰、品牌一致、复用效率和低维护成本，不要实验性艺术图。",
      "",
      "【本次设计需求】",
      ...buildDesignDemandPrompt(input),
      "",
      ...buildDesignFamilyPrompt(input),
      "",
      ...buildLayoutFamilyPrompt(input),
      "",
      ...buildDisplayPolicyPrompt(input),
      "",
      "【视觉转译要求】",
      "请从活动内容和画面元素中提炼 2-4 个本次独有视觉记忆点，并把它们转译为构图、符号、空间和光影。",
      "不要所有画面都退回书页、山水、卷轴、品牌曲线和中央留白。只有诗词、国学、名著类活动才强化卷轴、山水、月亮、竹子、古典建筑。",
      "招生、公开课、课程发布应使用现代教育品牌视觉符号；汇报课、比赛应使用成果展示、舞台光、奖章、作品墙；公司活动应使用商务发布会、品牌色块、数字纪念。",
      "",
      "【主题场景】",
      themeTemplate.prompt,
      "",
      "【风格方向】",
      styleTemplate.prompt,
      "",
      "【画面元素】",
      elementTemplate.prompt,
      "",
      "【构图策略】",
      baseTemplate.layoutPrompt,
      "",
      "【后期合成边界】",
      "主标题、副标题、校区名称、校区地址、联系电话、二维码、远方 Logo、官方大象吉祥物都由系统后期通过 Sharp 合成。AI 不得直接生成这些内容。",
      "",
      "【硬边界】",
      baseTemplate.negativePrompt.join("\n"),
    ].join("\n"),
    overlayData,
    templateMeta: { theme: input.theme, style: input.style, element: input.element },
  };
}
function buildDesignDemandPrompt(input: StandardPromptInput): string[] {
  const designFamily = getDesignFamily(input.designFamily);
  const layoutFamily = getLayoutFamily(input.layoutFamily);
  const displayPolicy = getDisplayPolicy(input.displayPolicy);
  const promptFields: Partial<StandardDesignBriefPromptFields> = {
    productOutputType: normalizeOptionalText(input.productOutputType) as ProductOutputType | undefined,
    eventBrief: normalizeOptionalText(input.eventBrief),
    styleBrief: normalizeOptionalText(input.styleBrief),
    visualDetails: normalizeOptionalText(input.visualDetails),
    avoidNotes: normalizeOptionalText(input.avoidNotes),
  };
  const visualBrief = normalizeOptionalText(input.visualBrief);
  return [
    `设计家族：${designFamily?.label || "未指定"}`,
    `版式家族：${layoutFamily?.label || "未指定"}`,
    `显示策略：${displayPolicy.key}`,
    `物料类型：${getProductOutputLabel(promptFields.productOutputType)}`,
    `活动内容：${promptFields.eventBrief || "未填写"}`,
    `风格倾向：${promptFields.styleBrief || "未填写"}`,
    `画面元素：${promptFields.visualDetails || "未填写"}`,
    `规避内容：${promptFields.avoidNotes || "未填写"}`,
    `补充主题参考：${visualBrief || "未填写"}`,
    "请优先根据以上结构化设计需求生成本次背景主视觉。",
    "这些字段用于理解活动、风格、视觉元素和规避方向，不得直接生成文字、标题、Logo、二维码、电话或校区信息。",
  ];
}
function buildDesignFamilyPrompt(input: StandardPromptInput): string[] {
  const family = getDesignFamily(input.designFamily);
  if (!family) return [];
  return [
    "【设计家族方向】",
    `设计方向：${family.label}`,
    `适用场景：${family.suitableFor.join("、")}`,
    `视觉语言：${family.visualLanguage.join("、")}`,
    `构图规则：${family.compositionRules.join("；")}`,
    `规避方向：${family.avoid.join("、")}`,
    `方向说明：${family.prompt}`,
    "",
    "请优先使用该设计家族作为本次画面的视觉方向盘。",
    "设计家族优先级高于通用视觉母题。除非该设计家族或用户需求明确需要，否则不要自动使用通用品牌曲线、绸缎飘带、底部打开书页或山水留白。",
    "请让本次画面首先像所选设计家族，而不是像统一模板换皮。",
    "它用于拉开不同主题之间的构图、视觉焦点和画面语言差异。",
    "品牌 VI、硬边界和后期合成规则仍然必须遵守。",
  ];
}
function buildLayoutFamilyPrompt(input: StandardPromptInput): string[] {
  const family = getLayoutFamily(input.layoutFamily);
  if (!family) return [];
  return ["【版式家族方向】", `版式方向：${family.label}`, `适用场景：${family.suitableFor.join("、")}`, `标题区域：${family.titleArea}`, `信息区域：${family.infoArea}`, `Logo 区域：${family.logoArea}`, `吉祥物区域：${family.mascotArea}`, `构图意图：${family.compositionIntent}`, `规避方向：${family.avoid.join("、")}`, `方向说明：${family.prompt}`, "", "请根据该版式方向安排背景复杂度、视觉重心和留白区域。", "它只是背景生成阶段的构图参考，最终标题、Logo、吉祥物、校区信息仍由 Sharp 后期合成。", "不要让所有背景都默认服务于“顶部标题 + 底部信息栏”的同一模板。"];
}
function buildDisplayPolicyPrompt(input: StandardPromptInput): string[] {
  const { key, policy } = getDisplayPolicy(input.displayPolicy);
  return ["【显示策略】", `策略：${key}`, `标题处理：${policy.titleTreatment}`, `校区信息模式：${policy.campusInfoMode}`, `说明：${policy.description}`, `积分提示：${policy.creditHint || "无"}`, "", "请根据该显示策略理解最终合成意图。", "默认情况下，不应假设画面一定会出现校区名称、地址、电话或底部信息白框。", "如果校区信息模式是 hidden，应让背景有更完整的视觉空间，不要为了底部信息栏预留过多固定区域。", "如果校区信息模式是 full 或 compact，应为后期信息合成保留可读区域。"];
}
function getDesignFamily(designFamily?: StandardDesignFamilyKey) {
  if (!designFamily) return undefined;
  const family = STANDARD_DESIGN_FAMILIES[designFamily];
  if (!family) throw new Error(TEMPLATE_NOT_FOUND);
  return family;
}
function getLayoutFamily(layoutFamily?: StandardLayoutFamilyKey) {
  if (!layoutFamily) return undefined;
  const family = STANDARD_LAYOUT_FAMILIES[layoutFamily];
  if (!family) throw new Error(TEMPLATE_NOT_FOUND);
  return family;
}
function getDisplayPolicy(displayPolicy?: string) {
  const key = displayPolicy && STANDARD_DISPLAY_POLICIES[displayPolicy] ? displayPolicy : "titleOnlyDefault";
  return { key, policy: STANDARD_DISPLAY_POLICIES[key] };
}
function getProductOutputLabel(productOutputType?: ProductOutputType): string {
  return productOutputType ? PRODUCT_OUTPUT_TYPE_LABELS[productOutputType] ?? productOutputType : "标准活动视觉";
}
function loadTemplate<Template>(
  relativePath: string,
  assertTemplate: (value: unknown) => asserts value is Template,
): Template {
  try {
    const parsed: unknown = JSON.parse(readFileSync(join(process.cwd(), relativePath), "utf8"));
    assertTemplate(parsed);
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.message === TEMPLATE_INVALID) throw error;
    throw new Error(TEMPLATE_INVALID);
  }
}
function buildOverlayData(input: StandardPromptInput): StandardPromptOverlayData {
  const mainTitle = normalizeRequiredText(input.mainTitle);
  const campusName = normalizeRequiredText(input.campusName);
  const campusPhone = normalizeRequiredText(input.campusPhone);
  const subtitle = normalizeOptionalText(input.subtitle);
  const campusAddress = normalizeOptionalText(input.campusAddress);
  return { mainTitle, ...(subtitle ? { subtitle } : {}), campusName, ...(campusAddress ? { campusAddress } : {}), campusPhone };
}
function normalizeRequiredText(value: string): string {
  const normalizedValue = value.trim();
  if (!normalizedValue) throw new Error(INVALID_TEMPLATE_INPUT);
  return normalizedValue;
}
function normalizeOptionalText(value?: string): string | undefined {
  return value?.trim() || undefined;
}
function formatColors(colors: Record<string, string>): string {
  return Object.entries(colors).map(([name, value]) => `${name} ${value}`).join("、");
}
