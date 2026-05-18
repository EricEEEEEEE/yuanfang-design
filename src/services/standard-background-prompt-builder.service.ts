import { STANDARD_DESIGN_FAMILIES } from "@/config/design-families";
import { STANDARD_DISPLAY_POLICIES } from "@/config/display-policies";
import { STANDARD_LAYOUT_FAMILIES } from "@/config/layout-families";
import type { StandardBackgroundPromptBuildInput, StandardBackgroundPromptBuildResult, StandardImagePromptContext } from "@/models/standard-background-generation";
import { BENCHMARK_FAMILIES, BENCHMARK_STANDARD, FORBIDDEN_ELEMENTS, PRODUCT_LABELS, PROMPT_VERSION, TEMPLATE_SOURCES } from "@/services/helpers/standard-background-prompt-policy";
import { type BaseTemplate, loadTemplates, type TemplateKeys } from "@/services/helpers/standard-background-prompt-templates";
import { allBriefText, buildWarnings, consumedFields, formatPalette, hasAny, sha256, splitAvoidNotes, unique } from "@/services/helpers/standard-background-prompt-utils";

export function buildStandardBackgroundPrompt(
  input: StandardBackgroundPromptBuildInput,
): StandardBackgroundPromptBuildResult {
  const context = input.promptContext;
  const templates = loadTemplates();
  const keys = resolveTemplateKeys(context);
  const prompt = buildPrompt(context, templates, keys);
  const negativePrompt = buildNegativePrompt(context, templates.base);
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
      usedTemplateSources: [...TEMPLATE_SOURCES, "src/config/design-families.ts", "src/config/layout-families.ts", "src/config/display-policies.ts"],
      visualHook: context.visualHook,
      backgroundOnly: true,
      forbiddenGeneratedElements: FORBIDDEN_ELEMENTS,
      warnings,
    },
  };
}

function buildPrompt(context: StandardImagePromptContext, templates: ReturnType<typeof loadTemplates>, keys: TemplateKeys): string {
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
    "Reserve a large continuous protected center or upper-center vertical title-safe column covering about 45%-55% of the canvas, visually obvious for downstream layout analysis, with calm low-complexity layered light, paper depth, brand color block, or gentle texture; do not place detailed objects, faces, icons, strong contrast, or text-like patterns inside it.",
    "Reserve a clean logo-safe zone near the top-right with low detail and high contrast. Do not place detailed objects behind the future logo. Keep official logo, mascot, QR, and campus information for later compositing.",
    context.constraints.reserveMascotSpace ? "Leave optional small mascot compositing space, but do not generate the mascot." : "",
    context.constraints.reserveCampusInfoSpace ? "Leave optional information compositing space, but do not generate campus text." : "",
    "",
    `Canvas: ${context.canvas.width}x${context.canvas.height}, vertical 2:3.`,
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
    "Design density: use 3-5 controlled layers around outer edges, lower third, and secondary zones, such as foreground theme symbols, mid-ground campaign space, background light/motion, brand color accents, and safe-zone structure.",
    "Primary visual hook: make the visualHook or strongest brief phrase drive the largest non-text visual motif as a side/lower framing element outside the protected title-safe and logo-safe zones, not just a small decoration.",
    "Extract 2-4 unique memory points from eventBrief, styleBrief, visualDetails, and visualHook.",
    "Translate them into background composition, symbolic objects, depth, light, material, and movement.",
    "Match the benchmark family instead of making a generic illustration, stock education poster, blank gradient, or decorative wallpaper.",
    "Keep theme visuals memorable but controlled; keep detailed objects outside the central protected title column and logo-safe zone; avoid clutter and excessive text-like patterns.",
    "Reserved areas must have subtle texture, light, paper depth, or low-complexity structure, not blank filler.",
    templates.base.layoutPrompt,
  ].filter(Boolean).join("\n");
}

function buildNegativePrompt(context: StandardImagePromptContext, base: BaseTemplate): string {
  return unique([
    ...base.negativePrompt,
    "readable text", "fake Chinese characters", "title text", "fake logo", "fake mascot",
    "QR code", "phone number", "address", "watermark", "cheap advertisement look",
    "cluttered layout", "low quality", "dark oppressive tone", "raw campus info",
    "generic AI art", "blank placeholder", "empty gradient background", "stock illustration",
    "decorative wallpaper without theme", "weak primary visual hook", "unsafe logo area", "unclear title-safe zone", "detailed objects inside title-safe zone", "central high-detail subject", "high detail behind logo",
    ...(context.avoidNotes ? splitAvoidNotes(context.avoidNotes) : []),
    ...(context.form.avoidNotes ? splitAvoidNotes(context.form.avoidNotes) : []),
  ]).join("\n");
}

function resolveTemplateKeys(context: StandardImagePromptContext): TemplateKeys {
  const text = allBriefText(context);
  const classical = hasAny(text, ["四大名著", "国学", "诗词", "名著", "传统", "古典"]);
  const launch = hasAny(text, ["发布会", "品牌升级", "课程发布", "周年", "公司活动", "发布"]);
  const festival = context.form.productOutputType === "festival";
  const showcase = context.form.productOutputType === "achievementShowcase" || context.form.productOutputType === "classReview";
  if (launch) return { designFamily: "businessLaunch", layoutFamily: "centerTitle", displayPolicy: "titleOnlyDefault", theme: "readingFestival", style: "literary", element: "books" };
  if (classical) return { designFamily: "modernChinese", layoutFamily: "centerTitle", displayPolicy: "titleOnlyDefault", theme: "classicalLiterature", style: "chinese", element: "classicalPoetry" };
  if (showcase) return { designFamily: "achievementShowcase", layoutFamily: "centerTitle", displayPolicy: "titleOnlyDefault", theme: "showcase", style: "warm", element: "books" };
  if (festival) return { designFamily: "ipCartoonEvent", layoutFamily: "eventPoster", displayPolicy: "titleOnlyDefault", theme: "readingFestival", style: "lively", element: "childrenReading" };
  if (context.form.productOutputType === "enrollment") return { designFamily: "educationGrowth", layoutFamily: "classicTop", displayPolicy: "titleOnlyDefault", theme: "recruitment", style: "warm", element: "books" };
  return { designFamily: "literaryEditorial", layoutFamily: "centerTitle", displayPolicy: "titleOnlyDefault", theme: "readingFestival", style: "literary", element: "books" };
}
