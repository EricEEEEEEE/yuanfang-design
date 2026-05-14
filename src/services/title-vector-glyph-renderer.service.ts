import { resolveTitleFontForRole } from "@/config/title-font-registry";
import type { TitleBox, TitleLockupBox, TitleUnitBox } from "@/config/title-lockup-blueprint";
import type {
  VectorGlyphRenderInput,
  VectorGlyphRenderResult,
  VectorGlyphRun,
  VectorGlyphSafetyCheck,
  VectorGlyphWarning,
  VectorTitleLayer,
  VectorTitleRole,
} from "@/models/title-vector-glyph-renderer";

export function renderTitleVectorGlyph(input: VectorGlyphRenderInput): VectorGlyphRenderResult {
  const blueprint = input.blueprint;
  const orderedUnits = blueprint.titleUnits.slice().sort((left, right) => left.readingOrder - right.readingOrder);
  const titleJoin = orderedUnits.map((unit) => unit.text).join("");
  const warnings = baseWarnings(input);
  const glyphRuns = orderedUnits.map((unit, index): VectorGlyphRun => {
    const font = resolveTitleFontForRole(unit.visualRole, {
      registry: input.fontRegistry,
      fallback: input.fontFallback,
    });
    warnings.push(...font.warnings);
    return {
      runId: `${blueprint.candidateId}-unit-${index + 1}`,
      text: unit.text,
      role: unit.visualRole,
      font,
      fontSize: estimateFontSize(unit.unitBox, unit.visualWeight),
      fill: fillForRole(unit.visualRole),
      strokeWidth: strokeForRole(unit.visualRole),
      transform: `rotate(${unit.unitBox.rotationDeg})`,
      plannedBox: unit.unitBox,
      measuredBox: box(unit.unitBox),
      visualWeight: unit.visualWeight,
      allowEmphasis: unit.allowEmphasis,
      rotationDeg: unit.unitBox.rotationDeg,
    };
  });
  const subtitleRun = createSubtitleRun(input, warnings);
  if (subtitleRun) glyphRuns.push(subtitleRun);

  const layers = createLayers(glyphRuns);
  const checks = createSafetyChecks(input, titleJoin, glyphRuns);
  const safety = {
    passed: checks.every((check) => check.passed || check.severity !== "error"),
    checks,
  };
  const measuredBoxes = {
    lockupBox: box(blueprint.lockupBox),
    unitBoxes: orderedUnits.map((unit) => ({
      text: unit.text,
      planned: unit.unitBox,
      measured: box(unit.unitBox),
    })),
    ...(blueprint.subtitleLockup.subtitleBox
      ? { subtitleBox: {
          text: blueprint.subtitleLockup.text,
          planned: blueprint.subtitleLockup.subtitleBox,
          measured: box(blueprint.subtitleLockup.subtitleBox),
        } }
      : {}),
  };

  return {
    source: "vector-glyph-renderer-v1",
    candidateId: blueprint.candidateId,
    sourceCandidateId: sourceCandidateId(input),
    svg: input.outputFormat === "svg" ? renderPlaceholderSvg(input, glyphRuns) : undefined,
    layers,
    measuredBoxes,
    glyphRuns,
    safety,
    warnings,
    reason: "skeleton placeholder, not production glyph render.",
  };
}

function createSubtitleRun(input: VectorGlyphRenderInput, warnings: VectorGlyphWarning[]): VectorGlyphRun | null {
  const subtitleBox = input.blueprint.subtitleLockup.subtitleBox;
  if (!subtitleBox || input.blueprint.subtitleLockup.placementPolicy === "hidden") return null;
  const font = resolveTitleFontForRole("subtitle", {
    registry: input.fontRegistry,
    fallback: input.fontFallback,
  });
  warnings.push(...font.warnings);
  return {
    runId: `${input.blueprint.candidateId}-subtitle`,
    text: input.blueprint.subtitleLockup.text,
    role: "subtitle",
    font,
    fontSize: estimateFontSize(subtitleBox, input.blueprint.subtitleLockup.visualWeight),
    fill: "#334155",
    strokeWidth: 0,
    transform: `rotate(${subtitleBox.rotationDeg})`,
    plannedBox: subtitleBox,
    measuredBox: box(subtitleBox),
    visualWeight: input.blueprint.subtitleLockup.visualWeight,
    allowEmphasis: false,
    rotationDeg: subtitleBox.rotationDeg,
  };
}

function createSafetyChecks(
  input: VectorGlyphRenderInput,
  titleJoin: string,
  glyphRuns: readonly VectorGlyphRun[],
): VectorGlyphSafetyCheck[] {
  const blueprint = input.blueprint;
  const mainRunsJoin = glyphRuns.filter((run) => run.role !== "subtitle").map((run) => run.text).join("");
  const allUnitsInside = blueprint.titleUnits.every((unit) => inside(unit.unitBox, blueprint.lockupBox));
  const fontsResolved = glyphRuns.every((run) => run.font.status !== "unavailable" && run.font.status !== "missing");
  return [
    check("title_join_matches_main_title", titleJoin === blueprint.mainTitle, "error", "titleUnits readingOrder must join mainTitle."),
    check("glyph_runs_join_matches_main_title", mainRunsJoin === blueprint.mainTitle, "error", "main glyphRuns must join mainTitle."),
    check("lockup_box_synced", sameLockupBox(blueprint.lockupBox, blueprint.spatialContract.lockupBox), "error", "root lockupBox must match spatialContract.lockupBox."),
    check("unit_boxes_inside_lockup", allUnitsInside, "error", "each titleUnit.unitBox must stay inside lockupBox."),
    check("fallback_not_allowed_in_production", input.renderMode !== "production" || !blueprint.isFallbackCandidate, "error", "fallback candidates cannot render in production mode."),
    check("font_resolved", fontsResolved, "error", "all skeleton glyph runs must resolve a font or fallback."),
    check("measured_boxes_placeholder", true, "warning", "measured boxes are placeholders; true glyph measurement not implemented."),
  ];
}

function createLayers(glyphRuns: readonly VectorGlyphRun[]): VectorTitleLayer[] {
  return glyphRuns.map((run, index) => ({
    layerId: run.runId,
    kind: run.role === "subtitle" ? "subtitle" : "glyphRun",
    role: run.role,
    text: run.text,
    plannedBox: run.plannedBox,
    zIndex: index + 1,
    opacity: 1,
    reason: "skeleton layer from planned box; no glyph path render yet.",
  }));
}

function renderPlaceholderSvg(input: VectorGlyphRenderInput, glyphRuns: readonly VectorGlyphRun[]): string {
  const rects = glyphRuns.map((run) => {
    const color = run.role === "hero" ? "#22C55E" : run.role === "subtitle" ? "#FB923C" : "#0EA5E9";
    const label = `${run.role}:${run.text}`;
    return `<rect x="${run.plannedBox.x}" y="${run.plannedBox.y}" width="${run.plannedBox.width}" height="${run.plannedBox.height}" fill="none" stroke="${color}" stroke-width="2"/><text x="${run.plannedBox.x + 6}" y="${run.plannedBox.y + 20}" fill="${color}" font-size="14">${escapeXml(label)}</text>`;
  });
  return `<svg width="${input.canvas.width}" height="${input.canvas.height}" viewBox="0 0 ${input.canvas.width} ${input.canvas.height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="none"/><rect x="${input.blueprint.lockupBox.x}" y="${input.blueprint.lockupBox.y}" width="${input.blueprint.lockupBox.width}" height="${input.blueprint.lockupBox.height}" fill="none" stroke="#F59E0B" stroke-width="3" stroke-dasharray="8 6"/>${rects.join("")}<text x="24" y="${input.canvas.height - 24}" fill="#64748B" font-size="18">skeleton placeholder, not production glyph render</text></svg>`;
}

function baseWarnings(input: VectorGlyphRenderInput): VectorGlyphWarning[] {
  const warnings: VectorGlyphWarning[] = [
    warning("measured_boxes_placeholder", "measured boxes are placeholders", "measuredBoxes"),
    warning("true_glyph_measurement_not_implemented", "true glyph measurement not implemented", "glyphRuns"),
    warning("sharp_raster_measurement_not_implemented", "sharp raster measurement not implemented", "safety"),
    warning("svg_skeleton_placeholder", "SVG is skeleton placeholder", "svg"),
  ];
  if (input.renderMode === "production") warnings.push(warning("not_production_ready", "skeleton placeholder is not production-ready", "renderMode"));
  if (input.blueprint.isFallbackCandidate) warnings.push(warning("fallback_candidate", "fallback candidate rendered only as skeleton diagnostic", input.blueprint.candidateId));
  return warnings;
}

function check(code: string, passed: boolean, severity: "error" | "warning", reason: string): VectorGlyphSafetyCheck { return { checkId: code, code, passed, severity, reason }; }
function warning(code: string, message: string, target: string): VectorGlyphWarning {
  return { code, severity: "warning", message, target };
}

function estimateFontSize(boxValue: TitleUnitBox, visualWeight: number): number {
  return Math.max(12, Math.round(Math.min(boxValue.height * 0.68, boxValue.width * 0.34) * Math.max(0.8, visualWeight / 4)));
}

function fillForRole(role: VectorTitleRole): string {
  if (role === "accent") return "#EF7A00";
  if (role === "subtitle" || role === "support") return "#334155";
  return "#004089";
}

function strokeForRole(role: VectorTitleRole): number {
  if (role === "hero") return 2;
  if (role === "lead" || role === "accent") return 1;
  return 0;
}

function inside(inner: TitleBox, outer: TitleBox): boolean {
  return inner.x >= outer.x && inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;
}

function sameLockupBox(left: TitleLockupBox, right: TitleLockupBox): boolean {
  return left.x === right.x && left.y === right.y && left.width === right.width &&
    left.height === right.height && left.safePadding === right.safePadding && left.allowedOverflowPx === right.allowedOverflowPx;
}

function box(value: TitleBox): TitleBox { return { x: value.x, y: value.y, width: value.width, height: value.height }; }
function sourceCandidateId(input: VectorGlyphRenderInput): string | undefined {
  return input.blueprint.candidateId.includes("-r") ? input.blueprint.candidateId.split("-r")[0] : undefined;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
