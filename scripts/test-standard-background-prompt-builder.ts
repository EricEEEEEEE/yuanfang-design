import { execFileSync } from "node:child_process";
import { BRAND } from "../src/config/brand";
import type { StandardImagePromptContext } from "../src/models/standard-background-generation";
import { buildStandardBackgroundPrompt } from "../src/services/standard-background-prompt-builder.service";

const CANVAS = { width: 1080, height: 1620 };
const BASE_BRAND = {
  brandName: BRAND.name,
  brandEnglishName: BRAND.englishName,
  palette: BRAND.colors,
  visualMotifs: ["阅读", "表达", "成长", "书本", "文学想象"],
  logoPolicy: "Logo is composited later from official assets; AI must not generate it.",
  mascotPolicy: "Mascot is composited later from official assets; AI must not generate it.",
  campusPolicy: "Campus information is composited later as assets; AI must not generate contact text.",
};
const BASE_CONSTRAINTS = {
  forbidReadableText: true,
  forbidLogoGeneration: true,
  forbidMascotGeneration: true,
  forbidCampusTextGeneration: true,
  reserveTitleSpace: true,
  reserveLogoSpace: true,
} as const;

const FOUR_CLASSICS = context({
  productOutputType: "enrollment",
  eventBrief: "孩子可以通过假期免费上 4 节课，感受四大名著内容，让孩子爱上名著、爱上文学、爱上语文。",
  styleBrief: "能够让家长感受到四大名著的那种感觉，并且一眼能看出来。不要和传统四大名著感觉一样，要有高级感。",
  visualDetails: "希望图片里出现四大名著的代表人物或者书籍，同时表现出孩子渴望阅读四大名著的感觉。",
  titleBrief: "希望突出四大名著四个字，让家长知道我们通过四大名著课程招收孩子。",
  avoidNotes: "不要出现真实儿童照片，不要有压抑的颜色，也不要有日本动漫的感觉。",
  mainTitle: "暑期体验课",
  subtitle: "四大名著体验营",
  hook: "四大名著",
  hookReason: "用户描述中“四大名著”多次出现，但 mainTitle 是“暑期体验课”。",
});
const ACHIEVEMENT = context({
  productOutputType: "achievementShowcase",
  eventBrief: "孩子完成了阅读表达成果展示，课堂上展示作品墙、阅读分享和表达能力。",
  styleBrief: "希望整体温暖、明亮、有书香气，带一点课堂展示的仪式感。",
  visualDetails: "作品墙、舞台光、书本、展示台和柔和灯光。",
  titleBrief: "突出成长和阅读成果。",
  mainTitle: "成长汇报课",
  subtitle: "阅读成果展示",
  hook: "阅读成果",
});
const FESTIVAL = context({
  productOutputType: "festival",
  eventBrief: "端午节前发布融合诗词、传统文化和儿童阅读氛围的节日主题海报。",
  styleBrief: "温暖、有书香气，传统但不老气，适合远方文学品牌。",
  visualDetails: "书卷、粽叶、淡雅纹样、节日色彩和儿童阅读氛围。",
  titleBrief: "突出节日阅读活动。",
  avoidNotes: "不要低幼贴纸，不要可读文字。",
  mainTitle: "端午诗会",
  subtitle: "文学节日活动",
  hook: "诗词",
});
const AVOID_STRESS = context({
  productOutputType: "socialPost",
  eventBrief: "发布一张阅读活动朋友圈图，提醒家长带孩子参与文学体验。",
  styleBrief: "干净、现代、有文学感，不要吵闹。",
  visualDetails: "书页空间、阅读灯光、纸张层次。",
  titleBrief: "突出阅读体验。",
  avoidNotes: "不要真实照片,不要黑暗,不要日漫,不要水印,不要电话,不要二维码,不要拥挤,不要低清,不要廉价广告,不要乱码",
  mainTitle: "阅读体验",
  hook: "阅读",
});

function main() {
  const four = buildStandardBackgroundPrompt({ promptContext: FOUR_CLASSICS });
  const achievement = buildStandardBackgroundPrompt({ promptContext: ACHIEVEMENT });
  const festival = buildStandardBackgroundPrompt({ promptContext: FESTIVAL });
  const avoid = buildStandardBackgroundPrompt({ promptContext: AVOID_STRESS });
  const checks = [
    ["STANDARD_BACKGROUND_FOUR_CLASSICS_THEME_CHECK", hasAll(four.prompt, ["四大名著", "书籍", "国风"])],
    ["STANDARD_BACKGROUND_NO_TEXT_POLICY_CHECK", hasAll(four.prompt, ["Background visual only", "not a final poster", "Do not generate readable", "Do not generate title"])],
    ["STANDARD_BACKGROUND_NO_LOGO_POLICY_CHECK", hasAll(four.prompt, ["Do not generate logo", "Logo is composited later"])],
    ["STANDARD_BACKGROUND_NO_CAMPUS_POLICY_CHECK", hasAll(four.prompt, ["campus phone", "Campus information is composited later"])],
    ["STANDARD_BACKGROUND_NEGATIVE_PROMPT_CHECK", hasAll(four.negativePrompt, ["readable text", "fake Chinese characters", "QR code", "phone number", "address"])],
    ["STANDARD_BACKGROUND_ACHIEVEMENT_CHECK", hasAll(achievement.prompt, ["阅读成果", "作品墙", "舞台光"])],
    ["STANDARD_BACKGROUND_FESTIVAL_CHECK", hasAll(festival.prompt, ["诗词", "节日", "书卷"])],
    ["STANDARD_BACKGROUND_AVOID_STRESS_CHECK", hasAll(avoid.negativePrompt, ["真实照片", "日漫", "水印", "二维码", "廉价广告"])],
  ];

  console.log("STANDARD_BACKGROUND_PROMPT_SOURCE", four.source);
  console.log("STANDARD_BACKGROUND_PROMPT_OK", four.ok ? "PASS" : "FAIL");
  console.log("STANDARD_BACKGROUND_PROMPT_VERSION", four.promptDiagnostics.promptVersion);
  console.log("STANDARD_BACKGROUND_PROMPT_HASH", four.promptDiagnostics.promptHash);
  console.log("STANDARD_BACKGROUND_PROMPT_LENGTH", four.prompt.length);
  console.log("STANDARD_BACKGROUND_NEGATIVE_PROMPT_LENGTH", four.negativePrompt.length);
  console.log("STANDARD_BACKGROUND_CONSUMED_FIELDS", JSON.stringify(four.promptDiagnostics.consumedFields));
  console.log("STANDARD_BACKGROUND_TEMPLATE_SOURCES", JSON.stringify(four.promptDiagnostics.usedTemplateSources));
  console.log("STANDARD_BACKGROUND_FORBIDDEN_ELEMENTS", JSON.stringify(four.promptDiagnostics.forbiddenGeneratedElements));
  for (const [label, passed] of checks) console.log(label, passed ? "PASS" : "FAIL");
  console.log("STANDARD_BACKGROUND_WARNINGS", JSON.stringify(four.promptDiagnostics.warnings));
  console.log("GIT_STATUS_SHORT", JSON.stringify(gitStatus()));

  if (!four.ok || !four.promptDiagnostics.promptHash || checks.some(([, passed]) => !passed)) {
    process.exitCode = 1;
  }
}

function context(input: {
  productOutputType: StandardImagePromptContext["form"]["productOutputType"];
  eventBrief: string; styleBrief: string; visualDetails?: string; titleBrief: string; avoidNotes?: string;
  mainTitle: string; subtitle?: string; hook?: string; hookReason?: string;
}): StandardImagePromptContext {
  return {
    source: "standard-form-v2",
    brandKey: "yuanfangDefault",
    canvas: CANVAS,
    form: {
      productOutputType: input.productOutputType,
      eventBrief: input.eventBrief,
      styleBrief: input.styleBrief,
      ...(input.visualDetails ? { visualDetails: input.visualDetails } : {}),
      titleBrief: input.titleBrief,
      ...(input.avoidNotes ? { avoidNotes: input.avoidNotes } : {}),
    },
    title: { mainTitle: input.mainTitle, ...(input.subtitle ? { subtitle: input.subtitle } : {}) },
    visualHook: input.hook ? { primaryHook: input.hook, source: "manual", possibleMismatch: Boolean(input.hookReason), mismatchReason: input.hookReason } : undefined,
    brand: BASE_BRAND,
    constraints: BASE_CONSTRAINTS,
    avoidNotes: input.avoidNotes,
    outputIntent: { backgroundOnly: true, finalPoster: false },
  };
}

function hasAll(value: string, needles: string[]): boolean {
  return needles.every((needle) => value.includes(needle));
}

function gitStatus(): string {
  return execFileSync("git", ["status", "--short"], { encoding: "utf8" }).trim();
}

main();
