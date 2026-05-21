import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { resolveTitleFontForRole } from "@/config/title-font-registry";
import type { TitleBox, TitleLockupBox, TitleUnitBox } from "@/config/title-lockup-blueprint";
import { createRasterMeasurementIdentity, rasterMeasurementIdentityMatches, type TitleFontResolveResult, type VectorGlyphFontEmbedMode, type VectorGlyphMeasuredBoxes, type VectorGlyphMeasurementRequirement, type VectorGlyphOutputTarget, type VectorGlyphRenderInput, type VectorGlyphRenderResult, type VectorGlyphRun, type VectorGlyphSafetyCheck, type VectorGlyphSizeBudget, type VectorGlyphSizeBudgetResult, type VectorGlyphWarning, type VectorTitleLayer, type VectorTitleRole } from "@/models/title-vector-glyph-renderer";
import { resolveTitleRenderStylePreset, titleRunStyle, titleStyleSvgDefs, type TitleRunStyle } from "@/services/helpers/title-vector-glyph-style";
type RenderStrategy = { outputTarget: VectorGlyphOutputTarget; fontEmbedMode: VectorGlyphFontEmbedMode; sizeBudget: VectorGlyphSizeBudget; measurementRequirement: VectorGlyphMeasurementRequirement };
type FontFaceAsset = { fontKey: string; family: string; css: string; filePath: string; loaded: boolean; cacheKey: string; warning?: string };
type FitResult = { fontSize: number; measured: TitleBox; fits: boolean; renderScaleX: number; targetTextLength?: number; renderScaleAdjustmentApplied: boolean }; type RasterGate = { passed: boolean; identityMatches: boolean; accepted: boolean };
const fontFaceCache = new Map<string, FontFaceAsset>(); const DEFAULT_SIZE_BUDGET: VectorGlyphSizeBudget = { debugSvgWarningBytes: 5_000_000, standaloneSvgWarningBytes: 2_000_000, productionHardLimitBytes: 1_000_000, measurementSvgTargetBytes: 250_000 };
export function renderTitleVectorGlyph(input: VectorGlyphRenderInput): VectorGlyphRenderResult {
  const strategy = resolveRenderStrategy(input);
  const bp = input.blueprint;
  const orderedUnits = bp.titleUnits.slice().sort((a, b) => a.readingOrder - b.readingOrder);
  const titleJoin = orderedUnits.map((unit) => unit.text).join("");
  const charset = collectCharset([...orderedUnits.map((unit) => unit.text), input.blueprint.subtitleLockup.text]);
  const warnings = baseWarnings(input, strategy);
  const fontAssets: FontFaceAsset[] = [];
  const mainRuns = orderedUnits.map((unit, index) => createRun(input, strategy, charset, unit.text, unit.visualRole, unit.unitBox, unit.visualWeight, unit.allowEmphasis, unit.alignment, `${bp.candidateId}-unit-${index + 1}`, warnings, fontAssets, unit.direction));
  const subtitleRun = createSubtitleRun(input, strategy, charset, warnings, fontAssets);
  const glyphRuns = subtitleRun ? [...mainRuns, subtitleRun] : mainRuns;
  const layers = createLayers(glyphRuns, strategy.outputTarget === "debugSvg" && input.renderMode === "debug");
  const estimatedBoxes = { lockupBox: box(bp.lockupBox), unitBoxes: mainRuns.map((run) => ({ text: run.text, planned: run.plannedBox, measured: run.measuredBox })), ...(subtitleRun ? { subtitleBox: { text: subtitleRun.text, planned: subtitleRun.plannedBox, measured: subtitleRun.measuredBox } } : {}) };
  const rasterGate = createRasterGate(input, strategy, glyphRuns);
  const measuredBoxes = rasterGate.accepted ? input.rasterMeasurementResult!.measuredBoxes : estimatedBoxes;
  const svg = renderRealSvg(input, strategy, glyphRuns, fontAssets);
  const sizeBudget = evaluateSizeBudget(svg.length, input.renderMode, strategy);
  warnings.push(...strategyWarnings(input, strategy, sizeBudget, rasterGate.accepted));
  const checks = createSafetyChecks(input, strategy, sizeBudget, titleJoin, mainRuns, glyphRuns, measuredBoxes, rasterGate);
  const safety = { passed: checks.every((check) => check.passed || check.severity !== "error"), checks };
  const fontCacheKeyPreview = Array.from(new Set(fontAssets.map((asset) => asset.cacheKey)));
  return { source: "vector-glyph-renderer-v1", candidateId: bp.candidateId, sourceCandidateId: sourceCandidateId(input), outputTarget: strategy.outputTarget, fontEmbedMode: strategy.fontEmbedMode, measurementRequirement: strategy.measurementRequirement, sizeBudget, fontCacheKeyPreview, svg, sharpLayer: input.outputFormat === "sharpLayer" || strategy.outputTarget === "rasterLayer" ? { input: Buffer.from(svg), top: 0, left: 0 } : undefined, layers, measuredBoxes, glyphRuns, safety, warnings, reason: resultReason(strategy, rasterGate.accepted) };
}
function createRun(input: VectorGlyphRenderInput, strategy: RenderStrategy, charset: string, text: string, role: VectorTitleRole, plannedBox: TitleUnitBox, visualWeight: number, allowEmphasis: boolean, alignment: string, runId: string, warnings: VectorGlyphWarning[], fontAssets: FontFaceAsset[], direction?: string): VectorGlyphRun {
  const font = resolveTitleFontForRole(role, { registry: input.fontRegistry, fallback: input.fontFallback });
  warnings.push(...font.warnings);
  const asset = loadFontFace(font, strategy.fontEmbedMode, charset);
  if (asset.warning) warnings.push(warning("font_face_asset_warning", asset.warning, asset.filePath || role));
  fontAssets.push(asset);
  const preset = resolveTitleRenderStylePreset(input.titleStylePreset);
  const style = titleRunStyle(role, visualWeight, allowEmphasis, font.resolvedFontKey, input.renderSizingMode === "occupancyBoost", preset);
  const fit = fitTextBox(text, plannedBox, style, alignment);
  if (!fit.fits) warnings.push(warning("estimated_fit_failed", "estimated text box cannot fit inside planned unitBox at minimum font size", runId));
  if (direction === "vertical") warnings.push(warning("vertical_direction_conservative_render", "direction=vertical is rendered conservatively in Real SVG v1; no per-character vertical layout.", runId));
  return { runId, text, role, font, fontSize: fit.fontSize, fill: style.fill, strokeWidth: style.strokeWidth, strokeColor: style.strokeColor, filterId: style.filterId, renderScaleX: fit.renderScaleX, targetTextLength: fit.targetTextLength, renderScaleAdjustmentApplied: fit.renderScaleAdjustmentApplied, titleStylePreset: preset, contrastTreatmentApplied: style.contrastTreatmentApplied, hierarchyTreatmentApplied: style.hierarchyTreatmentApplied, styleSafetyWarnings: style.styleSafetyWarnings, transform: `rotate(${plannedBox.rotationDeg})`, plannedBox, measuredBox: fit.measured, fontEmbedded: asset.loaded, estimated: true, visualWeight, allowEmphasis, rotationDeg: plannedBox.rotationDeg };
}
function createSubtitleRun(input: VectorGlyphRenderInput, strategy: RenderStrategy, charset: string, warnings: VectorGlyphWarning[], fontAssets: FontFaceAsset[]): VectorGlyphRun | null {
  const subtitleBox = input.blueprint.subtitleLockup.subtitleBox;
  if (!subtitleBox || input.blueprint.subtitleLockup.placementPolicy === "hidden") return null;
  return createRun(input, strategy, charset, input.blueprint.subtitleLockup.text, "subtitle", subtitleBox, input.blueprint.subtitleLockup.visualWeight, false, "center", `${input.blueprint.candidateId}-subtitle`, warnings, fontAssets);
}
function createSafetyChecks(input: VectorGlyphRenderInput, strategy: RenderStrategy, sizeBudget: VectorGlyphSizeBudgetResult, titleJoin: string, mainRuns: readonly VectorGlyphRun[], glyphRuns: readonly VectorGlyphRun[], measuredBoxes: VectorGlyphMeasuredBoxes, rasterGate: RasterGate): VectorGlyphSafetyCheck[] {
  const bp = input.blueprint, mainRunsJoin = mainRuns.map((run) => run.text).join(""), zones = input.safetyContext?.forbiddenZones ?? [];
  const mainBoxes = measuredBoxes.unitBoxes.map((item) => item.measured).filter(Boolean) as TitleBox[], subtitleBox = measuredBoxes.subtitleBox?.measured;
  const activeBoxes = [...mainBoxes, ...(subtitleBox ? [subtitleBox] : [])], forbiddenOverlap = zones.some((zone) => activeBoxes.some((item) => overlaps(item, zone)));
  const subtitleOverlap = Boolean(subtitleBox && mainBoxes.some((item) => overlaps(item, subtitleBox))), measuredInside = measuredBoxes.unitBoxes.every((item) => item.measured && inside(item.measured, item.planned)) && (!measuredBoxes.subtitleBox || Boolean(measuredBoxes.subtitleBox.measured && inside(measuredBoxes.subtitleBox.measured, measuredBoxes.subtitleBox.planned)));
  const fontSeverity = input.renderMode === "production" ? "error" : "warning", zoneSeverity = input.renderMode === "production" ? "error" : "warning";
  const productionFullEmbedBlocked = input.renderMode === "production" && strategy.fontEmbedMode === "full", rasterMeasurementRequired = input.renderMode === "production" || strategy.measurementRequirement === "rasterRequiredForProduction", fontEmbedOk = strategy.fontEmbedMode === "full" ? glyphRuns.every((run) => run.fontEmbedded) : true, rasterSeverity = input.renderMode === "production" ? "error" : "warning";
  return [
    check("title_join_matches_main_title", titleJoin === bp.mainTitle, "error", "titleUnits sorted by readingOrder must join mainTitle."),
    check("glyph_runs_join_matches_main_title", mainRunsJoin === bp.mainTitle, "error", "main glyphRuns must join mainTitle."),
    check("lockup_box_synced", sameLockupBox(bp.lockupBox, bp.spatialContract.lockupBox), "error", "root lockupBox must match spatialContract.lockupBox."),
    check("unit_boxes_inside_lockup", bp.titleUnits.every((unit) => inside(unit.unitBox, bp.lockupBox)), "error", "each titleUnit.unitBox must stay inside lockupBox."),
    check("estimated_measured_boxes_inside_unit", measuredInside, input.renderMode === "production" ? "error" : "warning", "estimated measured boxes must stay inside planned unitBox."),
    check("subtitle_not_overlapping_main_title", !subtitleOverlap, "error", "subtitle estimated box must not overlap main title runs."),
    check("fallback_not_allowed_in_production", input.renderMode !== "production" || !bp.isFallbackCandidate, "error", "fallback candidates cannot render in production mode."),
    check("font_resolved", glyphRuns.every((run) => run.font.status !== "missing" && run.font.status !== "unavailable"), "error", "all glyph runs must resolve a font or configured fallback."),
    check("font_embedded", fontEmbedOk, fontSeverity, "full font embed mode requires local @font-face; non-full modes intentionally omit full CJK font CSS."),
    check("production_full_font_embed_blocked", !productionFullEmbedBlocked, "error", "production cannot emit SVG with full CJK font embedded."),
    check("raster_measurement_passed", !rasterMeasurementRequired || rasterGate.passed, rasterSeverity, !rasterMeasurementRequired ? "raster measurement is not required for this render mode." : rasterGate.passed ? "external Sharp raster measurement safety passed." : "production requires a passing Sharp raster measurement result."),
    check("raster_measurement_identity_matches", !rasterMeasurementRequired || rasterGate.identityMatches, rasterSeverity, !rasterMeasurementRequired ? "raster measurement identity is not required for this render mode." : rasterGate.identityMatches ? "raster measurement identity matches current measurement SVG and glyph runs." : "raster measurement identity does not match current measurement SVG and glyph runs."),
    check("raster_measurement_required_for_production", !rasterMeasurementRequired || rasterGate.accepted, "error", rasterGate.accepted ? "external Sharp raster measurement result passed and matched identity." : "production requires matching Sharp raster measurement."),
    check("svg_size_budget", sizeBudget.status !== "blocked", sizeBudget.status === "blocked" ? "error" : "warning", sizeBudget.reason),
    check("measurement_svg_not_final_asset", strategy.outputTarget !== "measurementSvg", "warning", "measurementSvg is an internal measurement target and must not be delivered as final artwork."),
    check("forbidden_zone_overlap", !forbiddenOverlap, zoneSeverity, "forbiddenZones are checked only for overlap; renderer does not relayout."),
    check("candidate_traceable", bp.candidateId.length > 0, "error", "candidateId must be present for traceability."),
  ];
}
function renderRealSvg(input: VectorGlyphRenderInput, strategy: RenderStrategy, runs: readonly VectorGlyphRun[], assets: readonly FontFaceAsset[]): string {
  const preset = resolveTitleRenderStylePreset(input.titleStylePreset);
  const css = Array.from(new Set(assets.filter((asset) => asset.loaded).map((asset) => asset.css))).join("\n");
  const body = runs.map((run) => renderRun(run)).join("");
  const debug = strategy.outputTarget === "debugSvg" && input.renderMode === "debug" ? renderDebugOverlay(input, runs) : "";
  return `<svg width="${input.canvas.width}" height="${input.canvas.height}" viewBox="0 0 ${input.canvas.width} ${input.canvas.height}" xmlns="http://www.w3.org/2000/svg" data-output-target="${strategy.outputTarget}" data-font-embed-mode="${strategy.fontEmbedMode}" data-title-style-preset="${preset}"><defs><style><![CDATA[${css}
.title-run{dominant-baseline:alphabetic;paint-order:stroke fill;stroke-linejoin:round;stroke-linecap:round}.debug-box{fill:none;stroke-width:2;vector-effect:non-scaling-stroke}.debug-label{font-family:Arial,sans-serif;font-size:12px;fill:#64748b}]]></style>${titleStyleSvgDefs(preset)}</defs><g id="title-lockup" data-candidate-id="${escapeXml(input.blueprint.candidateId)}">${body}</g>${debug}</svg>`;
}
function renderRun(run: VectorGlyphRun): string {
  const m = run.measuredBox ?? box(run.plannedBox);
  const cx = run.plannedBox.x + run.plannedBox.width / 2;
  const cy = run.plannedBox.y + run.plannedBox.height / 2;
  const rotate = run.rotationDeg ? ` transform="rotate(${run.rotationDeg} ${round(cx)} ${round(cy)})"` : "";
  const stroke = run.strokeWidth > 0 ? ` stroke="${run.strokeColor ?? "#fffaf0"}" stroke-width="${run.strokeWidth}"` : "";
  const filter = run.filterId ? ` filter="url(#${run.filterId})"` : "";
  const x = round(m.x + m.width / 2);
  const y = round(m.y + m.height * 0.78);
  const key = run.font.resolvedFontKey ?? "system";
  const decor = run.role === "accent" && run.allowEmphasis ? `<circle cx="${round(m.x + m.width + 8)}" cy="${round(m.y + 8)}" r="4" fill="#EF7A00" opacity=".8"/>` : "";
  const lengthAttrs = run.targetTextLength ? ` textLength="${run.targetTextLength}" lengthAdjust="spacingAndGlyphs" data-render-scale-x="${run.renderScaleX ?? 1}"` : "";
  return `<g id="${escapeXml(run.runId)}" data-role="${run.role}" data-font-key="${escapeXml(key)}"${rotate}><text class="title-run role-${run.role}" x="${x}" y="${y}" text-anchor="middle" font-family="${escapeXml(run.font.family)}" font-size="${run.fontSize}" font-weight="${run.font.weight}" font-style="${run.font.style}" fill="${run.fill}"${stroke}${filter}${lengthAttrs}>${escapeXml(run.text)}</text>${decor}</g>`;
}
function renderDebugOverlay(input: VectorGlyphRenderInput, runs: readonly VectorGlyphRun[]): string {
  const bp = input.blueprint;
  const lock = rect(bp.lockupBox, "#f59e0b", "8 6");
  const unitRects = runs.map((run) => `${rect(run.plannedBox, run.role === "subtitle" ? "#fb923c" : "#0ea5e9", "4 4")}${run.measuredBox ? rect(run.measuredBox, "#22c55e", "") : ""}<text class="debug-label" x="${run.plannedBox.x}" y="${Math.max(12, run.plannedBox.y - 4)}">${escapeXml(run.role)}:${escapeXml(run.text)}</text>`).join("");
  return `<g id="debug-overlay" opacity=".88">${lock}${unitRects}</g>`;
}
function fitTextBox(text: string, planned: TitleUnitBox, style: TitleRunStyle, alignment: string): FitResult {
  let low = 8, high = Math.max(8, planned.height * style.fontSizeCap), best = low;
  for (let i = 0; i < 18; i += 1) { const mid = (low + high) / 2, measured = estimateTextBox(text, mid, style); if ((style.forceTextLength || measured.width <= planned.width) && measured.height <= planned.height) { best = mid; low = mid; } else high = mid; }
  const base = estimateTextBox(text, best, style), baseAdvance = Math.max(1, base.width - style.strokeWidth * 2), maxAdvance = Math.max(1, planned.width - style.strokeWidth * 2 - 4), targetAdvance = Math.min(maxAdvance, Math.max(1, planned.width * style.targetWidthOccupancy - style.strokeWidth * 2));
  const renderScaleX = round(targetAdvance / baseAdvance), measured = { ...base, width: round(targetAdvance + style.strokeWidth * 2) }, adjusted = style.forceTextLength || renderScaleX > 1.03 || renderScaleX < 0.97;
  return { fontSize: Math.max(1, round(best)), measured: placeMeasured(planned, measured, alignment), fits: measured.width <= planned.width && measured.height <= planned.height, renderScaleX, ...(adjusted ? { targetTextLength: round(targetAdvance) } : {}), renderScaleAdjustmentApplied: adjusted };
}
function estimateTextBox(text: string, fontSize: number, style: TitleRunStyle): TitleBox {
  const count = Array.from(text).length, width = count * fontSize * style.widthFactor + Math.max(0, count - 1) * style.letterSpacing + style.strokeWidth * 2, height = fontSize * style.lineHeightFactor + style.strokeWidth * 2;
  return { x: 0, y: 0, width: round(width), height: round(height) };
}
function loadFontFace(font: TitleFontResolveResult, embedMode: VectorGlyphFontEmbedMode, charset: string): FontFaceAsset {
  if (!font.filePath || !font.resolvedFontKey) return { fontKey: font.resolvedFontKey ?? "system", family: font.family, css: "", filePath: font.filePath ?? "", loaded: false, cacheKey: fontCacheKey(font.resolvedFontKey ?? "system", charset, font.filePath ?? "", 0, embedMode), warning: "no local font filePath; using system family fallback only" };
  const absolutePath = path.resolve(process.cwd(), font.filePath);
  const exists = existsSync(absolutePath);
  const mtimeMs = exists ? Math.round(statSync(absolutePath).mtimeMs) : 0;
  const cacheKey = fontCacheKey(font.resolvedFontKey, charset, font.filePath, mtimeMs, embedMode);
  const cached = fontFaceCache.get(cacheKey);
  if (cached) return cached;
  if (!exists) return cacheFont(cacheKey, { fontKey: font.resolvedFontKey, family: font.family, css: "", filePath: font.filePath, loaded: false, cacheKey, warning: "local font file does not exist" });
  if (embedMode === "subset") return cacheFont(cacheKey, { fontKey: font.resolvedFontKey, family: font.family, css: "", filePath: font.filePath, loaded: false, cacheKey, warning: "font subset embedding is not implemented; full CJK font css omitted." });
  if (embedMode === "external") return cacheFont(cacheKey, { fontKey: font.resolvedFontKey, family: font.family, css: "", filePath: font.filePath, loaded: false, cacheKey, warning: "external font asset mode is a contract only in this stage; no external css href emitted." });
  if (embedMode === "none") return cacheFont(cacheKey, { fontKey: font.resolvedFontKey, family: font.family, css: "", filePath: font.filePath, loaded: false, cacheKey });
  const base64 = readFileSync(absolutePath).toString("base64");
  const css = `@font-face{font-family:"${escapeCss(font.family)}";src:url("data:${fontMime(font.filePath)};base64,${base64}") format("${fontFormat(font.filePath)}");font-weight:${font.weight};font-style:${font.style};font-display:block;}`;
  return cacheFont(cacheKey, { fontKey: font.resolvedFontKey, family: font.family, css, filePath: font.filePath, loaded: true, cacheKey });
}
function createLayers(runs: readonly VectorGlyphRun[], debug: boolean): VectorTitleLayer[] {
  const layers = runs.map((run, index) => ({ layerId: run.runId, kind: run.role === "subtitle" ? "subtitle" as const : "glyphRun" as const, role: run.role, text: run.text, plannedBox: run.plannedBox, zIndex: index + 1, opacity: 1, reason: "real SVG font run with estimated measured box." }));
  return debug ? [...layers, { layerId: "debug-overlay", kind: "debug", zIndex: 999, opacity: 0.88, reason: "debug overlay for planned and estimated boxes." }] : layers;
}
function baseWarnings(input: VectorGlyphRenderInput, strategy: RenderStrategy): VectorGlyphWarning[] {
  const warnings = [warning("estimated_measurement_only", "renderer estimated boxes remain available; Sharp raster measurement is supplied externally.", "measuredBoxes"), warning("glyph_path_not_implemented", "glyph path conversion is intentionally not implemented in Real SVG v1.", "glyphRuns"), warning("shadow_glow_bleed_warning", "shadow/glow bleed is warning-only unless raster measurement proves overflow.", "svg")];
  if (strategy.outputTarget === "measurementSvg") warnings.push(warning("measurement_svg_not_final_asset", "measurementSvg is for Sharp measurement only and is not a final deliverable asset.", "outputTarget"));
  if (strategy.outputTarget === "rasterLayer") warnings.push(warning("raster_layer_not_implemented", "rasterLayer is the intended Final Composer handoff, but this stage still returns an SVG buffer.", "outputTarget"));
  if (strategy.fontEmbedMode === "subset") warnings.push(warning("font_subset_not_implemented", "font subset mode is declared but not implemented; full CJK font is not embedded.", "fontEmbedMode"));
  if (input.outputFormat === "sharpLayer") warnings.push(warning("sharp_layer_svg_buffer_only", "sharpLayer wraps the SVG buffer; no Sharp measurement is performed.", "outputFormat"));
  if (input.blueprint.isFallbackCandidate) warnings.push(warning("fallback_candidate", "fallback candidate is diagnostic only and cannot pass production safety.", input.blueprint.candidateId));
  return warnings;
}
function resolveRenderStrategy(input: VectorGlyphRenderInput): RenderStrategy {
  const outputTarget = input.outputTarget ?? (input.outputFormat === "sharpLayer" ? "rasterLayer" : input.renderMode === "production" ? "rasterLayer" : "debugSvg");
  const fontEmbedMode = input.fontEmbedMode ?? (outputTarget === "debugSvg" || outputTarget === "standaloneSvg" ? "full" : "none");
  return { outputTarget, fontEmbedMode, sizeBudget: { ...DEFAULT_SIZE_BUDGET, ...input.sizeBudget }, measurementRequirement: input.measurementRequirement ?? (input.renderMode === "production" ? "rasterRequiredForProduction" : "estimatedOnly") };
}
function evaluateSizeBudget(svgLengthBytes: number, renderMode: string, strategy: RenderStrategy): VectorGlyphSizeBudgetResult {
  const blocked = renderMode === "production" && svgLengthBytes > strategy.sizeBudget.productionHardLimitBytes;
  const limit = blocked ? strategy.sizeBudget.productionHardLimitBytes : targetLimit(strategy);
  const warningTarget = strategy.outputTarget === "measurementSvg" || strategy.outputTarget === "standaloneSvg" || strategy.outputTarget === "debugSvg";
  const status = blocked ? "blocked" : warningTarget && svgLengthBytes > limit ? "warning" : "ok";
  const label = status === "blocked" ? "production SVG exceeds hard limit" : status === "warning" ? `${strategy.outputTarget} exceeds strategy threshold` : "SVG size is within the configured strategy budget";
  return { svgLengthBytes, status, limitBytes: limit, target: strategy.outputTarget, reason: `${label} ${limit} bytes.` };
}
function strategyWarnings(input: VectorGlyphRenderInput, strategy: RenderStrategy, sizeBudget: VectorGlyphSizeBudgetResult, rasterOk: boolean): VectorGlyphWarning[] {
  return [
    ...(strategy.fontEmbedMode === "full" && sizeBudget.status !== "ok" ? [warning("full_font_svg_heavy", sizeBudget.reason, "svg")] : []),
    ...(input.renderMode === "production" && strategy.fontEmbedMode === "full" ? [warning("production_full_font_embed_blocked", "production cannot emit full CJK font embedded SVG.", "fontEmbedMode")] : []),
    ...((input.renderMode === "production" || strategy.measurementRequirement === "rasterRequiredForProduction") && !rasterOk ? [warning("raster_measurement_required_for_production", "production requires external Sharp raster measurement.", "safety")] : []),
    ...(strategy.outputTarget === "measurementSvg" ? [warning("measurement_svg_estimated_only", "measurementSvg carries estimated renderer boxes until external Sharp measurement replaces them.", "outputTarget")] : []),
  ];
}
function resultReason(strategy: RenderStrategy, rasterOk: boolean): string { return rasterOk ? "real SVG font render v1 with accepted external Sharp raster measurement." : strategy.outputTarget === "measurementSvg" ? "real SVG font render v1 measurementSvg strategy; renderer measurement remains estimated." : strategy.outputTarget === "rasterLayer" ? "real SVG font render v1 rasterLayer strategy; Final Composer should consume a raster layer later, but this stage still returns SVG buffer only." : "real SVG font render v1; measurement is deterministic estimate only."; }
function targetLimit(strategy: RenderStrategy): number { return strategy.outputTarget === "measurementSvg" ? strategy.sizeBudget.measurementSvgTargetBytes : strategy.outputTarget === "standaloneSvg" ? strategy.sizeBudget.standaloneSvgWarningBytes : strategy.outputTarget === "debugSvg" ? strategy.sizeBudget.debugSvgWarningBytes : strategy.sizeBudget.productionHardLimitBytes; }
function collectCharset(values: readonly string[]): string { return Array.from(new Set(values.join(""))).sort().join(""); }
function fontCacheKey(fontKey: string, charset: string, filePath: string, mtimeMs: number, embedMode: VectorGlyphFontEmbedMode): string { return `fontKey=${fontKey};charset=${charset};filePath=${filePath};mtime=${mtimeMs};embedMode=${embedMode}`; }
function cacheFont(key: string, asset: FontFaceAsset): FontFaceAsset { fontFaceCache.set(key, asset); return asset; }
function check(code: string, passed: boolean, severity: "error" | "warning", reason: string): VectorGlyphSafetyCheck { return { checkId: code, code, passed, severity, reason }; }
function warning(code: string, message: string, target: string): VectorGlyphWarning { return { code, severity: "warning", message, target }; }
function placeMeasured(planned: TitleUnitBox, measured: TitleBox, alignment: string): TitleBox {
  const x = alignment === "left" ? planned.x : alignment === "right" ? planned.x + planned.width - measured.width : planned.x + (planned.width - measured.width) / 2;
  return { x: round(x), y: round(planned.y + (planned.height - measured.height) / 2), width: measured.width, height: measured.height }; }
function inside(inner: TitleBox, outer: TitleBox): boolean { return inner.x >= outer.x - 0.01 && inner.y >= outer.y - 0.01 && inner.x + inner.width <= outer.x + outer.width + 0.01 && inner.y + inner.height <= outer.y + outer.height + 0.01; }
function overlaps(a: TitleBox, b: TitleBox): boolean { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }
function sameLockupBox(left: TitleLockupBox, right: TitleLockupBox): boolean { return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height && left.safePadding === right.safePadding && left.allowedOverflowPx === right.allowedOverflowPx; }
function box(value: TitleBox): TitleBox { return { x: value.x, y: value.y, width: value.width, height: value.height }; }
function rect(value: TitleBox, stroke: string, dash: string): string { return `<rect class="debug-box" x="${value.x}" y="${value.y}" width="${value.width}" height="${value.height}" stroke="${stroke}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`; }
function sourceCandidateId(input: VectorGlyphRenderInput): string | undefined { return input.blueprint.candidateId.includes("-r") ? input.blueprint.candidateId.split("-r")[0] : undefined; }
function createRasterGate(input: VectorGlyphRenderInput, strategy: RenderStrategy, glyphRuns: readonly VectorGlyphRun[]): RasterGate {
  const result = input.rasterMeasurementResult; if (!result) return { passed: false, identityMatches: false, accepted: false };
  const identityMatches = rasterMeasurementIdentityMatches(result.identity, createRasterMeasurementIdentity({ candidateId: input.blueprint.candidateId, canvas: input.canvas, outputTarget: "measurementSvg", fontEmbedMode: "none", measurementSvg: renderRealSvg(input, { ...strategy, outputTarget: "measurementSvg", fontEmbedMode: "none" }, glyphRuns, []), glyphRuns: [...glyphRuns], alphaThreshold: result.alphaThreshold }));
  return { passed: result.safety.passed, identityMatches, accepted: result.safety.passed && identityMatches };
}
function fontMime(filePath: string): string { return filePath.endsWith(".woff2") ? "font/woff2" : filePath.endsWith(".woff") ? "font/woff" : filePath.endsWith(".otf") ? "font/otf" : "font/ttf"; }
function fontFormat(filePath: string): string { return filePath.endsWith(".woff2") ? "woff2" : filePath.endsWith(".woff") ? "woff" : filePath.endsWith(".otf") ? "opentype" : "truetype"; }
function escapeCss(value: string): string { return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }
function escapeXml(value: string): string { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function round(value: number): number { return Math.round(value * 100) / 100; }
