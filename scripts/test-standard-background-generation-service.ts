import { execFileSync } from "node:child_process";
import { BRAND } from "../src/config/brand";
import type { StandardImagePromptContext } from "../src/models/standard-background-generation";
import { generateStandardBackground } from "../src/services/standard-background-generation.service";

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

async function main() {
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "";
  const noKey = await generateStandardBackground(input());
  console.log("STANDARD_BACKGROUND_GENERATION_NO_KEY_OK", noKey.ok ? "YES" : "NO");
  console.log("STANDARD_BACKGROUND_GENERATION_NO_KEY_ERROR_CODE", noKey.error?.code ?? "none");
  console.log("STANDARD_BACKGROUND_GENERATION_NO_KEY_ASSET", noKey.backgroundAsset ? "YES" : "NO");

  if (originalKey) process.env.OPENAI_API_KEY = originalKey;
  const live = originalKey ? await generateStandardBackground(input()) : undefined;
  const asset = live?.backgroundAsset;
  console.log("STANDARD_BACKGROUND_GENERATION_SOURCE", live?.source ?? "not_run");
  console.log("STANDARD_BACKGROUND_GENERATION_OK", live?.ok ? "PASS" : "FAIL");
  console.log("STANDARD_BACKGROUND_GENERATION_ASSET_READY", asset?.input?.byteLength ? "YES" : "NO");
  console.log("STANDARD_BACKGROUND_GENERATION_ASSET_SOURCE", asset?.source ?? "none");
  console.log("STANDARD_BACKGROUND_GENERATION_MIME", asset?.mimeType ?? "none");
  console.log("STANDARD_BACKGROUND_GENERATION_WIDTH", asset?.width ?? 0);
  console.log("STANDARD_BACKGROUND_GENERATION_HEIGHT", asset?.height ?? 0);
  console.log("STANDARD_BACKGROUND_GENERATION_BYTES", asset?.byteLength ?? 0);
  console.log("STANDARD_BACKGROUND_GENERATION_SHA256", asset?.sha256 ?? "none");
  console.log("STANDARD_BACKGROUND_GENERATION_MODEL_USED", asset?.modelUsed ?? "none");
  console.log("STANDARD_BACKGROUND_GENERATION_PROMPT_HASH", asset?.promptHash ?? "none");
  console.log("STANDARD_BACKGROUND_GENERATION_ORIGINAL_DIMENSIONS", JSON.stringify(live?.diagnostics?.originalDimensions ?? {}));
  console.log("STANDARD_BACKGROUND_GENERATION_NORMALIZED_DIMENSIONS", JSON.stringify(live?.diagnostics?.normalizedDimensions ?? {}));
  console.log("STANDARD_BACKGROUND_GENERATION_WARNINGS", JSON.stringify(live?.warnings ?? []));
  console.log("STANDARD_BACKGROUND_GENERATION_ERROR_CODE", live?.error?.code ?? "none");
  console.log("GIT_STATUS_SHORT", JSON.stringify(gitStatus()));

  if (
    noKey.ok ||
    noKey.error?.code !== "openai_api_key_missing" ||
    Boolean(noKey.backgroundAsset) ||
    (originalKey && !validLive(live))
  ) {
    process.exitCode = 1;
  }
}

function input() {
  return {
    mode: "generated",
    promptContext: context(),
    failClosed: true,
  } as const;
}

function context(): StandardImagePromptContext {
  return {
    source: "standard-form-v2",
    brandKey: "yuanfangDefault",
    canvas: CANVAS,
    form: {
      productOutputType: "enrollment",
      eventBrief: "孩子可以通过假期免费上 4 节课，感受四大名著内容，让孩子爱上名著、爱上文学、爱上语文。",
      styleBrief: "能够让家长感受到四大名著的那种感觉，并且一眼能看出来。不要和传统四大名著感觉一样，要有高级感。",
      visualDetails: "希望图片里出现四大名著的代表书籍、文学氛围、国风质感，同时表现出孩子渴望阅读四大名著的感觉。",
      titleBrief: "希望突出四大名著四个字，让家长知道我们通过四大名著课程招收孩子。",
      avoidNotes: "不要出现真实儿童照片，不要有压抑的颜色，不要有日本动漫的感觉，不要廉价广告风。",
    },
    title: { mainTitle: "暑期体验课", subtitle: "四大名著体验营" },
    visualHook: {
      primaryHook: "四大名著",
      source: "manual",
      possibleMismatch: true,
      mismatchReason: "用户描述中“四大名著”多次出现，但 mainTitle 是“暑期体验课”。",
    },
    brand: BASE_BRAND,
    constraints: BASE_CONSTRAINTS,
    avoidNotes: "不要出现真实儿童照片，不要有压抑的颜色，不要有日本动漫的感觉，不要廉价广告风。",
    outputIntent: { backgroundOnly: true, finalPoster: false },
  };
}

function validLive(result: Awaited<ReturnType<typeof generateStandardBackground>> | undefined): boolean {
  const asset = result?.backgroundAsset;
  return Boolean(
    result?.ok &&
    asset?.source === "generatedBackground" &&
    asset.input.byteLength > 0 &&
    asset.byteLength &&
    asset.sha256 &&
    asset.modelUsed &&
    asset.promptHash &&
    asset.mimeType === "image/jpeg" &&
    asset.width === CANVAS.width &&
    asset.height === CANVAS.height &&
    result.diagnostics?.originalDimensions &&
    result.diagnostics.normalizedDimensions?.width === CANVAS.width &&
    result.diagnostics.normalizedDimensions.height === CANVAS.height,
  );
}

function gitStatus(): string {
  return execFileSync("git", ["status", "--short"], { encoding: "utf8" }).trim();
}

main();
