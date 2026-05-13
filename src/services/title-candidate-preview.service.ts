import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { TitleCandidate, TitleCandidateUnit } from "@/services/title-candidate.service";

export type RenderTitleCandidatePreviewInput = {
  backgroundImagePath: string;
  outputDir: string;
  candidates: TitleCandidate[];
  outputWidth?: number;
  outputHeight?: number;
};

export type RenderTitleCandidatePreviewResult = {
  previewPaths: string[];
  contactSheetPath: string;
};

const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1620;
const TITLE_BASE_FONT_SIZE = 72;
const SUBTITLE_BASE_FONT_SIZE = 36;

export async function renderTitleCandidatePreviews(
  input: RenderTitleCandidatePreviewInput,
): Promise<RenderTitleCandidatePreviewResult> {
  const width = input.outputWidth ?? DEFAULT_WIDTH;
  const height = input.outputHeight ?? DEFAULT_HEIGHT;

  if (!existsSync(input.backgroundImagePath)) {
    throw new Error(`TITLE_CANDIDATE_PREVIEW_BACKGROUND_MISSING: ${input.backgroundImagePath}`);
  }

  if (input.candidates.length === 0) {
    throw new Error("TITLE_CANDIDATE_PREVIEW_CANDIDATES_EMPTY");
  }

  mkdirSync(input.outputDir, { recursive: true });

  const previewPaths: string[] = [];

  for (const [index, candidate] of input.candidates.entries()) {
    const outputPath = path.join(input.outputDir, `yuanfang-title-candidate-preview-${index + 1}.jpg`);
    const svg = buildCandidateSvg(candidate, width, height);

    await sharp(input.backgroundImagePath)
      .resize(width, height, { fit: "cover" })
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .jpeg({ quality: 82 })
      .toFile(outputPath);

    previewPaths.push(outputPath);
  }

  const contactSheetPath = path.join(input.outputDir, "yuanfang-title-candidate-contact-sheet.jpg");
  await renderContactSheet(previewPaths, input.candidates, contactSheetPath);

  return { previewPaths, contactSheetPath };
}

function buildCandidateSvg(candidate: TitleCandidate, width: number, height: number): string {
  const unitElements = candidate.titleUnits
    .map((unit) => renderTitleUnit(unit, width, height))
    .join("\n");
  const subtitleElement = renderSubtitle(candidate, width, height);
  const meta = `${candidate.patternKeys.join(" + ")} | ${candidate.effectIntent}`;

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#0B1F3A" flood-opacity="0.32"/>
    </filter>
  </defs>
  <style>
    .preview-text {
      font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
      paint-order: stroke fill;
      stroke: #FFFFFF;
      stroke-linejoin: round;
      filter: url(#textShadow);
    }
    .candidate-label {
      font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
      font-size: 28px;
      font-weight: 700;
      fill: #FFFFFF;
    }
    .candidate-meta {
      font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
      font-size: 22px;
      font-weight: 500;
      fill: #FFFFFF;
    }
  </style>
  <rect x="28" y="28" width="460" height="86" rx="18" fill="#004089" opacity="0.76"/>
  <text class="candidate-label" x="52" y="66">${escapeXml(candidate.candidateId)}</text>
  <text class="candidate-meta" x="52" y="96">${escapeXml(meta)}</text>
  ${unitElements}
  ${subtitleElement}
</svg>`;
}

function renderTitleUnit(unit: TitleCandidateUnit, width: number, height: number): string {
  const x = normalizeCoordinate(unit.x, width);
  const y = normalizeCoordinate(unit.y, height);
  const fontSize = Math.round(TITLE_BASE_FONT_SIZE * unit.scale);
  const roleStyle = getRoleStyle(unit.role);
  const content = unit.direction === "vertical"
    ? renderVerticalText(unit.text, x, y, fontSize)
    : `<text x="${x}" y="${y}" text-anchor="middle">${escapeXml(unit.text)}</text>`;

  return `
  <g transform="rotate(${unit.rotationDeg} ${x} ${y})">
    <g class="preview-text" font-size="${fontSize}" font-weight="${roleStyle.fontWeight}" fill="${roleStyle.fill}" stroke-width="${roleStyle.strokeWidth}">
      ${content}
    </g>
  </g>`;
}

function renderVerticalText(text: string, x: number, y: number, fontSize: number): string {
  return Array.from(text)
    .map((char, index) => {
      const charY = Math.round(y + index * fontSize * 1.08);
      return `<text x="${x}" y="${charY}" text-anchor="middle">${escapeXml(char)}</text>`;
    })
    .join("\n");
}

function renderSubtitle(candidate: TitleCandidate, width: number, height: number): string {
  const subtitle = candidate.subtitle;

  if (!subtitle || subtitle.placement === "none") {
    return "";
  }

  const x = normalizeCoordinate(subtitle.x, width);
  const y = normalizeCoordinate(subtitle.y, height);
  const fontSize = Math.round(SUBTITLE_BASE_FONT_SIZE * subtitle.scale);
  const fill = subtitle.placement === "side" ? "#EF7A00" : "#334155";

  return `
  <text class="preview-text" x="${x}" y="${y}" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="${fill}" stroke-width="5">
    ${escapeXml(subtitle.text)}
  </text>`;
}

async function renderContactSheet(
  previewPaths: string[],
  candidates: TitleCandidate[],
  outputPath: string,
): Promise<void> {
  const thumbWidth = 360;
  const thumbHeight = 540;
  const labelHeight = 40;
  const columns = 3;
  const rows = Math.ceil(previewPaths.length / columns);
  const sheetWidth = thumbWidth * columns;
  const sheetHeight = rows * (thumbHeight + labelHeight);
  const composites = await Promise.all(previewPaths.map(async (previewPath, index) => ({
    input: await sharp(previewPath).resize(thumbWidth, thumbHeight, { fit: "cover" }).toBuffer(),
    left: (index % columns) * thumbWidth,
    top: Math.floor(index / columns) * (thumbHeight + labelHeight),
  })));
  const labelSvg = buildContactSheetLabelSvg(candidates, sheetWidth, sheetHeight, thumbWidth, thumbHeight, labelHeight);

  await sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 3,
      background: "#F8FAFC",
    },
  })
    .composite([...composites, { input: Buffer.from(labelSvg), left: 0, top: 0 }])
    .jpeg({ quality: 84 })
    .toFile(outputPath);
}

function buildContactSheetLabelSvg(
  candidates: TitleCandidate[],
  width: number,
  height: number,
  thumbWidth: number,
  thumbHeight: number,
  labelHeight: number,
): string {
  const labels = candidates.map((candidate, index) => {
    const x = (index % 3) * thumbWidth + 16;
    const y = Math.floor(index / 3) * (thumbHeight + labelHeight) + thumbHeight + 28;
    const label = `${candidate.candidateId} | ${candidate.patternKeys.join(" + ")}`;

    return `<text x="${x}" y="${y}">${escapeXml(label)}</text>`;
  }).join("\n");

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    text {
      font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
      font-size: 22px;
      font-weight: 700;
      fill: #004089;
    }
  </style>
  ${labels}
</svg>`;
}

function getRoleStyle(role: TitleCandidateUnit["role"]): {
  fill: string;
  fontWeight: number;
  strokeWidth: number;
} {
  if (role === "main") return { fill: "#004089", fontWeight: 800, strokeWidth: 7 };
  if (role === "lead") return { fill: "#004089", fontWeight: 700, strokeWidth: 6 };
  if (role === "accent") return { fill: "#EF7A00", fontWeight: 700, strokeWidth: 6 };

  return { fill: "#334155", fontWeight: 600, strokeWidth: 5 };
}

function normalizeCoordinate(value: number, size: number): number {
  return Math.round((value / 1000) * size);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
