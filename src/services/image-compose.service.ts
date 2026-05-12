import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import sharp from "sharp";
import { BRAND } from "@/config/brand";
import {
  STANDARD_DISPLAY_POLICIES,
  type StandardCampusInfoMode,
  type StandardDisplayPolicy,
  type StandardTitleTreatmentKey,
} from "@/config/display-policies";
import { STANDARD_FONT_LIBRARY } from "@/config/font-library";
import type { StandardLayoutFamilyKey } from "@/config/layout-families";
import {
  STANDARD_TITLE_ART_STYLES,
  type StandardTitleArtStyle,
  type StandardTitleArtStyleKey,
} from "@/config/title-art-styles";
import { TYPOGRAPHY, type TextStyleConfig } from "@/config/typography";

export type ComposeStandardPosterInput = {
  backgroundImagePath: string;
  outputPath: string;
  mainTitle: string;
  subtitle?: string;
  campusName?: string;
  campusAddress?: string;
  campusPhone?: string;
  layoutFamily?: StandardLayoutFamilyKey;
  displayPolicy?: string;
  showMascot?: boolean;
  titleArtStyle?: StandardTitleArtStyleKey;
};

const COMPOSE_INPUT_INVALID = "COMPOSE_INPUT_INVALID";
const COMPOSE_ASSET_MISSING = "COMPOSE_ASSET_MISSING";
const COMPOSE_FAILED = "COMPOSE_FAILED";
const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1620;
const OUTPUT_QUALITY = 78;
const CENTER_TITLE_LOGO_POSITION = { x: 858, y: 48, width: 150 };
const SIDE_TITLE_LOGO_POSITION = { x: 820, y: 60, width: 170 };
const DEFAULT_DISPLAY_POLICY = "titleOnlyDefault";
const DEFAULT_TITLE_ART_STYLE = "cleanBrand";

type LogoPosition = {
  x: number;
  y: number;
  width: number;
};

type ResolvedDisplayPolicy = {
  key: string;
  policy: StandardDisplayPolicy;
};

type RenderTextLinesParams = {
  lines: string[];
  x: number;
  y: number;
  lineHeight: number;
  className: string;
  letterSpacing: number;
  textAnchor?: "start" | "middle";
};

type TitleBackgroundParams = {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  titleTreatment: StandardTitleTreatmentKey;
  glassOpacity: number;
};

type TextStyleWithEffects = TextStyleConfig &
  Pick<StandardTitleArtStyle, "stroke" | "shadow" | "glow">;

type TitleArtTextStyles = {
  title: TextStyleWithEffects;
  subtitle: TextStyleWithEffects;
};

export async function composeStandardPoster(
  input: ComposeStandardPosterInput,
): Promise<{ outputPath: string }> {
  const normalizedInput = normalizeInput(input);
  const backgroundPath = resolvePath(normalizedInput.backgroundImagePath);
  const outputPath = resolvePath(normalizedInput.outputPath);
  const logoPath = resolvePath(BRAND.logoPath);
  const mascotPath = normalizedInput.showMascot
    ? resolvePath(BRAND.mascotPath)
    : undefined;

  assertAssetExists(backgroundPath);
  assertAssetExists(logoPath);

  if (mascotPath) {
    assertAssetExists(mascotPath);
  }

  try {
    const logoPosition = getLogoPosition(normalizedInput.layoutFamily);
    const logoBuffer = await sharp(readFileSync(logoPath))
      .resize({ width: logoPosition.width })
      .png()
      .toBuffer();
    const compositeInputs = [
      {
        input: Buffer.from(buildTextOverlay(normalizedInput)),
        left: 0,
        top: 0,
      },
      {
        input: logoBuffer,
        left: logoPosition.x,
        top: logoPosition.y,
      },
    ];

    if (mascotPath) {
      const mascotBuffer = await sharp(readFileSync(mascotPath))
        .resize({ width: BRAND.mascotPosition.width })
        .png()
        .toBuffer();

      compositeInputs.push({
        input: mascotBuffer,
        left: BRAND.mascotPosition.x,
        top: BRAND.mascotPosition.y,
      });
    }

    await sharp(backgroundPath)
      .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: "cover" })
      .composite(compositeInputs)
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
  const subtitle = normalizeOptionalText(input.subtitle);
  const campusName = normalizeOptionalText(input.campusName);
  const campusAddress = normalizeOptionalText(input.campusAddress);
  const campusPhone = normalizeOptionalText(input.campusPhone);
  const layoutFamily = getSupportedLayoutFamily(input.layoutFamily);
  const displayPolicy = getDisplayPolicy(input.displayPolicy).key;
  const showMascot = input.showMascot === true;
  const titleArtStyle = getSupportedTitleArtStyle(input.titleArtStyle);

  return {
    backgroundImagePath,
    outputPath,
    mainTitle,
    ...(subtitle ? { subtitle } : {}),
    ...(campusName ? { campusName } : {}),
    ...(campusAddress ? { campusAddress } : {}),
    ...(campusPhone ? { campusPhone } : {}),
    layoutFamily,
    displayPolicy,
    showMascot,
    titleArtStyle,
  };
}

function buildTextOverlay(input: ComposeStandardPosterInput): string {
  if (input.layoutFamily === "centerTitle") {
    return buildCenterTitleTextOverlay(input);
  }

  if (input.layoutFamily === "sideTitle") {
    return buildSideTitleTextOverlay(input);
  }

  return buildClassicTopTextOverlay(input);
}

function buildClassicTopTextOverlay(input: ComposeStandardPosterInput): string {
  const titleArtTextStyles = buildTitleArtTextStyles(input.titleArtStyle);
  const textStyles = [
    titleArtTextStyles.title,
    titleArtTextStyles.subtitle,
    TYPOGRAPHY.campus,
    TYPOGRAPHY.info,
    TYPOGRAPHY.phone,
  ];
  const { policy } = getDisplayPolicy(input.displayPolicy);
  const mainTitleLines = splitTextByLength(
    input.mainTitle,
    titleArtTextStyles.title.maxCharsPerLine,
  );
  const subtitleLines = input.subtitle
    ? splitTextByLength(input.subtitle, titleArtTextStyles.subtitle.maxCharsPerLine)
    : [];
  const subtitleY = 174 + mainTitleLines.length * titleArtTextStyles.title.lineHeight;
  const subtitleText = subtitleLines.length > 0
    ? renderTitleArtTextLines({
        lines: subtitleLines,
        x: 72,
        y: subtitleY,
        lineHeight: titleArtTextStyles.subtitle.lineHeight,
        className: "subtitle",
        letterSpacing: titleArtTextStyles.subtitle.letterSpacing,
      })
    : "";
  const campusInfoOverlay = buildCampusInfoOverlay(input, policy.campusInfoMode);
  const titleBackground = buildTitleBackground({
    x: 48,
    y: 84,
    width: 760,
    height: 196,
    rx: 28,
    titleTreatment: policy.titleTreatment,
    glassOpacity: 0.78,
  });

  return `
<svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" viewBox="0 0 ${OUTPUT_WIDTH} ${OUTPUT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <style>
    ${buildFontFaceCss(textStyles)}
    ${renderTitleEffectTextStyle("title-effect", titleArtTextStyles.title)}
    ${renderTitleFillTextStyle("title-fill", titleArtTextStyles.title)}
    ${renderTitleEffectTextStyle("subtitle-effect", titleArtTextStyles.subtitle)}
    ${renderTitleFillTextStyle("subtitle-fill", titleArtTextStyles.subtitle)}
    ${renderTextStyle("campus", TYPOGRAPHY.campus)}
    ${renderTextStyle("info", TYPOGRAPHY.info)}
    ${renderTextStyle("phone", TYPOGRAPHY.phone)}
  </style>
  ${titleBackground}
  ${campusInfoOverlay}
  ${renderTitleArtTextLines({
    lines: mainTitleLines,
    x: 72,
    y: 174,
    lineHeight: titleArtTextStyles.title.lineHeight,
    className: "title",
    letterSpacing: titleArtTextStyles.title.letterSpacing,
  })}
  ${subtitleText}
</svg>`;
}

function buildCenterTitleTextOverlay(input: ComposeStandardPosterInput): string {
  const titleArtTextStyles = buildTitleArtTextStyles(input.titleArtStyle);
  const textStyles = [
    titleArtTextStyles.title,
    titleArtTextStyles.subtitle,
    TYPOGRAPHY.campus,
    TYPOGRAPHY.info,
    TYPOGRAPHY.phone,
  ];
  const { policy } = getDisplayPolicy(input.displayPolicy);
  const mainTitleLines = splitTextByLength(
    input.mainTitle,
    titleArtTextStyles.title.maxCharsPerLine,
  );
  const subtitleLines = input.subtitle
    ? splitTextByLength(input.subtitle, titleArtTextStyles.subtitle.maxCharsPerLine)
    : [];
  const subtitleY = 250 + (mainTitleLines.length - 1) * titleArtTextStyles.title.lineHeight;
  const titlePanelHeight = Math.max(
    210,
    96 +
      mainTitleLines.length * titleArtTextStyles.title.lineHeight +
      subtitleLines.length * titleArtTextStyles.subtitle.lineHeight,
  );
  const subtitleText = subtitleLines.length > 0
    ? renderTitleArtTextLines({
        lines: subtitleLines,
        x: 540,
        y: subtitleY,
        lineHeight: titleArtTextStyles.subtitle.lineHeight,
        className: "subtitle",
        letterSpacing: titleArtTextStyles.subtitle.letterSpacing,
        textAnchor: "middle",
      })
    : "";
  const campusInfoOverlay = buildCampusInfoOverlay(input, policy.campusInfoMode);
  const titleBackground = buildTitleBackground({
    x: 120,
    y: 110,
    width: 840,
    height: titlePanelHeight,
    rx: 30,
    titleTreatment: policy.titleTreatment,
    glassOpacity: 0.78,
  });

  return `
<svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" viewBox="0 0 ${OUTPUT_WIDTH} ${OUTPUT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <style>
    ${buildFontFaceCss(textStyles)}
    ${renderTitleEffectTextStyle("title-effect", titleArtTextStyles.title)}
    ${renderTitleFillTextStyle("title-fill", titleArtTextStyles.title)}
    ${renderTitleEffectTextStyle("subtitle-effect", titleArtTextStyles.subtitle)}
    ${renderTitleFillTextStyle("subtitle-fill", titleArtTextStyles.subtitle)}
    ${renderTextStyle("campus", TYPOGRAPHY.campus)}
    ${renderTextStyle("info", TYPOGRAPHY.info)}
    ${renderTextStyle("phone", TYPOGRAPHY.phone)}
  </style>
  ${titleBackground}
  ${campusInfoOverlay}
  ${renderTitleArtTextLines({
    lines: mainTitleLines,
    x: 540,
    y: 195,
    lineHeight: titleArtTextStyles.title.lineHeight,
    className: "title",
    letterSpacing: titleArtTextStyles.title.letterSpacing,
    textAnchor: "middle",
  })}
  ${subtitleText}
</svg>`;
}

function buildSideTitleTextOverlay(input: ComposeStandardPosterInput): string {
  const titleArtTextStyles = buildTitleArtTextStyles(input.titleArtStyle);
  const textStyles = [
    titleArtTextStyles.title,
    titleArtTextStyles.subtitle,
    TYPOGRAPHY.campus,
    TYPOGRAPHY.info,
    TYPOGRAPHY.phone,
  ];
  const { policy } = getDisplayPolicy(input.displayPolicy);
  const mainTitleLines = splitTextByLength(input.mainTitle, 6);
  const subtitleLines = input.subtitle
    ? splitTextByLength(input.subtitle, 10)
    : [];
  const subtitleY = 240 + mainTitleLines.length * titleArtTextStyles.title.lineHeight + 24;
  const titlePanelHeight = Math.max(
    360,
    164 +
      mainTitleLines.length * titleArtTextStyles.title.lineHeight +
      subtitleLines.length * titleArtTextStyles.subtitle.lineHeight,
  );
  const subtitleText = subtitleLines.length > 0
    ? renderTitleArtTextLines({
        lines: subtitleLines,
        x: 90,
        y: subtitleY,
        lineHeight: titleArtTextStyles.subtitle.lineHeight,
        className: "subtitle",
        letterSpacing: titleArtTextStyles.subtitle.letterSpacing,
      })
    : "";
  const campusInfoOverlay = buildCampusInfoOverlay(input, policy.campusInfoMode);
  const titleBackground = buildTitleBackground({
    x: 54,
    y: 150,
    width: 420,
    height: titlePanelHeight,
    rx: 30,
    titleTreatment: policy.titleTreatment,
    glassOpacity: 0.80,
  });

  return `
<svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" viewBox="0 0 ${OUTPUT_WIDTH} ${OUTPUT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <style>
    ${buildFontFaceCss(textStyles)}
    ${renderTitleEffectTextStyle("title-effect", titleArtTextStyles.title)}
    ${renderTitleFillTextStyle("title-fill", titleArtTextStyles.title)}
    ${renderTitleEffectTextStyle("subtitle-effect", titleArtTextStyles.subtitle)}
    ${renderTitleFillTextStyle("subtitle-fill", titleArtTextStyles.subtitle)}
    ${renderTextStyle("campus", TYPOGRAPHY.campus)}
    ${renderTextStyle("info", TYPOGRAPHY.info)}
    ${renderTextStyle("phone", TYPOGRAPHY.phone)}
  </style>
  ${titleBackground}
  ${campusInfoOverlay}
  ${renderTitleArtTextLines({
    lines: mainTitleLines,
    x: 90,
    y: 240,
    lineHeight: titleArtTextStyles.title.lineHeight,
    className: "title",
    letterSpacing: titleArtTextStyles.title.letterSpacing,
  })}
  ${subtitleText}
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

function buildTitleArtTextStyles(
  titleArtStyle?: StandardTitleArtStyleKey,
): TitleArtTextStyles {
  const style = STANDARD_TITLE_ART_STYLES[getSupportedTitleArtStyle(titleArtStyle)];
  const fontFilePath = getFontFilePath(style.fontKey);
  const fontFamily =
    "YuanFangTitleArt, PingFang SC, Microsoft YaHei, Noto Sans CJK SC, sans-serif";

  return {
    title: {
      ...TYPOGRAPHY.title,
      fontFamily,
      fontFilePath,
      fill: style.titleFill,
      letterSpacing: style.letterSpacing,
      stroke: style.stroke,
      shadow: style.shadow,
      glow: style.glow,
    },
    subtitle: {
      ...TYPOGRAPHY.subtitle,
      fontFamily,
      fontFilePath,
      fill: style.subtitleFill,
      letterSpacing: style.letterSpacing,
      stroke: style.stroke,
      shadow: style.shadow,
      glow: style.glow,
    },
  };
}

function renderTitleEffectTextStyle(
  className: string,
  style: TextStyleWithEffects,
): string {
  const strokeCss = style.stroke
    ? ` stroke: ${style.stroke.color}; stroke-width: ${style.stroke.width}px; paint-order: stroke fill;`
    : "";
  const filterCss = renderTextFilter(style);

  return `.${className} { fill: ${style.fill}; font-family: ${style.fontFamily}; font-size: ${style.fontSize}px; font-weight: ${style.fontWeight}; letter-spacing: ${style.letterSpacing}px;${strokeCss}${filterCss} }`;
}

function renderTitleFillTextStyle(
  className: string,
  style: TextStyleWithEffects,
): string {
  return `.${className} { fill: ${style.fill}; font-family: ${style.fontFamily}; font-size: ${style.fontSize}px; font-weight: ${style.fontWeight}; letter-spacing: ${style.letterSpacing}px; }`;
}

function renderTextStyle(className: string, style: TextStyleConfig): string {
  return `.${className} { fill: ${style.fill}; font-family: ${style.fontFamily}; font-size: ${style.fontSize}px; font-weight: ${style.fontWeight}; letter-spacing: ${style.letterSpacing}px; }`;
}

function renderTextFilter(style: TextStyleWithEffects): string {
  const filters: string[] = [];

  if (style.shadow) {
    filters.push(
      `drop-shadow(${style.shadow.dx}px ${style.shadow.dy}px ${style.shadow.blur}px ${withOpacity(style.shadow.color, style.shadow.opacity)})`,
    );
  }

  if (style.glow) {
    filters.push(
      `drop-shadow(0 0 ${style.glow.blur}px ${withOpacity(style.glow.color, style.glow.opacity)})`,
    );
  }

  return filters.length > 0 ? ` filter: ${filters.join(" ")};` : "";
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
): "classicTop" | "centerTitle" | "sideTitle" {
  if (layoutFamily === "centerTitle" || layoutFamily === "sideTitle") {
    return layoutFamily;
  }

  return "classicTop";
}

function getLogoPosition(layoutFamily?: StandardLayoutFamilyKey): LogoPosition {
  if (layoutFamily === "centerTitle") {
    return CENTER_TITLE_LOGO_POSITION;
  }

  if (layoutFamily === "sideTitle") {
    return SIDE_TITLE_LOGO_POSITION;
  }

  return BRAND.logoPosition;
}

function getDisplayPolicy(displayPolicy?: string): ResolvedDisplayPolicy {
  const key = displayPolicy && STANDARD_DISPLAY_POLICIES[displayPolicy]
    ? displayPolicy
    : DEFAULT_DISPLAY_POLICY;

  return { key, policy: STANDARD_DISPLAY_POLICIES[key] };
}

function getSupportedTitleArtStyle(
  titleArtStyle?: StandardTitleArtStyleKey,
): StandardTitleArtStyleKey {
  if (titleArtStyle && STANDARD_TITLE_ART_STYLES[titleArtStyle]) {
    return titleArtStyle;
  }

  return DEFAULT_TITLE_ART_STYLE;
}

function getFontFilePath(fontKey: string): string {
  const font =
    STANDARD_FONT_LIBRARY[fontKey as keyof typeof STANDARD_FONT_LIBRARY] ??
    STANDARD_FONT_LIBRARY.sourceHanSansBold;

  return font.filePath;
}

function buildTitleBackground(params: TitleBackgroundParams): string {
  const titleTreatment = getSupportedTitleTreatment(params.titleTreatment);

  if (titleTreatment === "noPanel" || titleTreatment === "editorialText") {
    return "";
  }

  const opacity = titleTreatment === "glassCard" ? params.glassOpacity : 0.24;

  return `<rect x="${params.x}" y="${params.y}" width="${params.width}" height="${params.height}" rx="${params.rx}" fill="#FFFFFF" opacity="${opacity}"/>`;
}

function getSupportedTitleTreatment(
  titleTreatment: StandardTitleTreatmentKey,
): StandardTitleTreatmentKey {
  if (titleTreatment === "colorBlock") {
    return "softGlow";
  }

  return titleTreatment;
}

function buildCampusInfoOverlay(
  input: ComposeStandardPosterInput,
  campusInfoMode: StandardCampusInfoMode,
): string {
  if (campusInfoMode === "hidden") {
    return "";
  }

  if (campusInfoMode === "compact") {
    return buildCompactCampusInfoOverlay(input);
  }

  return buildFullCampusInfoOverlay(input);
}

function buildCompactCampusInfoOverlay(input: ComposeStandardPosterInput): string {
  if (!input.campusName) {
    return "";
  }

  const campusNameLines = splitTextByLength(
    input.campusName,
    TYPOGRAPHY.campus.maxCharsPerLine,
  );
  const panelHeight = Math.max(
    82,
    34 + campusNameLines.length * TYPOGRAPHY.campus.lineHeight,
  );

  return `
  <rect x="48" y="1444" width="640" height="${panelHeight}" rx="24" fill="#FFFFFF" opacity="0.72"/>
  <rect x="48" y="1444" width="8" height="${panelHeight}" rx="4" fill="${BRAND.colors.orange}"/>
  ${renderTextLines({
    lines: campusNameLines,
    x: 72,
    y: 1498,
    lineHeight: TYPOGRAPHY.campus.lineHeight,
    className: "campus",
    letterSpacing: TYPOGRAPHY.campus.letterSpacing,
  })}`;
}

function buildFullCampusInfoOverlay(input: ComposeStandardPosterInput): string {
  const campusNameLines = input.campusName
    ? splitTextByLength(input.campusName, TYPOGRAPHY.campus.maxCharsPerLine)
    : [];
  const addressLines = input.campusAddress
    ? splitTextByLength(input.campusAddress, TYPOGRAPHY.info.maxCharsPerLine)
    : [];
  let currentY = 1426;
  const parts = [
    `<rect x="48" y="1360" width="984" height="184" rx="28" fill="#FFFFFF" opacity="0.86"/>`,
    `<rect x="48" y="1360" width="10" height="184" rx="5" fill="${BRAND.colors.orange}"/>`,
  ];

  if (campusNameLines.length > 0) {
    parts.push(renderTextLines({
      lines: campusNameLines,
      x: 72,
      y: currentY,
      lineHeight: TYPOGRAPHY.campus.lineHeight,
      className: "campus",
      letterSpacing: TYPOGRAPHY.campus.letterSpacing,
    }));
    currentY += campusNameLines.length * TYPOGRAPHY.campus.lineHeight + 14;
  }

  if (addressLines.length > 0) {
    parts.push(renderTextLines({
      lines: addressLines,
      x: 72,
      y: currentY,
      lineHeight: TYPOGRAPHY.info.lineHeight,
      className: "info",
      letterSpacing: TYPOGRAPHY.info.letterSpacing,
    }));
    currentY += addressLines.length * TYPOGRAPHY.info.lineHeight + 10;
  }

  if (input.campusPhone) {
    parts.push(
      `<text x="72" y="${currentY}" class="phone" letter-spacing="${TYPOGRAPHY.phone.letterSpacing}">${escapeXml(input.campusPhone)}</text>`,
    );
  }

  return parts.join("\n  ");
}

function renderTitleArtTextLines(params: RenderTextLinesParams): string {
  return [
    renderTextLines({ ...params, className: `${params.className}-effect` }),
    renderTextLines({ ...params, className: `${params.className}-fill` }),
  ].join("\n  ");
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

function withOpacity(color: string, opacity: number): string {
  const rgb = parseHexColor(color);

  if (!rgb) {
    return color;
  }

  return `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${opacity})`;
}

function parseHexColor(
  color: string,
): { red: number; green: number; blue: number } | undefined {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    return undefined;
  }

  return {
    red: Number.parseInt(color.slice(1, 3), 16),
    green: Number.parseInt(color.slice(3, 5), 16),
    blue: Number.parseInt(color.slice(5, 7), 16),
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
