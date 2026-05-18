import { detectVisualHook } from "../../src/app/api/generate/standard/v2/diagnostics";
import type { StandardGenerateV2Request } from "../../src/models/standard-generation-api-v2";
import { buildStandardBackgroundPrompt } from "../../src/services/standard-background-prompt-builder.service";
import { CANVAS, context } from "./standard-background-prompt-builder-fixtures";

export function hasAll(value: string, needles: string[]): boolean {
  return needles.every((needle) => value.includes(needle));
}

export function qualitySummary(prompt: string, negativePrompt: string): Record<string, string> {
  return {
    themeVisible: pass(prompt, ["primary visual hook", "Main visual theme anchor"]),
    designDensity: pass(prompt, ["visual density", "3-5 controlled layers"]),
    yuanfangBrand: pass(prompt, ["Yuanfang", "brand color", "education-brand"]),
    titleSafe: pass(prompt, ["vertical title-safe column", "45%-55%", "low-complexity"]),
    logoSafe: pass(prompt, ["logo-safe", "top-right"]),
    noTextPolicy: pass(prompt + negativePrompt, ["Do not generate readable", "fake Chinese characters"]),
    genericGuard: pass(negativePrompt, ["generic AI art", "blank placeholder"]),
  };
}

export function primaryMessageChecks(): { results: Record<string, string>[]; checks: Array<[string, boolean]> } {
  const samples = [
    ["enrollment", "暑期体验课", "四大名著体验营", "希望突出四大名著四个字", "感受四大名著内容", "四大名著代表书籍", "四大名著"],
    ["enrollment", "春季公开课", "AI作文批改体验", "主打AI作文批改", "春季写作公开课", "作文批改流程", "AI作文批改"],
    ["achievementShowcase", "成长汇报课", "看见孩子的表达力量", "突出孩子第一次独立表达", "阅读成果展示", "作品墙和舞台灯光", "孩子第一次独立表达"],
    ["festival", "端午诗词会", "在诗词里遇见传统文化", "强调诗词里的传统文化", "端午节日海报", "书卷和粽叶", "诗词里的传统文化"],
    ["enrollment", "阅读体验课", "整本书阅读入门", "突出整本书阅读", "阅读方法体验课", "阅读路径", "整本书阅读"],
  ] as const;
  const results = samples.map(([productOutputType, mainTitle, subtitle, titleBrief, eventBrief, visualDetails, expected]) => {
    const request = { source: "standard-form-v2", brandKey: "yuanfangDefault", canvas: CANVAS, form: { productOutputType, eventBrief, styleBrief: "明亮可信", visualDetails, titleBrief }, title: { mainTitle, subtitle }, background: { mode: "debugFixture" } } as StandardGenerateV2Request;
    const hook = detectVisualHook(request);
    const prompt = buildStandardBackgroundPrompt({ promptContext: context({ productOutputType, eventBrief, styleBrief: "明亮可信", visualDetails, titleBrief, mainTitle, subtitle, hook: hook.detectedPrimaryHook }) });
    return { mainTitle, expected, detectedPrimaryMessage: hook.detectedPrimaryMessage ?? "", visualHook: hook.detectedPrimaryHook ?? "", hookSource: hook.hookSource ?? "", mainTitleMismatch: hook.mainTitleMismatch ? "YES" : "NO", titleHierarchyRisk: hook.titleHierarchyRisk ?? "none", backgroundPromptContainsHook: prompt.prompt.includes(expected) ? "PASS" : "FAIL", mainTitlePreserved: hook.mainTitle === mainTitle ? "PASS" : "FAIL", pass: hook.detectedPrimaryMessage === expected ? "PASS" : "FAIL" };
  });
  return { results, checks: [["STANDARD_PRIMARY_MESSAGE_ALL_SAMPLES", results.every((item) => item.pass === "PASS")], ["STANDARD_PRIMARY_MESSAGE_BACKGROUND_PROMPT_CONTAINS_HOOK", results.every((item) => item.backgroundPromptContainsHook === "PASS")], ["STANDARD_PRIMARY_MESSAGE_MAIN_TITLE_PRESERVED", results.every((item) => item.mainTitlePreserved === "PASS")]] };
}

function pass(value: string, needles: string[]): string {
  return hasAll(value, needles) ? "PASS" : "CHECK";
}
