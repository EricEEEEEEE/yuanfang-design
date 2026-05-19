import { STANDARD_DESIGN_FAMILIES } from "@/config/design-families";
import { STANDARD_DISPLAY_POLICIES } from "@/config/display-policies";
import { STANDARD_LAYOUT_FAMILIES } from "@/config/layout-families";
import type { StandardBackgroundPromptBuildInput, StandardBackgroundPromptBuildResult, StandardImagePromptContext } from "@/models/standard-background-generation";
import type { YuanfangLayoutGrammarKey, YuanfangVisualFamilyKey } from "@/models/yuanfang-visual-rules";
import { buildStandardBackgroundVisualRuleContext, type StandardBackgroundVisualRuleContext } from "@/services/helpers/standard-background-visual-rule-adapter";
import { BENCHMARK_FAMILIES, BENCHMARK_STANDARD, FORBIDDEN_ELEMENTS, PRODUCT_LABELS, PROMPT_VERSION, TEMPLATE_SOURCES } from "@/services/helpers/standard-background-prompt-policy";
import { type BaseTemplate, loadTemplates, type TemplateKeys } from "@/services/helpers/standard-background-prompt-templates";
import { allBriefText, buildWarnings, consumedFields, formatPalette, hasAny, sha256, splitAvoidNotes, unique } from "@/services/helpers/standard-background-prompt-utils";

export function buildStandardBackgroundPrompt(
  input: StandardBackgroundPromptBuildInput,
): StandardBackgroundPromptBuildResult {
  const context = input.promptContext;
  const templates = loadTemplates();
  const visualRules = buildStandardBackgroundVisualRuleContext(context);
  const keys = resolveTemplateKeys(context, visualRules);
  const prompt = buildPrompt(context, templates, keys, visualRules);
  const negativePrompt = buildNegativePrompt(context, templates.base, visualRules);
  const warnings = buildWarnings(context);
  const promptHash = sha256(`${prompt}\n---NEGATIVE---\n${negativePrompt}`);

  return {
    ok: true,
    source: "standard-background-prompt-builder-v1",
    prompt,
    negativePrompt,
    promptDiagnostics: {
      promptVersion: input.promptVersion ?? PROMPT_VERSION,
      promptHash,
      consumedFields: consumedFields(context),
      usedBrandRules: ["brandSpirit", "colors", "visualLanguage", "allowedVisualMotifs", "logoRules", "mascotRules"],
      usedTemplateSources: [...TEMPLATE_SOURCES, "src/config/design-families.ts", "src/config/layout-families.ts", "src/config/display-policies.ts", "src/config/yuanfang-design-rules.ts", "src/config/yuanfang-visual-benchmark.ts", "src/config/yuanfang-visual-grammar.ts", "src/config/yuanfang-logo-strategies.ts", "src/config/yuanfang-aspect-strategies.ts", "src/config/yuanfang-style-treatments.ts"],
      visualHook: context.visualHook,
      visualRules: {
        source: visualRules.source,
        selectedBenchmarkFamily: visualRules.selectedBenchmarkFamily,
        selectedLayoutGrammar: visualRules.selectedLayoutGrammar,
        selectedStyleTreatment: visualRules.selectedStyleTreatment,
        selectedCanvasIntent: visualRules.selectedCanvasIntent,
        selectedLogoStrategy: visualRules.selectedLogoStrategy,
        logoVariantHint: visualRules.logoVariantHint,
        logoPlacementCandidates: visualRules.logoPlacementCandidates,
        logoProtectionPolicy: visualRules.logoProtectionPolicy,
        aspectRatioClass: visualRules.aspectRatioClass,
        visualDensityTarget: visualRules.visualDensityTarget,
        titleSafePolicy: visualRules.titleSafePolicy,
        logoSafePolicy: visualRules.logoSafePolicy,
        consumedRuleKeys: visualRules.consumedRuleKeys,
        negativeRuleKeys: visualRules.negativeRuleKeys,
        layoutSelectionReason: visualRules.layoutSelectionReason,
        styleTreatmentReason: visualRules.styleTreatmentReason,
        logoStrategyReason: visualRules.logoStrategyReason,
      },
      backgroundOnly: true,
      forbiddenGeneratedElements: FORBIDDEN_ELEMENTS,
      warnings,
    },
  };
}

function buildPrompt(context: StandardImagePromptContext, templates: ReturnType<typeof loadTemplates>, keys: TemplateKeys, visualRules: StandardBackgroundVisualRuleContext): string {
  const design = STANDARD_DESIGN_FAMILIES[keys.designFamily];
  const layout = STANDARD_LAYOUT_FAMILIES[keys.layoutFamily];
  const display = STANDARD_DISPLAY_POLICIES[keys.displayPolicy] ?? STANDARD_DISPLAY_POLICIES.titleOnlyDefault;
  const hook = context.visualHook?.primaryHook?.trim();
  const theme = templates.themes[keys.theme];
  const style = templates.styles[keys.style];
  const element = templates.elements[keys.element];
  return [
    "Background visual only, not a final poster.",
    "Create a professional education-brand poster background for Yuanfang Standard Form v2.",
    BENCHMARK_STANDARD,
    BENCHMARK_FAMILIES[context.form.productOutputType],
    "Do not generate readable Chinese text. Do not generate title text. Do not generate logo. Do not generate mascot.",
    "Do not generate QR code, campus phone, address, name, watermark, or any contact information.",
    "Use the selected L2 layout grammar below; do not default to a center blank board, small center text zone, or lower-only decorative pile.",
    "Reserve a designed title-safe zone according to the selected layout grammar: low-complexity, continuous, easy for downstream layout analysis, with calm layered light, paper depth, brand color block, or gentle texture; do not place detailed objects, faces, icons, strong contrast, or text-like patterns inside it.",
    "Reserve logo-safe zones according to the selected logo strategy. Do not generate logo. Do not default to a white logo patch unless the selected strategy explicitly asks for minimalProtectionPatch.",
    context.constraints.reserveMascotSpace ? "Leave optional small mascot compositing space, but do not generate the mascot." : "",
    context.constraints.reserveCampusInfoSpace ? "Leave optional information compositing space, but do not generate campus text." : "",
    "",
    `Canvas: ${context.canvas.width}x${context.canvas.height}. Selected canvas intent: ${visualRules.selectedCanvasIntent}; aspectRatioClass: ${visualRules.aspectRatioClass}.`,
    `Material type: ${PRODUCT_LABELS[context.form.productOutputType]}.`,
    `Main visual theme anchor: ${hook || context.form.productOutputType}.`,
    hook ? "Use the visualHook as the main background theme anchor; translate it into visual symbols, space, color, and atmosphere without writing the words." : "",
    context.visualHook?.mismatchReason ? `Visual hook note: ${context.visualHook.mismatchReason}` : "",
    `Title content is for spacing only, rendered later by the title system: ${context.title.mainTitle}${context.title.subtitle ? ` / ${context.title.subtitle}` : ""}. Do not draw these words.`,
    "",
    "Creative brief from the user:",
    `- eventBrief: ${context.form.eventBrief}`,
    `- styleBrief: ${context.form.styleBrief}`,
    `- visualDetails: ${context.form.visualDetails || "not specified"}`,
    `- titleBrief: ${context.form.titleBrief}`,
    `- avoidNotes: ${context.avoidNotes || context.form.avoidNotes || "not specified"}`,
    "",
    "Yuanfang brand / VI rules:",
    `- brand: ${context.brand.brandName}${context.brand.brandEnglishName ? ` (${context.brand.brandEnglishName})` : ""}`,
    `- palette: ${formatPalette(context.brand.palette ?? templates.brand.colors)}`,
    `- spirit: ${templates.brand.brandSpirit.join(", ")}`,
    `- visual language: ${templates.brand.visualLanguage.join(", ")}`,
    `- visual motifs: ${(context.brand.visualMotifs ?? templates.brand.allowedVisualMotifs).join(", ")}`,
    `- logo policy: ${context.brand.logoPolicy}`,
    `- mascot policy: ${context.brand.mascotPolicy}`,
    `- campus policy: ${context.brand.campusPolicy}`,
    "",
    ...visualRules.promptLines,
    "",
    "Template and design direction:",
    templates.base.basePrompt,
    `Design family: ${design.label}. ${design.prompt}`,
    `Layout family: ${layout.label}. ${layout.prompt}`,
    `Display policy: ${display.description}`,
    theme ? `Theme guidance: ${theme.prompt}` : "",
    style ? `Style guidance: ${style.prompt}` : "",
    element ? `Element guidance: ${element.prompt}` : "",
    "",
    "Visual translation requirements:",
    "Design density: use 3-5 controlled layers according to the selected layout grammar, such as foreground theme symbols, mid-ground campaign space, background light/motion, brand color accents, and safe-zone structure.",
    "Style diversity: follow the selected style treatment for material, color energy, motif handling, and composition; do not make every output a soft pastel illustration.",
    "Primary visual hook: make the visualHook or strongest brief phrase drive the largest non-text visual motif in the selected visual subject placement, not just a small decoration.",
    "Extract 2-4 unique memory points from eventBrief, styleBrief, visualDetails, and visualHook.",
    "Translate them into background composition, symbolic objects, depth, light, material, and movement.",
    "Match the benchmark family instead of making a generic illustration, stock education poster, blank gradient, or decorative wallpaper.",
    "Keep theme visuals memorable but controlled; keep detailed objects outside the selected title-safe zone and logo-safe zone; avoid clutter and excessive text-like patterns.",
    "Reserved areas must have subtle texture, light, paper depth, color structure, or low-complexity design intent, not blank filler or an empty placeholder board.",
    templates.base.layoutPrompt,
  ].filter(Boolean).join("\n");
}

function buildNegativePrompt(context: StandardImagePromptContext, base: BaseTemplate, visualRules: StandardBackgroundVisualRuleContext): string {
  return unique([
    ...base.negativePrompt,
    ...visualRules.negativePromptPhrases,
    "readable text", "fake Chinese characters", "title text", "fake logo", "fake mascot", "generated mascot",
    "QR code", "phone number", "campus phone", "address", "campus address", "watermark", "cheap advertisement look",
    "cluttered layout", "low quality", "dark oppressive tone", "raw campus info",
    "generic AI art", "blank placeholder", "blank board", "empty gradient background", "stock illustration",
    "decorative wallpaper without theme", "weak primary visual hook", "unsafe logo area", "unclear title-safe zone", "overblank title zone", "overcrowded title zone", "text-like patterns near title/logo zones", "small center text", "detailed objects inside title-safe zone", "central high-detail subject", "high detail behind logo", "default logo patch", "fake white label behind logo", "text-like logo substitute",
    ...(context.avoidNotes ? splitAvoidNotes(context.avoidNotes) : []),
    ...(context.form.avoidNotes ? splitAvoidNotes(context.form.avoidNotes) : []),
  ]).join("\n");
}

function resolveTemplateKeys(context: StandardImagePromptContext, visualRules: StandardBackgroundVisualRuleContext): TemplateKeys {
  const text = allBriefText(context);
  const designFamily = designFamilyFor(visualRules.selectedBenchmarkFamily);
  const layoutFamily = layoutFamilyFor(visualRules.selectedLayoutGrammar);
  const classical = hasAny(text, ["四大名著", "国学", "诗词", "名著", "传统", "古典"]);
  const launch = hasAny(text, ["发布会", "品牌升级", "课程发布", "周年", "公司活动", "发布"]);
  const festival = context.form.productOutputType === "festival";
  const showcase = context.form.productOutputType === "achievementShowcase" || context.form.productOutputType === "classReview";
  if (launch) return { designFamily, layoutFamily, displayPolicy: "titleOnlyDefault", theme: "readingFestival", style: "literary", element: "books" };
  if (classical) return { designFamily, layoutFamily, displayPolicy: "titleOnlyDefault", theme: "classicalLiterature", style: "chinese", element: "classicalPoetry" };
  if (showcase) return { designFamily, layoutFamily, displayPolicy: "titleOnlyDefault", theme: "showcase", style: "warm", element: "books" };
  if (festival) return { designFamily, layoutFamily, displayPolicy: "titleOnlyDefault", theme: "readingFestival", style: "lively", element: "childrenReading" };
  if (context.form.productOutputType === "enrollment") return { designFamily, layoutFamily, displayPolicy: "titleOnlyDefault", theme: "recruitment", style: "warm", element: "books" };
  return { designFamily, layoutFamily, displayPolicy: "titleOnlyDefault", theme: "readingFestival", style: "literary", element: "books" };
}

function designFamilyFor(family: YuanfangVisualFamilyKey): TemplateKeys["designFamily"] {
  if (family === "brandEvent" || family === "companyActivity") return "businessLaunch";
  if (family === "enrollment") return "boldCampaign";
  if (family === "openClass") return "educationGrowth";
  if (family === "literaryActivity") return "literaryEditorial";
  if (family === "guofengLiterature" || family === "poetryFestival") return "modernChinese";
  if (family === "achievementShowcase" || family === "teachingCompetition" || family === "campusActivity") return "achievementShowcase";
  return "literaryEditorial";
}

function layoutFamilyFor(layout: YuanfangLayoutGrammarKey): TemplateKeys["layoutFamily"] {
  if (layout === "topHeroTitle") return "classicTop";
  if (layout === "leftTitleRightVisual" || layout === "rightTitleLeftVisual" || layout === "verticalSealTitle") return "sideTitle";
  if (layout === "bottomInformationPanel") return "bottomTitle";
  if (layout === "centerHeroLockup" || layout === "stageShowcase") return "centerTitle";
  return "eventPoster";
}
