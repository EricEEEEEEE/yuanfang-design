import { composeStandardPoster } from "../src/services/image-compose.service";
import {
  buildStandardPrompt,
  type StandardPromptInput,
} from "../src/services/template.service";

const BACKGROUND_IMAGE_PATH = "/tmp/yuanfang-standard-test-2.png";
const OUTPUT_PATH = "/tmp/yuanfang-composed-test.jpg";
const TEST_PROMPT_INPUT: StandardPromptInput = {
  theme: "classicalLiterature",
  style: "chinese",
  element: "classicalPoetry",
  designFamily: "modernChinese",
  productOutputType: "mainVisual",
  eventBrief: "四大名著少年国学活动",
  styleBrief: "现代国风、偏商务教育主视觉、红金青绿、不要低幼",
  visualDetails:
    "四大名著的古典文学气质，书页、卷轴、古典建筑、山水、月亮、章回小说感，允许少量剪影化主题符号",
  avoidNotes:
    "不要儿童课堂插画，不要拟人老师学生，不要低幼卡通，不要普通培训班广告感",
  visualBrief: "国学少年说、四大名著、少年国学、古典文学启蒙",
  mainTitle: "暑假文学表达体验课",
  subtitle: "让孩子在阅读中学会表达",
  campusName: "远方文学青山校区",
  campusAddress: "包头市青山区测试地址",
  campusPhone: "13800000000",
};

async function main(): Promise<void> {
  const promptResult = buildStandardPrompt(TEST_PROMPT_INPUT);
  const result = await composeStandardPoster({
    backgroundImagePath: BACKGROUND_IMAGE_PATH,
    outputPath: OUTPUT_PATH,
    ...promptResult.overlayData,
  });

  console.log({ ...result, templateMeta: promptResult.templateMeta });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error("COMPOSE_STANDARD_TEST_FAILED", message);
  process.exit(1);
});
