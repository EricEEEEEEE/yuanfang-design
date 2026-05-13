import { existsSync, readFileSync } from "node:fs";
import { generateTitleCandidates } from "../src/services/title-candidate.service";
import { renderTitleCandidatePreviews } from "../src/services/title-candidate-preview.service";

const BACKGROUND_IMAGE_PATH = "/tmp/yuanfang-title-director-bg.jpg";
const OUTPUT_DIR = "/tmp";

async function main(): Promise<void> {
  if (!existsSync(BACKGROUND_IMAGE_PATH)) {
    console.error("TITLE_CANDIDATE_PREVIEW_BACKGROUND_MISSING", BACKGROUND_IMAGE_PATH);
    process.exit(1);
  }

  const backgroundImageBase64 = readFileSync(BACKGROUND_IMAGE_PATH).toString("base64");
  const candidateResult = await generateTitleCandidates({
    backgroundImageBase64,
    mainTitle: "成长汇报课",
    subtitle: "看见孩子的表达力量",
    designFamily: "achievementShowcase",
    layoutFamily: "centerTitle",
    displayPolicy: "titleOnlyDefault",
    productOutputType: "mainVisual",
    eventBrief:
      "这是一次学期成长汇报课，孩子会展示阅读、写作、表达和课堂展示方面的成长。",
    styleBrief: "明亮、有仪式感、有成果感，也要专业可信。",
    visualDetails: "作品墙、展示台、舞台光、奖章、表达麦克风、课程成果板。",
    avoidNotes: "不要山水卷轴、不要低幼卡通、不要人物太多。",
  });
  const previewResult = await renderTitleCandidatePreviews({
    backgroundImagePath: BACKGROUND_IMAGE_PATH,
    outputDir: OUTPUT_DIR,
    candidates: candidateResult.candidates,
  });

  console.log("PREVIEW_SOURCE", candidateResult.source);
  console.log("PREVIEW_CANDIDATE_COUNT", candidateResult.candidates.length);
  console.log("PREVIEW_PATHS", previewResult.previewPaths.join(","));
  console.log("CONTACT_SHEET_PATH", previewResult.contactSheetPath);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error("TITLE_CANDIDATE_PREVIEW_FAILED", message);
  process.exit(1);
});
