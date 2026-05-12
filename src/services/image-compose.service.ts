import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import sharp from "sharp";
import { BRAND } from "@/config/brand";
import type { StandardLayoutFamilyKey } from "@/config/layout-families";
import { TYPOGRAPHY, type TextStyleConfig } from "@/config/typography";

export type ComposeStandardPosterInput = {
  backgroundImagePath: string;
  outputPath: string;
  mainTitle: string;
  subtitle?: string;
  campusName: string;
  campusAddress?: string;
  campusPhone: string;
  layoutFamily?: StandardLayoutFamilyKey;
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
  letterSpacing: number;
  textAnchor?: "start" | "middle";
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
  const layoutFamily = getSupportedLayoutFamily(input.layoutFamily);

  return {
    backgroundImagePath,
    outputPath,
    mainTitle,
    ...(subtitle ? { subtitle } : {}),
    campusName,
    ...(campusAddress ? { campusAddress } : {}),
    campusPhone,
    layoutFamily,
  };
}

function buildTextOverlay(input: ComposeStandardPosterInput): string {
  if (input.layoutFamily === "centerTitle") {
    return buildCenterTitleTextOverlay(input);
  }

  return buildClassicTopTextOverlay(input);
}

function buildClassicTopTextOverlay(input: ComposeStandardPosterInput): string {
  const textStyles = [
    TYPOGRAPHY.title,
    TYPOGRAPHY.subtitle,
    TYPOGRAPHY.campus,
    TYPOGRAPHY.info,
    TYPOGRAPHY.phone,
  ];
  const mainTitleLines = splitTextByLength(
    input.mainTitle,
    TYPOGRAPHY.title.maxCharsPerLine,
  );
  const subtitleLines = input.subtitle
    ? splitTextByLength(input.subtitle, TYPOGRAPHY.subtitle.maxCharsPerLine)
    : [];
  const campusNameLines = splitTextByLength(
    input.campusName,
    TYPOGRAPHY.campus.maxCharsPerLine,
  );
  const addressLines = input.campusAddress
    ? splitTextByLength(input.campusAddress, TYPOGRAPHY.info.maxCharsPerLine)
    : [];
  const subtitleY = 174 + mainTitleLines.length * TYPOGRAPHY.title.lineHeight;
  const addressY = 1426 + campusNameLines.length * TYPOGRAPHY.campus.lineHeight + 14;
  const phoneY = addressLines.length > 0
    ? addressY + addressLines.length * TYPOGRAPHY.info.lineHeight + 10
    : addressY;
  const subtitleText = subtitleLines.length > 0
    ? renderTextLines({
        lines: subtitleLines,
        x: 72,
        y: subtitleY,
        lineHeight: TYPOGRAPHY.subtitle.lineHeight,
        className: "subtitle",
        letterSpacing: TYPOGRAPHY.subtitle.letterSpacing,
      })
    : "";
  const addressText = addressLines.length > 0
    ? renderTextLines({
        lines: addressLines,
        x: 72,
        y: addressY,
        lineHeight: TYPOGRAPHY.info.lineHeight,
        className: "info",
        letterSpacing: TYPOGRAPHY.info.letterSpacing,
      })
    : "";

  return `
<svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" viewBox="0 0 ${OUTPUT_WIDTH} ${OUTPUT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <style>
    ${buildFontFaceCss(textStyles)}
    ${renderTextStyle("title", TYPOGRAPHY.title)}
    ${renderTextStyle("subtitle", TYPOGRAPHY.subtitle)}
    ${renderTextStyle("campus", TYPOGRAPHY.campus)}
    ${renderTextStyle("info", TYPOGRAPHY.info)}
    ${renderTextStyle("phone", TYPOGRAPHY.phone)}
  </style>
  <rect x="48" y="84" width="760" height="196" rx="28" fill="#FFFFFF" opacity="0.78"/>
  <rect x="48" y="1360" width="984" height="184" rx="28" fill="#FFFFFF" opacity="0.86"/>
  <rect x="48" y="1360" width="10" height="184" rx="5" fill="${BRAND.colors.orange}"/>
  ${renderTextLines({
    lines: mainTitleLines,
    x: 72,
    y: 174,
    lineHeight: TYPOGRAPHY.title.lineHeight,
    className: "title",
    letterSpacing: TYPOGRAPHY.title.letterSpacing,
  })}
  ${subtitleText}
  ${renderTextLines({
    lines: campusNameLines,
    x: 72,
    y: 1426,
    lineHeight: TYPOGRAPHY.campus.lineHeight,
    className: "campus",
    letterSpacing: TYPOGRAPHY.campus.letterSpacing,
  })}
  ${addressText}
  <text x="72" y="${phoneY}" class="phone" letter-spacing="${TYPOGRAPHY.phone.letterSpacing}">${escapeXml(input.campusPhone)}</text>
</svg>`;
}

function buildCenterTitleTextOverlay(input: ComposeStandardPosterInput): string {
  const textStyles = [
    TYPOGRAPHY.title,
    TYPOGRAPHY.subtitle,
    TYPOGRAPHY.campus,
    TYPOGRAPHY.info,
    TYPOGRAPHY.phone,
  ];
  const mainTitleLines = splitTextByLength(
    input.mainTitle,
    TYPOGRAPHY.title.maxCharsPerLine,
  );
  const subtitleLines = input.subtitle
    ? splitTextByLength(input.subtitle, TYPOGRAPHY.subtitle.maxCharsPerLine)
    : [];
  const campusNameLines = splitTextByLength(
    input.campusName,
    TYPOGRAPHY.campus.maxCharsPerLine,
  );
  const addressLines = input.campusAddress
    ? splitTextByLength(input.campusAddress, TYPOGRAPHY.info.maxCharsPerLine)
    : [];
  const subtitleY = 250 + (mainTitleLines.length - 1) * TYPOGRAPHY.title.lineHeight;
  const titlePanelHeight = Math.max(
    210,
    96 +
      mainTitleLines.length * TYPOGRAPHY.title.lineHeight +
      subtitleLines.length * TYPOGRAPHY.subtitle.lineHeight,
  );
  const addressY = 1426 + campusNameLines.length * TYPOGRAPHY.campus.lineHeight + 14;
  const phoneY = addressLines.length > 0
    ? addressY + addressLines.length * TYPOGRAPHY.info.lineHeight + 10
    : addressY;
  const subtitleText = subtitleLines.length > 0
    ? renderTextLines({
        lines: subtitleLines,
        x: 540,
        y: subtitleY,
        lineHeight: TYPOGRAPHY.subtitle.lineHeight,
        className: "subtitle",
        letterSpacing: TYPOGRAPHY.subtitle.letterSpacing,
        textAnchor: "middle",
      })
    : "";
  const addressText = addressLines.length > 0
    ? renderTextLines({
        lines: addressLines,
        x: 72,
        y: addressY,
        lineHeight: TYPOGRAPHY.info.lineHeight,
        className: "info",
        letterSpacing: TYPOGRAPHY.info.letterSpacing,
      })
    : "";

  return `
<svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" viewBox="0 0 ${OUTPUT_WIDTH} ${OUTPUT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <style>
    ${buildFontFaceCss(textStyles)}
    ${renderTextStyle("title", TYPOGRAPHY.title)}
    ${renderTextStyle("subtitle", TYPOGRAPHY.subtitle)}
    ${renderTextStyle("campus", TYPOGRAPHY.campus)}
    ${renderTextStyle("info", TYPOGRAPHY.info)}
    ${renderTextStyle("phone", TYPOGRAPHY.phone)}
  </style>
  <rect x="120" y="110" width="840" height="${titlePanelHeight}" rx="30" fill="#FFFFFF" opacity="0.78"/>
  <rect x="48" y="1360" width="984" height="184" rx="28" fill="#FFFFFF" opacity="0.86"/>
  <rect x="48" y="1360" width="10" height="184" rx="5" fill="${BRAND.colors.orange}"/>
  ${renderTextLines({
    lines: mainTitleLines,
    x: 540,
    y: 195,
    lineHeight: TYPOGRAPHY.title.lineHeight,
    className: "title",
    letterSpacing: TYPOGRAPHY.title.letterSpacing,
    textAnchor: "middle",
  })}
  ${subtitleText}
  ${renderTextLines({
    lines: campusNameLines,
    x: 72,
    y: 1426,
    lineHeight: TYPOGRAPHY.campus.lineHeight,
    className: "campus",
    letterSpacing: TYPOGRAPHY.campus.letterSpacing,
  })}
  ${addressText}
  <text x="72" y="${phoneY}" class="phone" letter-spacing="${TYPOGRAPHY.phone.letterSpacing}">${escapeXml(input.campusPhone)}</text>
</svg>`;
}

function buildFontFaceCss(styles: TextStyleConfig[]): string {
  const seenFontPaths = new Set<string>();

  return styles
    .map((style) => {
      if (!style.fontFilePath || seenFontPaths.has(style.fontFilePath)) {
        return "";
      }

      seenFontPaths.add(style.fontFilePath);

      const fontPath = resolvePath(style.fontFilePath);

      if (!existsSync(fontPath)) {
        return "";
      }

      try {
        const fontBase64 = readFileSync(fontPath).toString("base64");
        const fontFamily = style.fontFamily.split(",")[0].trim();
        const fontFormat = getFontFormat(fontPath);

        return `@font-face { font-family: "${fontFamily}"; src: url("data:font/ttf;base64,${fontBase64}") format("${fontFormat}"); }`;
      } catch {
        return "";
      }
    })
    .filter(Boolean)
    .join("\n    ");
}

function getFontFormat(filePath: string): string {
  const lowerCasePath = filePath.toLowerCase();

  if (lowerCasePath.endsWith(".woff2")) {
    return "woff2";
  }

  if (lowerCasePath.endsWith(".woff")) {
    return "woff";
  }

  if (lowerCasePath.endsWith(".otf")) {
    return "opentype";
  }

  if (lowerCasePath.endsWith(".ttf")) {
    return "truetype";
  }

  return "truetype";
}

function renderTextStyle(className: string, style: TextStyleConfig): string {
  return `.${className} { fill: ${style.fill}; font-family: ${style.fontFamily}; font-size: ${style.fontSize}px; font-weight: ${style.fontWeight}; letter-spacing: ${style.letterSpacing}px; }`;
}

function splitTextByLength(text: string, maxLength: number): string[] {
  const characters = Array.from(text);
  const lines: string[] = [];

  for (let index = 0; index < characters.length; index += maxLength) {
    lines.push(characters.slice(index, index + maxLength).join(""));
  }

  return lines;
}

function getSupportedLayoutFamily(
  layoutFamily?: StandardLayoutFamilyKey,
): "classicTop" | "centerTitle" {
  return layoutFamily === "centerTitle" ? "centerTitle" : "classicTop";
}

function renderTextLines(params: RenderTextLinesParams): string {
  return params.lines
    .map((line, index) => {
      const y = params.y + index * params.lineHeight;
      const textAnchor = params.textAnchor
        ? ` text-anchor="${params.textAnchor}"`
        : "";

      return `<text x="${params.x}" y="${y}" class="${params.className}" letter-spacing="${params.letterSpacing}"${textAnchor}>${escapeXml(line)}</text>`;
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
