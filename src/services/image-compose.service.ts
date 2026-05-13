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
  TITLE_DIRECTOR_PRESETS,
  type TitleDirectorDecision,
  type TitleLineBreakMode,
  type TitleOrientation,
  type TitlePlacementKey,
  type TitleScaleLevel,
} from "@/config/title-director";
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
  titleDirectorPreset?: string;
  titleDirectorDecision?: TitleDirectorDecision;
  designFamily?: string;
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
  textAnchor?: "start" | "middle" | "end";
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

type TitlePlacementConfig = {
  x: number;
  y: number;
  textAnchor?: "start" | "middle" | "end";
  box?: ResolvedTitleBox;
};

type ResolvedTitleLayout = {
  placement: TitlePlacementConfig;
  orientation: TitleOrientation;
  rotation?: number;
  rotationCenter: {
    x: number;
    y: number;
  };
};

type ResolvedTitleBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TitleRenderState = {
  layout: ResolvedTitleLayout;
  mainTitleLines: string[];
  subtitleLines: string[];
  titleLineHeight: number;
  subtitleX: number;
  subtitleY: number;
  subtitleTextAnchor?: "start" | "middle" | "end";
};

type DirectedTitleTextParams = {
  state: TitleRenderState;
  titleStyle: TextStyleWithEffects;
  subtitleStyle: TextStyleWithEffects;
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
  const titleDirectorPreset = normalizeOptionalText(input.titleDirectorPreset);
  const designFamily = normalizeOptionalText(input.designFamily);

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
    ...(input.titleDirectorDecision ? { titleDirectorDecision: input.titleDirectorDecision } : {}),
    ...(titleDirectorPreset ? { titleDirectorPreset } : {}),
    ...(designFamily ? { designFamily } : {}),
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
  const titleDirectorDecision = getTitleDirectorDecision(input);
  const titleArtTextStyles = buildTitleArtTextStyles(
    titleDirectorDecision.titleArtStyle,
    titleDirectorDecision.fontKey,
    titleDirectorDecision,
  );
  const titleRenderState = buildTitleRenderState(
    input,
    titleDirectorDecision,
    titleArtTextStyles,
    "topLeft",
    0,
  );
  const textStyles = [
    titleArtTextStyles.title,
    titleArtTextStyles.subtitle,
    TYPOGRAPHY.campus,
    TYPOGRAPHY.info,
    TYPOGRAPHY.phone,
  ];
  const { policy } = getDisplayPolicy(input.displayPolicy);
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
  ${renderDirectedTitleTextLines({
    state: titleRenderState,
    titleStyle: titleArtTextStyles.title,
    subtitleStyle: titleArtTextStyles.subtitle,
  })}
</svg>`;
}

function buildCenterTitleTextOverlay(input: ComposeStandardPosterInput): string {
  const titleDirectorDecision = getTitleDirectorDecision(input);
  const titleArtTextStyles = buildTitleArtTextStyles(
    titleDirectorDecision.titleArtStyle,
    titleDirectorDecision.fontKey,
    titleDirectorDecision,
  );
  const titleRenderState = buildTitleRenderState(
    input,
    titleDirectorDecision,
    titleArtTextStyles,
    "topCenter",
    -28,
  );
  const textStyles = [
    titleArtTextStyles.title,
    titleArtTextStyles.subtitle,
    TYPOGRAPHY.campus,
    TYPOGRAPHY.info,
    TYPOGRAPHY.phone,
  ];
  const { policy } = getDisplayPolicy(input.displayPolicy);
  const titlePanelHeight = Math.max(
    210,
    96 +
      titleRenderState.mainTitleLines.length * titleRenderState.titleLineHeight +
      titleRenderState.subtitleLines.length * titleArtTextStyles.subtitle.lineHeight,
  );
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
  ${renderDirectedTitleTextLines({
    state: titleRenderState,
    titleStyle: titleArtTextStyles.title,
    subtitleStyle: titleArtTextStyles.subtitle,
  })}
</svg>`;
}

function buildSideTitleTextOverlay(input: ComposeStandardPosterInput): string {
  const titleDirectorDecision = getTitleDirectorDecision(input);
  const titleArtTextStyles = buildTitleArtTextStyles(
    titleDirectorDecision.titleArtStyle,
    titleDirectorDecision.fontKey,
    titleDirectorDecision,
  );
  const titleRenderState = buildTitleRenderState(
    input,
    titleDirectorDecision,
    titleArtTextStyles,
    "leftBlock",
    24,
  );
  const textStyles = [
    titleArtTextStyles.title,
    titleArtTextStyles.subtitle,
    TYPOGRAPHY.campus,
    TYPOGRAPHY.info,
    TYPOGRAPHY.phone,
  ];
  const { policy } = getDisplayPolicy(input.displayPolicy);
  const titlePanelHeight = Math.max(
    360,
    164 +
      titleRenderState.mainTitleLines.length * titleRenderState.titleLineHeight +
      titleRenderState.subtitleLines.length * titleArtTextStyles.subtitle.lineHeight,
  );
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
  ${renderDirectedTitleTextLines({
    state: titleRenderState,
    titleStyle: titleArtTextStyles.title,
    subtitleStyle: titleArtTextStyles.subtitle,
  })}
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
  titleArtStyle?: string,
  fontKeyOverride?: string,
  titleDirectorDecision?: TitleDirectorDecision,
): TitleArtTextStyles {
  const style = STANDARD_TITLE_ART_STYLES[getSupportedTitleArtStyle(titleArtStyle)];
  const fontFilePath = getFontFilePath(fontKeyOverride ?? style.fontKey);
  const fontFamily =
    "YuanFangTitleArt, PingFang SC, Microsoft YaHei, Noto Sans CJK SC, sans-serif";
  const scaleIntensity = getScaleIntensityMultiplier(
    titleDirectorDecision?.scaleIntensity,
  );
  const titleScale =
    getTitleScaleMultiplier(titleDirectorDecision?.titleScale) * scaleIntensity;
  const subtitleScale =
    getTitleScaleMultiplier(titleDirectorDecision?.subtitleScale) *
    Math.min(scaleIntensity, 1.10);

  return {
    title: {
      ...TYPOGRAPHY.title,
      fontFamily,
      fontFilePath,
      fontSize: Math.round(TYPOGRAPHY.title.fontSize * titleScale),
      lineHeight: Math.round(TYPOGRAPHY.title.lineHeight * titleScale),
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
      fontSize: Math.round(TYPOGRAPHY.subtitle.fontSize * subtitleScale),
      lineHeight: Math.round(TYPOGRAPHY.subtitle.lineHeight * subtitleScale),
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

function getTitleDirectorDecision(
  input: ComposeStandardPosterInput,
): TitleDirectorDecision {
  if (input.titleDirectorDecision) {
    return input.titleDirectorDecision;
  }

  const key = getTitleDirectorPresetKey(
    input.titleDirectorPreset,
    input.designFamily,
  );

  return TITLE_DIRECTOR_PRESETS[key].decision;
}

function getTitleDirectorPresetKey(
  titleDirectorPreset?: string,
  designFamily?: string,
): string {
  if (titleDirectorPreset) {
    return TITLE_DIRECTOR_PRESETS[titleDirectorPreset]
      ? titleDirectorPreset
      : "cleanBrand";
  }

  if (designFamily === "achievementShowcase" || designFamily === "businessLaunch") {
    return "stageHero";
  }

  if (designFamily === "modernChinese") {
    return "modernChineseSeal";
  }

  if (designFamily === "boldCampaign") {
    return "campaignImpact";
  }

  if (designFamily === "literaryEditorial") {
    return "literaryEditorial";
  }

  if (designFamily === "ipCartoonEvent") {
    return "ipEventPlayful";
  }

  return "cleanBrand";
}

function buildTitleRenderState(
  input: ComposeStandardPosterInput,
  decision: TitleDirectorDecision,
  titleArtTextStyles: TitleArtTextStyles,
  fallbackPlacement: TitlePlacementKey,
  subtitleOffset: number,
): TitleRenderState {
  const layout = resolveTitleLayout(
    decision,
    fallbackPlacement,
    titleArtTextStyles.title,
  );
  const mainTitleLines = getDirectedMainTitleLines(
    input.mainTitle,
    layout,
    decision,
    titleArtTextStyles.title.maxCharsPerLine,
    titleArtTextStyles.title.fontSize,
  );
  const subtitleLines = input.subtitle && decision.subtitlePlacement !== "none"
    ? getDirectedSubtitleLines(
        input.subtitle,
        layout,
        decision,
        titleArtTextStyles.subtitle.maxCharsPerLine,
        titleArtTextStyles.subtitle.fontSize,
      )
    : [];
  const titleLineHeight = getDirectedTitleLineHeight(
    titleArtTextStyles.title,
    layout.orientation,
  );
  const subtitleY = getDirectedSubtitleY(
    layout,
    decision,
    mainTitleLines.length,
    titleLineHeight,
    titleArtTextStyles.title.fontSize,
    subtitleOffset,
  );

  return {
    layout,
    mainTitleLines,
    subtitleLines,
    titleLineHeight,
    subtitleX: getDirectedSubtitleX(layout, decision),
    subtitleY,
    subtitleTextAnchor: getDirectedSubtitleTextAnchor(layout, decision),
  };
}

function resolveTitleLayout(
  decision: TitleDirectorDecision,
  fallbackPlacement: TitlePlacementKey,
  titleStyle: TextStyleWithEffects,
): ResolvedTitleLayout {
  const basePlacement = getTitlePlacementConfig(
    decision.placement,
    fallbackPlacement,
  );
  const titleBox = resolveTitleBox(decision);
  let placement = basePlacement;
  let orientation = getSupportedTitleOrientation(decision.orientation);
  let rotation: number | undefined;

  if (decision.compositionMode === "heroCenter") {
    placement = { x: 540, y: 245, textAnchor: "middle" };
  }

  if (decision.compositionMode === "topBanner") {
    placement = decision.placement === "topLeft"
      ? { x: 72, y: 174 }
      : { x: 540, y: 195, textAnchor: "middle" };
  }

  if (decision.compositionMode === "leftBlock") {
    placement = { x: 90, y: 240 };
  }

  if (decision.compositionMode === "editorialBlock") {
    placement = { x: 540, y: 180, textAnchor: "middle" };
  }

  if (
    decision.compositionMode === "sealBadge" ||
    decision.compositionMode === "rightVertical"
  ) {
    placement = { x: 820, y: 260, textAnchor: "middle" };
    orientation = "vertical";
  }

  if (decision.compositionMode === "leftVertical") {
    placement = { x: 210, y: 260, textAnchor: "middle" };
    orientation = "vertical";
  }

  if (decision.compositionMode === "diagonalDynamic") {
    placement = { x: 380, y: 270, textAnchor: "middle" };
    orientation = "diagonal";
    rotation = -8;
  }

  if (titleBox) {
    placement = {
      x: getTitleXFromBox(titleBox, decision.titleAlign),
      y: getTitleYFromBox(titleBox, titleStyle),
      textAnchor: getTitleAnchorFromAlign(decision.titleAlign),
      box: titleBox,
    };
  }

  if (Number.isFinite(decision.rotationDeg) && decision.rotationDeg !== 0) {
    rotation = decision.rotationDeg;
  } else if (orientation === "diagonal") {
    rotation = -8;
  }

  return {
    placement,
    orientation,
    rotationCenter: getRotationCenter(placement),
    ...(rotation ? { rotation } : {}),
  };
}

function getSupportedTitleOrientation(
  orientation?: TitleOrientation,
): TitleOrientation {
  if (
    orientation === "vertical" ||
    orientation === "diagonal" ||
    orientation === "stacked"
  ) {
    return orientation;
  }

  return "horizontal";
}

function resolveTitleBox(
  decision: TitleDirectorDecision,
): ResolvedTitleBox | undefined {
  const titleBox: unknown = decision.titleBox;

  if (!isRecord(titleBox)) {
    return undefined;
  }

  const { x, y, width, height } = titleBox;

  if (
    !isFiniteNumber(x) ||
    !isFiniteNumber(y) ||
    !isFiniteNumber(width) ||
    !isFiniteNumber(height) ||
    x < 0 ||
    y < 0 ||
    width <= 50 ||
    height <= 50 ||
    x + width > 1000 ||
    y + height > 1000
  ) {
    return undefined;
  }

  return {
    x: Math.round((x / 1000) * OUTPUT_WIDTH),
    y: Math.round((y / 1000) * OUTPUT_HEIGHT),
    width: Math.round((width / 1000) * OUTPUT_WIDTH),
    height: Math.round((height / 1000) * OUTPUT_HEIGHT),
  };
}

function getTitleAnchorFromAlign(
  titleAlign?: TitleDirectorDecision["titleAlign"],
): "start" | "middle" | "end" {
  if (titleAlign === "left") {
    return "start";
  }

  if (titleAlign === "right") {
    return "end";
  }

  return "middle";
}

function getTitleXFromBox(
  box: ResolvedTitleBox,
  titleAlign?: TitleDirectorDecision["titleAlign"],
): number {
  if (titleAlign === "left") {
    return box.x;
  }

  if (titleAlign === "right") {
    return box.x + box.width;
  }

  return box.x + Math.round(box.width / 2);
}

function getTitleYFromBox(
  box: ResolvedTitleBox,
  titleStyle: TextStyleWithEffects,
): number {
  return box.y + titleStyle.fontSize;
}

function getRotationCenter(
  placement: TitlePlacementConfig,
): { x: number; y: number } {
  if (placement.box) {
    return {
      x: placement.box.x + Math.round(placement.box.width / 2),
      y: placement.box.y + Math.round(placement.box.height / 2),
    };
  }

  return { x: placement.x, y: placement.y };
}

function getDirectedMainTitleLines(
  title: string,
  layout: ResolvedTitleLayout,
  decision: TitleDirectorDecision,
  baseMaxCharsPerLine: number,
  titleFontSize: number,
): string[] {
  if (layout.orientation === "vertical") {
    return Array.from(title);
  }

  if (layout.orientation === "stacked") {
    return splitTextByLength(title, 3);
  }

  return splitTextByLength(
    title,
    getTitleMaxCharsPerLine(
      baseMaxCharsPerLine,
      decision.lineBreakMode,
      layout.placement,
      titleFontSize,
    ),
  );
}

function getDirectedSubtitleLines(
  subtitle: string,
  layout: ResolvedTitleLayout,
  decision: TitleDirectorDecision,
  baseMaxCharsPerLine: number,
  subtitleFontSize: number,
): string[] {
  if (layout.orientation === "vertical") {
    return splitTextByLength(subtitle, 12);
  }

  if (layout.orientation === "stacked") {
    return splitTextByLength(subtitle, 8);
  }

  return splitTextByLength(
    subtitle,
    getSubtitleMaxCharsPerLine(
      baseMaxCharsPerLine,
      decision.lineBreakMode,
      layout.placement,
      subtitleFontSize,
    ),
  );
}

function getDirectedTitleLineHeight(
  style: TextStyleWithEffects,
  orientation: TitleOrientation,
): number {
  if (orientation === "vertical") {
    return Math.round(style.fontSize * 1.1);
  }

  if (orientation === "stacked") {
    return Math.round(style.lineHeight * 0.92);
  }

  return style.lineHeight;
}

function getDirectedSubtitleY(
  layout: ResolvedTitleLayout,
  decision: TitleDirectorDecision,
  mainTitleLineCount: number,
  titleLineHeight: number,
  titleFontSize: number,
  subtitleOffset: number,
): number {
  if (decision.subtitlePlacement === "verticalSide" && layout.placement.box) {
    return layout.placement.box.y + layout.placement.box.height + 36;
  }

  if (decision.subtitlePlacement === "side") {
    return layout.placement.y + titleFontSize + 20;
  }

  if (layout.orientation === "vertical") {
    return layout.placement.y + mainTitleLineCount * titleLineHeight + 42;
  }

  return layout.placement.y + mainTitleLineCount * titleLineHeight + subtitleOffset;
}

function getDirectedSubtitleX(
  layout: ResolvedTitleLayout,
  decision: TitleDirectorDecision,
): number {
  if (decision.subtitlePlacement === "side" && layout.placement.box) {
    return layout.placement.x + Math.round(layout.placement.box.width * 0.18);
  }

  if (decision.subtitlePlacement === "verticalSide" && layout.placement.box) {
    return layout.placement.box.x + Math.round(layout.placement.box.width / 2);
  }

  return layout.placement.x;
}

function getDirectedSubtitleTextAnchor(
  layout: ResolvedTitleLayout,
  decision: TitleDirectorDecision,
): "start" | "middle" | "end" | undefined {
  if (decision.subtitlePlacement === "side") {
    return layout.placement.textAnchor;
  }

  if (decision.subtitlePlacement === "verticalSide") {
    return "middle";
  }

  return layout.placement.textAnchor;
}

function getTitlePlacementConfig(
  placement: TitlePlacementKey,
  fallbackPlacement: TitlePlacementKey,
): TitlePlacementConfig {
  const supportedPlacement = getSupportedTitlePlacement(
    placement,
    fallbackPlacement,
  );

  if (supportedPlacement === "centerHero") {
    return { x: 540, y: 245, textAnchor: "middle" };
  }

  if (supportedPlacement === "topLeft") {
    return { x: 72, y: 174 };
  }

  if (supportedPlacement === "leftBlock") {
    return { x: 90, y: 240 };
  }

  return { x: 540, y: 195, textAnchor: "middle" };
}

function getSupportedTitlePlacement(
  placement: TitlePlacementKey,
  fallbackPlacement: TitlePlacementKey,
): TitlePlacementKey {
  if (
    placement === "topCenter" ||
    placement === "centerHero" ||
    placement === "topLeft" ||
    placement === "leftBlock"
  ) {
    return placement;
  }

  return fallbackPlacement;
}

function estimateCharsPerLine(
  box: ResolvedTitleBox | undefined,
  fontSize: number,
): number | undefined {
  if (!box || fontSize <= 0) {
    return undefined;
  }

  return Math.floor(box.width / (fontSize * 0.95));
}

function clampMaxChars(value: number): number {
  return Math.min(12, Math.max(2, Math.floor(value)));
}

function getTitleMaxCharsPerLine(
  baseMaxCharsPerLine: number,
  lineBreakMode: TitleLineBreakMode,
  placement: TitlePlacementConfig,
  titleFontSize: number,
): number {
  const estimatedChars = estimateCharsPerLine(placement.box, titleFontSize);

  if (lineBreakMode === "singleLinePreferred") {
    return clampMaxChars((estimatedChars ?? baseMaxCharsPerLine) + 2);
  }

  if (lineBreakMode === "shortLines" || placement.x === 90) {
    return clampMaxChars(Math.min(estimatedChars ?? 6, 6));
  }

  return clampMaxChars(estimatedChars ?? baseMaxCharsPerLine);
}

function getSubtitleMaxCharsPerLine(
  baseMaxCharsPerLine: number,
  lineBreakMode: TitleLineBreakMode,
  placement: TitlePlacementConfig,
  subtitleFontSize: number,
): number {
  const estimatedChars = estimateCharsPerLine(placement.box, subtitleFontSize);

  if (lineBreakMode === "singleLinePreferred") {
    return clampMaxChars((estimatedChars ?? baseMaxCharsPerLine) + 2);
  }

  if (lineBreakMode === "shortLines" || placement.x === 90) {
    return clampMaxChars(Math.min(estimatedChars ?? 10, 10));
  }

  return clampMaxChars(estimatedChars ?? baseMaxCharsPerLine);
}

function getTitleScaleMultiplier(scale?: TitleScaleLevel): number {
  if (scale === "hero") {
    return 1.24;
  }

  if (scale === "large") {
    return 1.12;
  }

  return 1;
}

function getScaleIntensityMultiplier(
  scaleIntensity?: TitleDirectorDecision["scaleIntensity"],
): number {
  if (scaleIntensity === "huge") {
    return 1.18;
  }

  if (scaleIntensity === "large") {
    return 1.08;
  }

  return 1;
}

function getSupportedTitleArtStyle(
  titleArtStyle?: string,
): StandardTitleArtStyleKey {
  if (titleArtStyle && titleArtStyle in STANDARD_TITLE_ART_STYLES) {
    return titleArtStyle as StandardTitleArtStyleKey;
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

function renderDirectedTitleTextLines(params: DirectedTitleTextParams): string {
  const { layout } = params.state;
  const titleText = renderTitleArtTextLines({
    lines: params.state.mainTitleLines,
    x: layout.placement.x,
    y: layout.placement.y,
    lineHeight: params.state.titleLineHeight,
    className: "title",
    letterSpacing: params.titleStyle.letterSpacing,
    textAnchor: layout.placement.textAnchor,
  });
  const subtitleText = params.state.subtitleLines.length > 0
    ? renderTitleArtTextLines({
        lines: params.state.subtitleLines,
        x: params.state.subtitleX,
        y: params.state.subtitleY,
        lineHeight: params.subtitleStyle.lineHeight,
        className: "subtitle",
        letterSpacing: params.subtitleStyle.letterSpacing,
        textAnchor: params.state.subtitleTextAnchor,
      })
    : "";
  const content = [titleText, subtitleText].filter(Boolean).join("\n  ");

  if (layout.rotation) {
    return `<g transform="rotate(${layout.rotation} ${layout.rotationCenter.x} ${layout.rotationCenter.y})">\n  ${content}\n  </g>`;
  }

  return content;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
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
