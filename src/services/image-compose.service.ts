import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import sharp from "sharp";
import { BRAND } from "@/config/brand";

export type ComposeStandardPosterInput = {
  backgroundImagePath: string;
  outputPath: string;
  mainTitle: string;
  subtitle?: string;
  campusName: string;
  campusAddress?: string;
  campusPhone: string;
};

const COMPOSE_INPUT_INVALID = "COMPOSE_INPUT_INVALID";
const COMPOSE_ASSET_MISSING = "COMPOSE_ASSET_MISSING";
const COMPOSE_FAILED = "COMPOSE_FAILED";
const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1620;
const OUTPUT_QUALITY = 78;

type RenderTextLinesParams = {
  lines: string[];
  x: number;
  y: number;
  lineHeight: number;
  className: string;
};

export async function composeStandardPoster(
  input: ComposeStandardPosterInput,
): Promise<{ outputPath: string }> {
  const normalizedInput = normalizeInput(input);
  const backgroundPath = resolvePath(normalizedInput.backgroundImagePath);
  const outputPath = resolvePath(normalizedInput.outputPath);
  const logoPath = resolvePath(BRAND.logoPath);
  const mascotPath = resolvePath(BRAND.mascotPath);

  assertAssetExists(backgroundPath);
  assertAssetExists(logoPath);
  assertAssetExists(mascotPath);

  try {
    const logoBuffer = await sharp(readFileSync(logoPath))
      .resize({ width: BRAND.logoPosition.width })
      .png()
      .toBuffer();
    const mascotBuffer = await sharp(readFileSync(mascotPath))
      .resize({ width: BRAND.mascotPosition.width })
      .png()
      .toBuffer();

    await sharp(backgroundPath)
      .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: "cover" })
      .composite([
        {
          input: Buffer.from(buildTextOverlay(normalizedInput)),
          left: 0,
          top: 0,
        },
        {
          input: logoBuffer,
          left: BRAND.logoPosition.x,
          top: BRAND.logoPosition.y,
        },
        {
          input: mascotBuffer,
          left: BRAND.mascotPosition.x,
          top: BRAND.mascotPosition.y,
        },
      ])
      .jpeg({ quality: OUTPUT_QUALITY })
      .toFile(outputPath);

    return { outputPath };
  } catch {
    throw new Error(COMPOSE_FAILED);
  }
}

function normalizeInput(input: ComposeStandardPosterInput): ComposeStandardPosterInput {
  const backgroundImagePath = normalizeRequiredText(input.backgroundImagePath);
  const outputPath = normalizeRequiredText(input.outputPath);
  const mainTitle = normalizeRequiredText(input.mainTitle);
  const campusName = normalizeRequiredText(input.campusName);
  const campusPhone = normalizeRequiredText(input.campusPhone);
  const subtitle = normalizeOptionalText(input.subtitle);
  const campusAddress = normalizeOptionalText(input.campusAddress);

  return {
    backgroundImagePath,
    outputPath,
    mainTitle,
    ...(subtitle ? { subtitle } : {}),
    campusName,
    ...(campusAddress ? { campusAddress } : {}),
    campusPhone,
  };
}

function buildTextOverlay(input: ComposeStandardPosterInput): string {
  const mainTitleLines = splitTextByLength(input.mainTitle, 12);
  const subtitleLines = input.subtitle ? splitTextByLength(input.subtitle, 18) : [];
  const campusNameLines = splitTextByLength(input.campusName, 16);
  const addressLines = input.campusAddress
    ? splitTextByLength(input.campusAddress, 24)
    : [];
  const subtitleY = 174 + mainTitleLines.length * 72;
  const addressY = 1426 + campusNameLines.length * 42 + 14;
  const phoneY = addressLines.length > 0 ? addressY + addressLines.length * 34 + 10 : addressY;
  const subtitleText = subtitleLines.length > 0
    ? renderTextLines({
        lines: subtitleLines,
        x: 72,
        y: subtitleY,
        lineHeight: 42,
        className: "subtitle",
      })
    : "";
  const addressText = addressLines.length > 0
    ? renderTextLines({
        lines: addressLines,
        x: 72,
        y: addressY,
        lineHeight: 34,
        className: "info",
      })
    : "";

  return `
<svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" viewBox="0 0 ${OUTPUT_WIDTH} ${OUTPUT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .title { fill: ${BRAND.colors.deepBlue}; font-family: ${BRAND.fontFamily}; font-size: 68px; font-weight: 800; }
    .subtitle { fill: ${BRAND.colors.orange}; font-family: ${BRAND.fontFamily}; font-size: 34px; font-weight: 600; }
    .campus { fill: ${BRAND.colors.deepBlue}; font-family: ${BRAND.fontFamily}; font-size: 36px; font-weight: 700; }
    .info { fill: #334155; font-family: ${BRAND.fontFamily}; font-size: 26px; font-weight: 500; }
    .phone { fill: ${BRAND.colors.red}; font-family: ${BRAND.fontFamily}; font-size: 28px; font-weight: 700; }
  </style>
  <rect x="820" y="42" width="220" height="150" rx="24" fill="#FFFFFF" opacity="0.82"/>
  <rect x="48" y="84" width="760" height="196" rx="28" fill="#FFFFFF" opacity="0.78"/>
  <rect x="48" y="1360" width="984" height="184" rx="28" fill="#FFFFFF" opacity="0.86"/>
  <rect x="48" y="1360" width="10" height="184" rx="5" fill="${BRAND.colors.orange}"/>
  ${renderTextLines({
    lines: mainTitleLines,
    x: 72,
    y: 174,
    lineHeight: 72,
    className: "title",
  })}
  ${subtitleText}
  ${renderTextLines({
    lines: campusNameLines,
    x: 72,
    y: 1426,
    lineHeight: 42,
    className: "campus",
  })}
  ${addressText}
  <text x="72" y="${phoneY}" class="phone">${escapeXml(input.campusPhone)}</text>
</svg>`;
}

function splitTextByLength(text: string, maxLength: number): string[] {
  const characters = Array.from(text);
  const lines: string[] = [];

  for (let index = 0; index < characters.length; index += maxLength) {
    lines.push(characters.slice(index, index + maxLength).join(""));
  }

  return lines;
}

function renderTextLines(params: RenderTextLinesParams): string {
  return params.lines
    .map((line, index) => {
      const y = params.y + index * params.lineHeight;

      return `<text x="${params.x}" y="${y}" class="${params.className}">${escapeXml(line)}</text>`;
    })
    .join("\n  ");
}

function normalizeRequiredText(value: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(COMPOSE_INPUT_INVALID);
  }

  return normalizedValue;
}

function normalizeOptionalText(value?: string): string | undefined {
  return value?.trim() || undefined;
}

function assertAssetExists(path: string): void {
  if (!existsSync(path)) {
    throw new Error(COMPOSE_ASSET_MISSING);
  }
}

function resolvePath(path: string): string {
  return isAbsolute(path) ? path : join(process.cwd(), path);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
