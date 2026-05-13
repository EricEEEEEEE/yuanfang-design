import { existsSync, readFileSync } from "node:fs";
import { analyzeBackgroundLayout } from "../src/services/background-layout-intelligence.service";

const BACKGROUND_IMAGE_PATH = "/tmp/yuanfang-title-director-bg.jpg";

async function main(): Promise<void> {
  if (!existsSync(BACKGROUND_IMAGE_PATH)) {
    console.error("BACKGROUND_LAYOUT_TEST_IMAGE_MISSING", BACKGROUND_IMAGE_PATH);
    process.exit(1);
  }

  const backgroundImageBase64 = readFileSync(BACKGROUND_IMAGE_PATH).toString("base64");
  const result = await analyzeBackgroundLayout({
    backgroundImageBase64,
    designFamily: "achievementShowcase",
    layoutFamily: "centerTitle",
    productOutputType: "mainVisual",
    eventBrief:
      "这是一次学期成长汇报课，孩子会展示阅读、写作、表达和课堂展示方面的成长。",
    visualDetails: "作品墙、展示台、舞台光、奖章、表达麦克风、课程成果板。",
    avoidNotes: "不要山水卷轴、不要低幼卡通、不要人物太多。",
  });

  console.error("BACKGROUND_LAYOUT_SOURCE", result.source);
  console.error("NEGATIVE_SPACE_SHAPE", result.negativeSpaceShape);
  console.error("DOMINANT_FLOW", result.dominantFlow);
  console.error("RECOMMENDED_TITLE_FLOW", result.recommendedTitleFlow);
  console.error("SAFE_ZONE_COUNT", result.safeZones.length);
  console.error("TEXT_ANCHOR_COUNT", result.textAnchors.length);
  console.error("BACKGROUND_LAYOUT_REASON", result.compositionReason);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error("BACKGROUND_LAYOUT_TEST_FAILED", message);
  process.exit(1);
});
