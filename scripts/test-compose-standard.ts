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
