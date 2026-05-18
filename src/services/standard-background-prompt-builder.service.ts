import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STANDARD_DESIGN_FAMILIES, type StandardDesignFamilyKey } from "@/config/design-families";
import { STANDARD_DISPLAY_POLICIES } from "@/config/display-policies";
import { STANDARD_LAYOUT_FAMILIES, type StandardLayoutFamilyKey } from "@/config/layout-families";
import type { StandardBackgroundPromptBuildInput, StandardBackgroundPromptBuildResult, StandardImagePromptContext } from "@/models/standard-background-generation";

type BaseTemplate = { basePrompt: string; layoutPrompt: string; negativePrompt: string[] };
type BrandRulesTemplate = {
  brandName: string; englishName: string; brandSpirit: string[]; colors: Record<string, string>;
  visualLanguage: string[]; allowedVisualMotifs: string[]; logoRules: string[]; mascotRules: string[];
};
type FragmentMap = Record<string, { label?: string; purpose?: string; prompt: string }>;
type TemplateKeys = { designFamily: StandardDesignFamilyKey; layoutFamily: StandardLayoutFamilyKey; displayPolicy: string; theme: string; style: string; element: string };

const PROMPT_VERSION = "standard-background-prompt-v1";
const TEMPLATE_SOURCES = [
  "docs/STANDARD_PROMPT_LANGUAGE_V2.md",
  "templates/_base.json",
  "templates/_brand-rules.json",
  "templates/standard/themes.json",
  "templates/standard/styles.json",
  "templates/standard/elements.json",
];
const FORBIDDEN_ELEMENTS = [
  "readable text", "Chinese title text", "English title text", "fake Chinese characters",
  "logo", "Yuanfang logo", "mascot", "QR code", "campus phone", "address", "watermark",
];
const PRODUCT_LABELS = { achievementShowcase: "成果展示图", enrollment: "招生宣传图", festival: "节日活动图", classReview: "课堂回顾图", parentNotice: "家长通知图", socialPost: "朋友圈传播图" };
const BENCHMARK_STANDARD = "Yuanfang education-brand key visual benchmark: thematic campaign background, strong primary visual hook, rich controlled visual density framing protected safe zones, clear title-safe zone, clear logo-safe zone, professional brand material quality, not generic AI art.";
const BENCHMARK_FAMILIES = {
  enrollment: "Benchmark family A: enrollment / open class / literary activity key visual; bright, social-share friendly, course value visible, theme readable at a glance without text.",
  achievementShowcase: "Benchmark family B: achievement showcase / report class key visual; stage light, works wall, growth path, ceremony, parent witness feeling.",
  festival: "Benchmark family C: festival / poetry / modern Chinese culture key visual; scrolls, seasonal symbols, literary atmosphere, modern not old-fashioned.",
  classReview: "Benchmark family B: achievement showcase / class review key visual; works wall, classroom outcome space, warm spotlight, growth evidence.",
  parentNotice: "Benchmark family D: brand / notice key visual; structured brand blocks, clean hierarchy, strong safe zones, not empty template.",
  socialPost: "Benchmark family D: company activity / launch / brand event key visual; launch-stage energy, brand color motion, strong visual impact.",
};

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

function loadTemplates() {
  return {
    base: loadJson<BaseTemplate>("templates/_base.json"),
    brand: loadJson<BrandRulesTemplate>("templates/_brand-rules.json"),
    themes: loadJson<FragmentMap>("templates/standard/themes.json"),
    styles: loadJson<FragmentMap>("templates/standard/styles.json"),
    elements: loadJson<FragmentMap>("templates/standard/elements.json"),
  };
}

function loadJson<T>(relativePath: string): T { return JSON.parse(readFileSync(join(process.cwd(), relativePath), "utf8")) as T; }

function buildWarnings(context: StandardImagePromptContext): string[] {
  return [
    ...(context.outputIntent.backgroundOnly ? [] : ["outputIntent must remain backgroundOnly."]),
    ...(context.visualHook?.possibleMismatch && context.visualHook.mismatchReason ? [context.visualHook.mismatchReason] : []),
  ];
}

function consumedFields(context: StandardImagePromptContext): string[] {
  return ["productOutputType", "eventBrief", "styleBrief", "visualDetails", "titleBrief", "avoidNotes", "mainTitle", "subtitle", ...(context.visualHook?.primaryHook ? ["visualHook"] : [])];
}

function allBriefText(context: StandardImagePromptContext): string {
  return [context.visualHook?.primaryHook, context.form.eventBrief, context.form.styleBrief, context.form.visualDetails, context.form.titleBrief, context.form.avoidNotes].filter(Boolean).join(" ");
}

function hasAny(value: string, needles: string[]): boolean { return needles.some((needle) => value.includes(needle)); }

function splitAvoidNotes(value: string): string[] { return value.split(/[，,;；、\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 12); }

function unique(values: string[]): string[] { return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))); }

function formatPalette(colors: Record<string, string>): string { return Object.entries(colors).map(([key, value]) => `${key} ${value}`).join(", "); }

function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
