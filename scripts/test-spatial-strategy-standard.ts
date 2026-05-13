import { existsSync, readFileSync } from "node:fs";
import { planSpatialStrategy } from "../src/services/spatial-strategy-planner.service";

const BACKGROUND_IMAGE_PATH = "/tmp/yuanfang-title-director-bg.jpg";

async function main(): Promise<void> {
  if (!existsSync(BACKGROUND_IMAGE_PATH)) {
    console.error("SPATIAL_STRATEGY_TEST_IMAGE_MISSING", BACKGROUND_IMAGE_PATH);
    process.exit(1);
  }

  const backgroundImageBase64 = readFileSync(BACKGROUND_IMAGE_PATH).toString("base64");
  const result = await planSpatialStrategy({
    backgroundImageBase64,
    mainTitle: "成长汇报课",
    subtitle: "看见孩子的表达力量",
    designFamily: "achievementShowcase",
    layoutFamily: "centerTitle",
    productOutputType: "mainVisual",
    eventBrief:
      "这是一次学期成长汇报课，孩子会展示阅读、写作、表达和课堂展示方面的成长。",
    styleBrief: "明亮、有仪式感、有成果感，也要专业可信。",
    visualDetails: "作品墙、展示台、舞台光、奖章、表达麦克风、课程成果板。",
    avoidNotes: "不要山水卷轴、不要低幼卡通、不要人物太多。",
  });

  console.error("SPATIAL_STRATEGY_SOURCE", result.source);
  console.error("CONTENT_INTENT", result.contentIntent);
  console.error("STRATEGY_MODE", result.strategyMode);
  console.error("ORIENTATION_PREFERENCE", result.orientationPreference);
  console.error("PRIMARY_TEXT_ANCHOR", result.primaryTextAnchorId);
  console.error("PRIMARY_PATTERNS", result.patternPool.primary.join(","));
  console.error("DISALLOWED_PATTERNS", result.patternPool.disallowed.join(","));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error("SPATIAL_STRATEGY_TEST_FAILED", message);
  process.exit(1);
});
