import OpenAI from "openai";
import { MODELS } from "@/config/models";

export type SpatialBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type NegativeSpaceShape =
  | "verticalColumn"
  | "horizontalBand"
  | "diagonalRibbon"
  | "centerBlock"
  | "circle"
  | "arc"
  | "freeform"
  | "none";

export type DominantFlow =
  | "vertical"
  | "horizontal"
  | "diagonalUp"
  | "diagonalDown"
  | "radial"
  | "centered"
  | "freeform";

export type RecommendedTitleFlow =
  | "followShape"
  | "contrastShape"
  | "centerLockup"
  | "edgeLockup";

export type ZoneComplexity =
  | "low"
  | "medium"
  | "high";

export type ForbiddenZoneReason =
  | "logo"
  | "mascot"
  | "subject"
  | "highDetail"
  | "edge"
  | "textConflict";

export type SafeZone = SpatialBox & {
  id: string;
  shape: NegativeSpaceShape;
  complexity: ZoneComplexity;
  confidence: number;
  reason: string;
};

export type ForbiddenZone = SpatialBox & {
  id: string;
  reasonType: ForbiddenZoneReason;
  reason: string;
};

export type TextAnchor = SpatialBox & {
  id: string;
  safeZoneId: string;
  preferredOrientation: "horizontal" | "vertical" | "diagonal" | "stacked";
  recommendedTitleFlow: RecommendedTitleFlow;
  priority: number;
  confidence: number;
  reason: string;
};

export type BackgroundLayoutAnalysisInput = {
  backgroundImageBase64: string;
  designFamily?: string;
  layoutFamily?: string;
  productOutputType?: string;
  eventBrief?: string;
  visualDetails?: string;
  avoidNotes?: string;
};

export type BackgroundLayoutAnalysisResult = {
  source: "ai" | "fallback";
  safeZones: SafeZone[];
  forbiddenZones: ForbiddenZone[];
  negativeSpaceShape: NegativeSpaceShape;
  dominantFlow: DominantFlow;
  recommendedTitleFlow: RecommendedTitleFlow;
  textAnchors: TextAnchor[];
  compositionReason: string;
};

type BackgroundLayoutValidationDiagnostic = {
  valid: boolean;
  reason?: string;
  rawPreview?: string;
};

const NEGATIVE_SPACE_SHAPES: readonly NegativeSpaceShape[] = ["verticalColumn", "horizontalBand", "diagonalRibbon", "centerBlock", "circle", "arc", "freeform", "none"];
const DOMINANT_FLOWS: readonly DominantFlow[] = ["vertical", "horizontal", "diagonalUp", "diagonalDown", "radial", "centered", "freeform"];
const RECOMMENDED_TITLE_FLOWS: readonly RecommendedTitleFlow[] = ["followShape", "contrastShape", "centerLockup", "edgeLockup"];
const ZONE_COMPLEXITIES: readonly ZoneComplexity[] = ["low", "medium", "high"];
const FORBIDDEN_REASONS: readonly ForbiddenZoneReason[] = ["logo", "mascot", "subject", "highDetail", "edge", "textConflict"];
const TITLE_ORIENTATIONS: readonly TextAnchor["preferredOrientation"][] = ["horizontal", "vertical", "diagonal", "stacked"];

export async function analyzeBackgroundLayout(
  input: BackgroundLayoutAnalysisInput,
): Promise<BackgroundLayoutAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallback("OPENAI_API_KEY missing; used fallback background layout analysis.");
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: MODELS.recommendation,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: [
            { type: "text", text: buildUserPrompt(input) },
            { type: "image_url", image_url: { url: buildImageUrl(input.backgroundImageBase64), detail: "low" } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });
    const { analysis, diagnostic } = parseAnalysisWithDiagnostic(response.choices[0]?.message?.content);

    if (!analysis) {
      return fallback(
        `AI output invalid: ${diagnostic.reason || "unknown validation error"}; rawPreview: ${diagnostic.rawPreview || ""}; used fallback background layout analysis.`,
      );
    }

    return { source: "ai", ...analysis };
  } catch (error) {
    return fallback(`AI background layout analysis failed: ${errorMessage(error)}; used fallback.`);
  }
}

function buildSystemPrompt(): string {
  return [
    "你是远方智设的背景空间智能分析器。",
    "你不是标题设计师，不生成标题文字，不决定字体。",
    "你只分析背景空间结构，为标题候选生成器提供空间约束。",
    "你必须识别 safeZones、forbiddenZones、negativeSpaceShape、dominantFlow、textAnchors。",
    "标题应该优先服从背景空间，而不是先服从活动主题。",
    "如果背景中间有竖向聚光柱 / 竖向长方体留白 / 中央通道，必须考虑 verticalColumn 和 followShape。",
    "如果有斜向视觉动线，可以考虑 diagonalRibbon / diagonalUp / diagonalDown。",
    "不能把 Logo、主体、高复杂度细节区域作为标题区。",
    "坐标必须使用 0-1000 归一化坐标。",
    "dominantFlow 只能是：vertical / horizontal / diagonalUp / diagonalDown / radial / centered / freeform。",
    "不要输出 dominantFlow：verticalDown / verticalUp / centerTopDown / topDown / leftRight。",
    "如果画面是自上而下聚光柱，dominantFlow 应输出 vertical。",
    "recommendedTitleFlow 只能是：followShape / contrastShape / centerLockup / edgeLockup。",
    "不要输出 recommendedTitleFlow：centerTopDown / topDown / verticalFollow / centerVertical。",
    "如果标题应顺着竖向聚光柱，recommendedTitleFlow 应输出 followShape。",
    "safeZone.shape 只能是：verticalColumn / horizontalBand / diagonalRibbon / centerBlock / circle / arc / freeform / none。",
    "不要输出 safeZone.shape：rectangle / rect / verticalRect / horizontalRect / topBand / centerArea。",
    "如果是普通矩形留白：中央块状区域用 centerBlock，横向条带区域用 horizontalBand，竖向柱状区域用 verticalColumn。",
    "safeZones 每一项必须包含完整字段：id / x / y / width / height / shape / complexity / confidence / reason。",
    "forbiddenZone.reasonType 只能是：logo / mascot / subject / highDetail / edge / textConflict。",
    "不要输出 forbiddenZone.reasonType：keyObject / mainObject / importantObject / heroObject。",
    "如果是麦克风、人物、奖杯、作品、展示台等关键视觉物体，应输出 subject。",
    "如果是复杂细节区域，应输出 highDetail。",
    "forbiddenZones 每一项必须包含完整字段：id / x / y / width / height / reasonType / reason。",
    "textAnchors 每一项必须包含完整字段：id / safeZoneId / x / y / width / height / preferredOrientation / recommendedTitleFlow / priority / confidence / reason。",
    "必须只输出 JSON，不要 Markdown，不要解释。",
  ].join("\n");
}

function buildUserPrompt(input: BackgroundLayoutAnalysisInput): string {
  return [
    `designFamily: ${input.designFamily || "未填写"}`,
    `layoutFamily: ${input.layoutFamily || "未填写"}`,
    `productOutputType: ${input.productOutputType || "未填写"}`,
    `eventBrief: ${input.eventBrief || "未填写"}`,
    `visualDetails: ${input.visualDetails || "未填写"}`,
    `avoidNotes: ${input.avoidNotes || "未填写"}`,
    "请输出 JSON，格式必须包含 safeZones、forbiddenZones、negativeSpaceShape、dominantFlow、recommendedTitleFlow、textAnchors、compositionReason。",
    "safeZones 数量 1-5；forbiddenZones 数量 0-8；textAnchors 数量 1-6。",
    "每个 textAnchor.safeZoneId 必须对应某个 safeZone.id。",
    "confidence 必须是 0-1；priority 必须是 1-6。",
    "严格 JSON 示例：",
    JSON.stringify({
      safeZones: [
        {
          id: "centerVerticalColumn",
          x: 260,
          y: 120,
          width: 480,
          height: 650,
          shape: "verticalColumn",
          complexity: "low",
          confidence: 0.86,
          reason: "中部聚光柱形成竖向留白，适合标题顺着空间组织。",
        },
      ],
      forbiddenZones: [
        {
          id: "logoTopRight",
          x: 780,
          y: 30,
          width: 180,
          height: 120,
          reasonType: "logo",
          reason: "右上角品牌 Logo 区域不能压文字。",
        },
        {
          id: "leftDetailWall",
          x: 0,
          y: 280,
          width: 180,
          height: 420,
          reasonType: "highDetail",
          reason: "左侧作品墙细节复杂，不适合标题覆盖。",
        },
      ],
      negativeSpaceShape: "verticalColumn",
      dominantFlow: "vertical",
      recommendedTitleFlow: "followShape",
      textAnchors: [
        {
          id: "anchorCenterColumnMain",
          safeZoneId: "centerVerticalColumn",
          x: 320,
          y: 160,
          width: 360,
          height: 520,
          preferredOrientation: "vertical",
          recommendedTitleFlow: "followShape",
          priority: 1,
          confidence: 0.88,
          reason: "该锚点位于竖向聚光留白中，适合标题沿空间走向组织。",
        },
        {
          id: "anchorCenterLockup",
          safeZoneId: "centerVerticalColumn",
          x: 260,
          y: 220,
          width: 480,
          height: 260,
          preferredOrientation: "horizontal",
          recommendedTitleFlow: "centerLockup",
          priority: 2,
          confidence: 0.74,
          reason: "如果需要稳定横向标题，可在中部低复杂度区域居中锁定。",
        },
      ],
      compositionReason: "背景中部为竖向聚光柱，标题应优先顺着竖向空间组织，而不是机械横排。",
    }),
    "错误反例，禁止输出：",
    '"dominantFlow": "verticalDown"',
    '"recommendedTitleFlow": "centerTopDown"',
    "禁止 safeZones 只输出：id / x / y / width / height。",
    "禁止 textAnchors 只输出：id / safeZoneId / x / y / confidence / priority。",
    '"shape": "rectangle"',
    '"shape": "topBand"',
    '"reasonType": "keyObject"',
    '"reasonType": "importantObject"',
    "正确写法：",
    '"dominantFlow": "vertical"',
    '"recommendedTitleFlow": "followShape"',
    '"shape": "centerBlock"',
    '"shape": "horizontalBand"',
    '"reasonType": "subject"',
  ].join("\n");
}

function parseAnalysis(content?: string | null): Omit<BackgroundLayoutAnalysisResult, "source"> | undefined {
  return parseAnalysisWithDiagnostic(content).analysis;
}

function parseAnalysisWithDiagnostic(
  content: string | null | undefined,
): {
  analysis?: Omit<BackgroundLayoutAnalysisResult, "source">;
  diagnostic: BackgroundLayoutValidationDiagnostic;
} {
  if (!content) {
    return {
      diagnostic: { valid: false, reason: "empty model content" },
    };
  }

  const preview = rawPreview(content);

  try {
    return validateBackgroundLayoutAnalysisWithDiagnostic(
      JSON.parse(stripJsonFence(content)),
      preview,
    );
  } catch (error) {
    return {
      diagnostic: {
        valid: false,
        reason: `JSON parse failed: ${errorMessage(error)}`,
        rawPreview: preview,
      },
    };
  }
}

function validateBackgroundLayoutAnalysis(value: unknown): Omit<BackgroundLayoutAnalysisResult, "source"> | undefined {
  return validateBackgroundLayoutAnalysisWithDiagnostic(value).analysis;
}

function validateBackgroundLayoutAnalysisWithDiagnostic(
  value: unknown,
  preview?: string,
): {
  analysis?: Omit<BackgroundLayoutAnalysisResult, "source">;
  diagnostic: BackgroundLayoutValidationDiagnostic;
} {
  if (!isRecord(value)) {
    return invalidDiagnostic("root is not object", preview);
  }

  if (!Array.isArray(value.safeZones) || value.safeZones.length < 1 || value.safeZones.length > 5) {
    return invalidDiagnostic("safeZones missing or count invalid", preview);
  }

  if (!Array.isArray(value.forbiddenZones) || value.forbiddenZones.length > 8) {
    return invalidDiagnostic("forbiddenZones missing or count invalid", preview);
  }

  if (!Array.isArray(value.textAnchors) || value.textAnchors.length < 1 || value.textAnchors.length > 6) {
    return invalidDiagnostic("textAnchors missing or count invalid", preview);
  }

  const negativeSpaceShape = normalizeNegativeSpaceShape(value.negativeSpaceShape);
  const dominantFlow = normalizeDominantFlow(value.dominantFlow);
  const recommendedTitleFlow = normalizeRecommendedTitleFlow(value.recommendedTitleFlow);

  if (!negativeSpaceShape) {
    return invalidDiagnostic(`negativeSpaceShape invalid: ${String(value.negativeSpaceShape)}`, preview);
  }

  if (!dominantFlow) {
    return invalidDiagnostic(`dominantFlow invalid: ${String(value.dominantFlow)}`, preview);
  }

  if (!recommendedTitleFlow) {
    return invalidDiagnostic(`recommendedTitleFlow invalid: ${String(value.recommendedTitleFlow)}`, preview);
  }

  if (!isNonEmptyString(value.compositionReason)) {
    return invalidDiagnostic("compositionReason missing", preview);
  }

  const safeZones = value.safeZones.map(normalizeSafeZone);
  const forbiddenZones = value.forbiddenZones.map(normalizeForbiddenZone);
  const safeZoneIds = new Set(safeZones.map((zone) => zone?.id).filter(isNonEmptyString));
  const textAnchors = value.textAnchors.map((anchor) => normalizeTextAnchor(anchor, safeZoneIds));
  const invalidSafeZoneIndex = safeZones.findIndex((zone) => !zone);
  const invalidForbiddenZoneIndex = forbiddenZones.findIndex((zone) => !zone);
  const missingSafeZoneTargetIndex = value.textAnchors.findIndex(
    (anchor) =>
      isRecord(anchor) &&
      isNonEmptyString(anchor.safeZoneId) &&
      !safeZoneIds.has(anchor.safeZoneId),
  );
  const invalidTextAnchorIndex = textAnchors.findIndex((anchor) => !anchor);

  if (invalidSafeZoneIndex >= 0) {
    return invalidDiagnostic(`safeZone invalid at index ${invalidSafeZoneIndex}`, preview);
  }

  if (invalidForbiddenZoneIndex >= 0) {
    return invalidDiagnostic(`forbiddenZone invalid at index ${invalidForbiddenZoneIndex}`, preview);
  }

  if (missingSafeZoneTargetIndex >= 0) {
    return invalidDiagnostic(
      `textAnchor.safeZoneId missing target safeZone at index ${missingSafeZoneTargetIndex}`,
      preview,
    );
  }

  if (invalidTextAnchorIndex >= 0) {
    return invalidDiagnostic(`textAnchor invalid at index ${invalidTextAnchorIndex}`, preview);
  }

  return {
    analysis: {
      safeZones: safeZones as SafeZone[],
      forbiddenZones: forbiddenZones as ForbiddenZone[],
      negativeSpaceShape,
      dominantFlow,
      recommendedTitleFlow,
      textAnchors: textAnchors as TextAnchor[],
      compositionReason: value.compositionReason.trim(),
    },
    diagnostic: { valid: true },
  };
}

function invalidDiagnostic(
  reason: string,
  preview?: string,
): {
  diagnostic: BackgroundLayoutValidationDiagnostic;
} {
  return {
    diagnostic: {
      valid: false,
      reason,
      rawPreview: preview,
    },
  };
}

function normalizeSafeZone(value: unknown): SafeZone | undefined {
  const shape = isRecord(value) ? normalizeNegativeSpaceShape(value.shape) : undefined;

  if (
    !isRecord(value) ||
    !isValidBox(value) ||
    !isNonEmptyString(value.id) ||
    !shape ||
    !isOneOf(value.complexity, ZONE_COMPLEXITIES) ||
    !isConfidence(value.confidence) ||
    !isNonEmptyString(value.reason)
  ) {
    return undefined;
  }

  return { id: value.id, x: value.x, y: value.y, width: value.width, height: value.height, shape, complexity: value.complexity, confidence: value.confidence, reason: value.reason.trim() };
}

function normalizeForbiddenZone(value: unknown): ForbiddenZone | undefined {
  const reasonType = isRecord(value) ? normalizeForbiddenZoneReason(value.reasonType) : undefined;

  if (
    !isRecord(value) ||
    !isValidBox(value) ||
    !isNonEmptyString(value.id) ||
    !reasonType ||
    !isNonEmptyString(value.reason)
  ) {
    return undefined;
  }

  return { id: value.id, x: value.x, y: value.y, width: value.width, height: value.height, reasonType, reason: value.reason.trim() };
}

function normalizeTextAnchor(value: unknown, safeZoneIds: Set<string>): TextAnchor | undefined {
  const recommendedTitleFlow = isRecord(value)
    ? normalizeRecommendedTitleFlow(value.recommendedTitleFlow)
    : undefined;

  if (
    !isRecord(value) ||
    !isValidBox(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.safeZoneId) ||
    !safeZoneIds.has(value.safeZoneId) ||
    !isOneOf(value.preferredOrientation, TITLE_ORIENTATIONS) ||
    !recommendedTitleFlow ||
    !isPriority(value.priority) ||
    !isConfidence(value.confidence) ||
    !isNonEmptyString(value.reason)
  ) {
    return undefined;
  }

  return { id: value.id, safeZoneId: value.safeZoneId, x: value.x, y: value.y, width: value.width, height: value.height, preferredOrientation: value.preferredOrientation, recommendedTitleFlow, priority: value.priority, confidence: value.confidence, reason: value.reason.trim() };
}

function fallback(reason: string): BackgroundLayoutAnalysisResult {
  return {
    source: "fallback",
    safeZones: [
      { id: "centerVerticalColumn", x: 280, y: 130, width: 440, height: 650, shape: "verticalColumn", complexity: "low", confidence: 0.62, reason: "fallback 中央竖向区域，供测试链路使用。" },
    ],
    forbiddenZones: [
      { id: "logoTopRight", x: 780, y: 30, width: 180, height: 120, reasonType: "logo", reason: "右上角预留品牌 Logo 区域。" },
    ],
    negativeSpaceShape: "verticalColumn",
    dominantFlow: "vertical",
    recommendedTitleFlow: "followShape",
    textAnchors: [
      { id: "anchorCenterColumnMain", safeZoneId: "centerVerticalColumn", x: 320, y: 160, width: 360, height: 500, preferredOrientation: "vertical", recommendedTitleFlow: "followShape", priority: 1, confidence: 0.64, reason: "中心竖向区域适合测试竖向标题组织。" },
      { id: "anchorCenterBlock", safeZoneId: "centerVerticalColumn", x: 260, y: 220, width: 480, height: 260, preferredOrientation: "horizontal", recommendedTitleFlow: "centerLockup", priority: 2, confidence: 0.58, reason: "中心区域可测试横向标题锁定。" },
      { id: "anchorDiagonalContrast", safeZoneId: "centerVerticalColumn", x: 220, y: 230, width: 560, height: 360, preferredOrientation: "diagonal", recommendedTitleFlow: "contrastShape", priority: 3, confidence: 0.5, reason: "备用斜向张力锚点。" },
    ],
    compositionReason: reason,
  };
}

function isValidBox(value: Record<string, unknown>): value is Record<string, unknown> & SpatialBox {
  const { x, y, width, height } = value;
  return (
    isFiniteNumber(x) &&
    isFiniteNumber(y) &&
    isFiniteNumber(width) &&
    isFiniteNumber(height) &&
    x >= 0 &&
    y >= 0 &&
    width > 20 &&
    height > 20 &&
    x + width <= 1000 &&
    y + height <= 1000
  );
}

function isConfidence(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function isPriority(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 6;
}

function normalizeNegativeSpaceShape(value: unknown): NegativeSpaceShape | undefined {
  if (isOneOf(value, NEGATIVE_SPACE_SHAPES)) {
    return value;
  }

  if (
    value === "rectangle" ||
    value === "rect" ||
    value === "centerArea" ||
    value === "centerRectangle"
  ) {
    return "centerBlock";
  }

  if (
    value === "horizontalRect" ||
    value === "topBand" ||
    value === "bottomBand" ||
    value === "horizontalStrip"
  ) {
    return "horizontalBand";
  }

  if (
    value === "verticalRect" ||
    value === "verticalRectangle" ||
    value === "lightColumn" ||
    value === "spotlightColumn"
  ) {
    return "verticalColumn";
  }

  return undefined;
}

function normalizeForbiddenZoneReason(value: unknown): ForbiddenZoneReason | undefined {
  if (isOneOf(value, FORBIDDEN_REASONS)) {
    return value;
  }

  if (
    value === "keyObject" ||
    value === "mainObject" ||
    value === "importantObject" ||
    value === "heroObject" ||
    value === "mainSubject"
  ) {
    return "subject";
  }

  if (value === "detail" || value === "complexDetail" || value === "busyArea") {
    return "highDetail";
  }

  return undefined;
}

function normalizeDominantFlow(value: unknown): DominantFlow | undefined {
  if (isOneOf(value, DOMINANT_FLOWS)) {
    return value;
  }

  if (value === "verticalDown" || value === "verticalUp" || value === "topDown") {
    return "vertical";
  }

  if (value === "leftRight" || value === "rightLeft") {
    return "horizontal";
  }

  return undefined;
}

function normalizeRecommendedTitleFlow(value: unknown): RecommendedTitleFlow | undefined {
  if (isOneOf(value, RECOMMENDED_TITLE_FLOWS)) {
    return value;
  }

  if (value === "centerTopDown" || value === "verticalFollow" || value === "followVertical") {
    return "followShape";
  }

  if (value === "center") {
    return "centerLockup";
  }

  return undefined;
}

function buildImageUrl(base64: string): string {
  const trimmed = base64.trim();
  return trimmed.startsWith("data:") ? trimmed : `data:image/jpeg;base64,${trimmed}`;
}

function stripJsonFence(content: string): string {
  return content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
}

function errorMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error);
  return sanitizeText(rawMessage).slice(0, 500);
}

function rawPreview(content: string): string {
  return sanitizeText(content).slice(0, 2000);
}

function sanitizeText(value: string): string {
  const apiKey = process.env.OPENAI_API_KEY;
  const withoutApiKey = apiKey ? value.replaceAll(apiKey, "[redacted]") : value;
  const withoutDataImage = withoutApiKey.replace(/data:image\/[a-zA-Z+.-]+;base64,[A-Za-z0-9+/=]+/g, "[redacted-image]");
  return withoutDataImage.replace(/[A-Za-z0-9+/]{200,}={0,2}/g, "[redacted-long-token]");
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
