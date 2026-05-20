import { STANDARD_DESIGN_FAMILIES } from "@/config/design-families";
import { STANDARD_DISPLAY_POLICIES } from "@/config/display-policies";
import { STANDARD_LAYOUT_FAMILIES } from "@/config/layout-families";
import type { StandardBackgroundPromptBuildInput, StandardBackgroundPromptBuildResult, StandardImagePromptContext } from "@/models/standard-background-generation";
import type { YuanfangLayoutGrammarKey, YuanfangVisualFamilyKey } from "@/models/yuanfang-visual-rules";
import { buildStandardBackgroundVisualRuleContext, type StandardBackgroundVisualRuleContext } from "@/services/helpers/standard-background-visual-rule-adapter";
import { BENCHMARK_FAMILIES, FORBIDDEN_ELEMENTS, PRODUCT_LABELS, PROMPT_VERSION, TEMPLATE_SOURCES } from "@/services/helpers/standard-background-prompt-policy";
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
        designDecision: visualRules.designDecision,
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
    "Create a title-ready campaign background / event poster base for Yuanfang Standard Form v2.",
    "Benchmark target: Yuanfang event KV base where background supports future system-rendered title dominance, activity identity, brand color energy, and no visible title container.",
    BENCHMARK_FAMILIES[context.form.productOutputType],
    "Do not generate readable Chinese text. Do not generate title text. Do not generate logo. Do not generate mascot.",
    "Do not generate QR code, campus phone, address, name, watermark, or any contact information.",
    "Use the selected L2 layout grammar below; avoid centerBlankBoard, tinyFloatingTitle, lower-only decorative pile patterns, and decorative-border-plus-central-card layouts.",
    "Build the title-ready campaign base first. L4 spatial analysis will later choose usable medium-low complexity regions; do not make an empty prepared text-holder composition.",
    "Reserve logo-safe zones according to the selected logo strategy. Do not generate logo. Do not default to a white logo patch unless the selected strategy explicitly asks for minimalProtectionPatch.",
    context.constraints.reserveMascotSpace ? "Leave optional small mascot compositing space, but do not generate the mascot." : "",
    context.constraints.reserveCampusInfoSpace ? "Leave optional information compositing space, but do not generate campus text." : "",
    "",
    `Canvas: ${context.canvas.width}x${context.canvas.height}. Selected canvas intent: ${visualRules.selectedCanvasIntent}; aspectRatioClass: ${visualRules.aspectRatioClass}.`,
    `Material type: ${PRODUCT_LABELS[context.form.productOutputType]}.`,
    `Main visual theme anchor: ${hook || context.form.productOutputType}.`,
    hook ? "Use the visualHook as the main background theme anchor; translate it into visual symbols, space, color, and atmosphere without writing the words." : "",
    context.visualHook?.mismatchReason ? `Visual hook note: ${context.visualHook.mismatchReason}` : "",
    `Title content is rendered later by the title system and is reference-only for theme understanding: ${context.title.mainTitle}${context.title.subtitle ? ` / ${context.title.subtitle}` : ""}. Do not draw these words or allocate a visible container for them.`,
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
    "Design density: use 3-5 controlled layers according to the selected layout grammar, such as foreground theme symbols, mid-ground campaign space, background light/motion, brand color accents, and title-ready hierarchy.",
    "Style diversity: follow the selected style treatment for material, color energy, motif handling, and composition; do not make every output a soft pastel illustration.",
    "Primary visual hook: make the visualHook or strongest brief phrase drive the largest non-text visual motif, but keep it supportive enough for future title lockup dominance.",
    "Extract 2-4 unique memory points from eventBrief, styleBrief, visualDetails, and visualHook.",
    "Translate them into background composition, symbolic objects, depth, light, material, and movement.",
    "Match the benchmark family instead of making a generic illustration, stock education poster, flat gradient, or decorative wallpaper.",
    "Keep theme visuals memorable but controlled; high-detail clusters should stay around subject groups, edges, podiums, ribbons, or motif clusters.",
    "Background supports title hierarchy: create bold shapes, color blocks, directional flow, and medium-low complexity integrated regions, without naming or drawing a text container.",
    "Do not make the background's subject more dominant than the future title lockup; avoid finished illustration focal climax and over-detailed central focal climax.",
    "The output should feel like a title-ready Yuanfang campaign base, not a finished illustration scene, storybook cover, immersive world, or prepared empty area.",
    "Avoid visibleTitleContainer, titleCardArtifact, standaloneBlankPaper, oversizedTextPlaque, fullHeightSideWall, centralDocumentDominance, labelPatchForTitle, emptyContainerForText, oversizedTitleSafeBoard, backgroundOverpowersTitle, titleLayerNoDominance, and centerBlankBoard patterns.",
    "Composition must support a later bold system-rendered title: strong but controlled subject, branded color rhythm, varied layout, and natural calmer regions created by the scene itself; do not build a prepared text container.",
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
    "oversized title-safe board", "full-height blank panel", "giant empty plaque", "empty spotlight curtain", "central paper sheet dominance", "title-safe area over 40 percent", "disconnected title island",
    "finished illustration focal climax", "over-detailed central illustration", "background overpowers title", "future title cannot dominate", "fully rendered storybook scene", "immersive world as final artwork",
    "do not draw a title card", "do not draw a blank paper sheet for text", "do not draw a plaque for text", "do not draw a label area", "do not draw a full-height side panel", "do not draw a central document", "do not draw a spotlight curtain", "do not draw a visible empty title container",
    "pseudo text rows", "fake handwritten lines", "fake UI labels", "fake certificate words", "fake document paragraphs", "wall poster text blocks",
    ...(context.avoidNotes ? splitAvoidNotes(context.avoidNotes) : []),
    ...(context.form.avoidNotes ? splitAvoidNotes(context.form.avoidNotes) : []),
  ]).join("\n");
}

function resolveTemplateKeys(context: StandardImagePromptContext, visualRules: StandardBackgroundVisualRuleContext): TemplateKeys {
  const text = allBriefText(context);
  const designFamily = designFamilyFor(visualRules.selectedBenchmarkFamily);
  const layoutFamily = layoutFamilyFor(visualRules.selectedLayoutGrammar);
  const classical = hasAny(text, ["国风", "国学", "诗词", "古诗", "飞花令", "端午", "传统文化", "古典", "水墨"]);
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
