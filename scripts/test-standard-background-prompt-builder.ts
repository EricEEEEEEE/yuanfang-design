import { execFileSync } from "node:child_process";
import { hasAll, primaryMessageChecks, qualitySummary } from "./helpers/standard-background-prompt-builder-assertions";
import { ACHIEVEMENT, AVOID_STRESS, BRAND_EVENT, FESTIVAL, FOUR_CLASSICS } from "./helpers/standard-background-prompt-builder-fixtures";
import { buildStandardBackgroundPrompt } from "../src/services/standard-background-prompt-builder.service";

function main() {
  const four = buildStandardBackgroundPrompt({ promptContext: FOUR_CLASSICS });
  const achievement = buildStandardBackgroundPrompt({ promptContext: ACHIEVEMENT });
  const festival = buildStandardBackgroundPrompt({ promptContext: FESTIVAL });
  const brandEvent = buildStandardBackgroundPrompt({ promptContext: BRAND_EVENT });
  const avoid = buildStandardBackgroundPrompt({ promptContext: AVOID_STRESS });
  const primary = primaryMessageChecks();
  const checks = [
    ["STANDARD_BACKGROUND_BENCHMARK_LANGUAGE_CHECK", hasAll(four.prompt, ["Yuanfang education-brand key visual benchmark", "visual density", "primary visual hook", "title-safe", "logo-safe"])],
    ["STANDARD_BACKGROUND_SAFE_ZONE_PROTECTION_CHECK", hasAll(four.prompt, ["protected center or upper-center vertical title-safe column", "low-complexity", "central protected title column", "Do not place detailed objects"])],
    ["STANDARD_BACKGROUND_FOUR_CLASSICS_THEME_CHECK", hasAll(four.prompt, ["四大名著", "书籍", "国风"])],
    ["STANDARD_BACKGROUND_NO_TEXT_POLICY_CHECK", hasAll(four.prompt, ["Background visual only", "not a final poster", "Do not generate readable", "Do not generate title"])],
    ["STANDARD_BACKGROUND_NO_LOGO_POLICY_CHECK", hasAll(four.prompt, ["Do not generate logo", "Logo is composited later"])],
    ["STANDARD_BACKGROUND_NO_CAMPUS_POLICY_CHECK", hasAll(four.prompt, ["campus phone", "Campus information is composited later"])],
    ["STANDARD_BACKGROUND_NEGATIVE_PROMPT_CHECK", hasAll(four.negativePrompt, ["readable text", "fake Chinese characters", "QR code", "phone number", "address"])],
    ["STANDARD_BACKGROUND_GENERIC_AI_ART_GUARD_CHECK", hasAll(four.negativePrompt, ["generic AI art", "blank placeholder", "empty gradient background", "weak primary visual hook"])],
    ["STANDARD_BACKGROUND_ACHIEVEMENT_CHECK", hasAll(achievement.prompt, ["阅读成果", "作品墙", "舞台光"])],
    ["STANDARD_BACKGROUND_FESTIVAL_CHECK", hasAll(festival.prompt, ["诗词", "节日", "书卷"])],
    ["STANDARD_BACKGROUND_BRAND_EVENT_CHECK", hasAll(brandEvent.prompt, ["发布会", "品牌升级", "brand event", "brand color"])],
    ["STANDARD_BACKGROUND_AVOID_STRESS_CHECK", hasAll(avoid.negativePrompt, ["真实照片", "日漫", "水印", "二维码", "廉价广告"])],
  ];
  const qa = [
    ["fourClassicsEnrollment", qualitySummary(four.prompt, four.negativePrompt)],
    ["achievementShowcase", qualitySummary(achievement.prompt, achievement.negativePrompt)],
    ["festivalPoetry", qualitySummary(festival.prompt, festival.negativePrompt)],
    ["brandEventLaunch", qualitySummary(brandEvent.prompt, brandEvent.negativePrompt)],
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
  console.log("STANDARD_BACKGROUND_BENCHMARK_SAMPLE_QA", JSON.stringify(qa));
  console.log("STANDARD_PRIMARY_MESSAGE_SAMPLE_RESULTS", JSON.stringify(primary.results));
  for (const [label, passed] of checks) console.log(label, passed ? "PASS" : "FAIL");
  for (const [label, passed] of primary.checks) console.log(label, passed ? "PASS" : "FAIL");
  console.log("STANDARD_BACKGROUND_WARNINGS", JSON.stringify(four.promptDiagnostics.warnings));
  console.log("GIT_STATUS_SHORT", JSON.stringify(gitStatus()));

  if (!four.ok || !four.promptDiagnostics.promptHash || checks.some(([, passed]) => !passed) || primary.checks.some(([, passed]) => !passed)) {
    process.exitCode = 1;
  }
}

function gitStatus(): string {
  return execFileSync("git", ["status", "--short"], { encoding: "utf8" }).trim();
}

main();
