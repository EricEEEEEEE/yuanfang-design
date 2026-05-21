import OpenAI from "openai";
import { MODELS } from "@/config/models";
import {
  TITLE_COMPOSITION_GRAMMAR,
  type TitleCompositionMode,
} from "@/config/title-composition-grammar";
import {
  TITLE_FORBIDDEN_SEMANTIC_SPLITS,
  TITLE_SEMANTIC_SPLITS,
  type TitleSemanticSplitCandidate,
} from "@/config/title-semantic-splitter";
import { createGenericSemanticSplitCandidates } from "@/config/title-generic-semantic-splits";
import {
  TITLE_LOCKUP_BLUEPRINT_RULES,
  type TitleLockupBlueprint,
  type TitleLockupBox,
  type TitleLockupUnit,
  type TitleUnitBox,
} from "@/config/title-lockup-blueprint";
import {
  TITLE_REFERENCE_PATTERNS,
  type TitlePatternCandidateRole,
  type TitlePatternMutation,
  type TitleReferencePatternKey,
} from "@/config/title-reference-patterns";
import type { TextAnchor } from "@/services/background-layout-intelligence.service";
import {
  planSpatialStrategy,
  type SpatialStrategy,
  type TitleOrientationPreference,
  type TitleSpatialStrategyMode,
} from "@/services/spatial-strategy-planner.service";
import type { TitleHierarchyContext } from "@/models/title-hierarchy-context";

export type TitleCandidateUnitRole =
  | "lead"
  | "main"
  | "accent"
  | "support";

export type TitleCandidateUnitDirection =
  | "horizontal"
  | "vertical";

export type TitleCandidateUnit = {
  text: string;
  role: TitleCandidateUnitRole;
  direction: TitleCandidateUnitDirection;
  x: number;
  y: number;
  scale: number;
  rotationDeg: number;
};

export type TitleCandidateSubtitle = {
  text: string;
  x: number;
  y: number;
  scale: number;
  placement: "below" | "side" | "verticalSide" | "none";
};

export type TitleCandidateEffectIntent =
  | "stageDepth"
  | "cleanReadable"
  | "chineseSeal"
  | "campaignImpact"
  | "editorialSoft"
  | "playfulBadge";

export type TitleCandidateDecorationIntent =
  | "none"
  | "stageLight"
  | "smallStars"
  | "medalLine"
  | "goldLine"
  | "sealStamp"
  | "paperTag"
  | "bookMark"
  | "campaignLabel"
  | "growthArrow"
  | "colorBlock"
  | "badge"
  | "playfulDot";

export type TitleCandidate = {
  candidateId: string;
  spatialAnchorId: string;
  strategyMode: TitleSpatialStrategyMode;
  orientationPreference: TitleOrientationPreference;
  patternKeys: TitleReferencePatternKey[];
  hybridStrategy: string;
  titleUnits: TitleCandidateUnit[];
  subtitle?: TitleCandidateSubtitle;
  effectIntent: TitleCandidateEffectIntent;
  decorationIntents: TitleCandidateDecorationIntent[];
  readabilityPlan: string;
  backgroundFitReason: string;
  whyNotTemplate: string;
};

export type GenerateTitleCandidatesInput = {
  backgroundImageBase64: string;
  mainTitle: string;
  subtitle?: string;
  designFamily?: string;
  layoutFamily?: string;
  displayPolicy?: string;
  productOutputType?: string;
  eventBrief?: string;
  styleBrief?: string;
  visualDetails?: string;
  avoidNotes?: string;
  titleHierarchyContext?: TitleHierarchyContext;
};

export type GenerateTitleCandidatesResult = {
  source: "ai" | "rule-based" | "fallback";
  structuredOutputMode: "json_schema" | "zod" | "unavailable";
  lockupDraftCount: number;
  lockupDraftFields: string[];
  firstDraftUnitLayoutHints: TitleLockupDraftUnitLayoutHint[];
  lockupBlueprints: TitleLockupBlueprint[];
  candidates: TitleCandidate[];
  reason: string;
  spatialStrategy: SpatialStrategy;
  titleHierarchyContext?: TitleHierarchyContext;
};

type PatternSummary = {
  key: TitleReferencePatternKey;
  label: string;
  family: string;
  unitPattern: string;
  flexibility: string;
  candidateRole: TitlePatternCandidateRole;
  canHybridWith: TitleReferencePatternKey[];
  mutationAllowed: TitlePatternMutation[];
  promptGuidance: string;
  templateRiskWarning: string;
};

type CandidateValidationDiagnostic = {
  valid: boolean;
  reason?: string;
  rawPreview?: string;
};

type LockupBlueprintValidationDiagnostic = {
  valid: boolean;
  reason?: string;
  rawPreview?: string;
};

type AnchorPosition = {
  x: number;
  y: number;
};

type LockupBlueprintCandidatePlanItem = {
  candidateId: string;
  semanticSplitId: string;
  compositionMode: TitleCompositionMode;
  flowAxis: TitleFlowAxis;
  spatialAnchorId: string;
  patternKeys: TitleReferencePatternKey[];
  effectIntent: TitleCandidateEffectIntent;
  decorationIntents: TitleCandidateDecorationIntent[];
  reasonHint: string;
};

export type TitleLockupDraftBoxRatio = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number;
};

export type TitleLockupDraftUnitLayoutHint = {
  unitIndex: number;
  direction: TitleLockupUnit["direction"];
  alignment: TitleLockupUnit["alignment"];
  boxRatio: TitleLockupDraftBoxRatio;
};

type LockupDraft = {
  candidateId: string;
  unitLayoutHints: TitleLockupDraftUnitLayoutHint[];
  reason: string;
};

type LockupDraftValidationDiagnostic = {
  valid: boolean;
  reason?: string;
  rawPreview?: string;
};

type BlueprintOrientationPreference = TitleLockupBlueprint["orientationPreference"];
type TitleFlowAxis = TitleLockupBlueprint["flowAxis"];
type TitleUnitDirection = TitleLockupUnit["direction"];
type TitleUnitAlignment = TitleLockupUnit["alignment"];
type TitleSubtitlePlacementPolicy = TitleLockupBlueprint["subtitleLockup"]["placementPolicy"];
type TitleCollisionStrategy = TitleLockupBlueprint["collisionPolicy"]["strategy"];
type TitleForbiddenZoneConflict = TitleLockupBlueprint["forbiddenZonePolicy"]["onConflict"];

const UNIT_ROLES: readonly TitleCandidateUnitRole[] = ["lead", "main", "accent", "support"];
const UNIT_ROLES_WITH_HERO = ["lead", "hero", "accent", "support"] as const;
const UNIT_DIRECTIONS: readonly TitleCandidateUnitDirection[] = ["horizontal", "vertical"];
const SUBTITLE_PLACEMENTS: readonly TitleCandidateSubtitle["placement"][] = ["below", "side", "verticalSide", "none"];
const EFFECT_INTENTS: readonly TitleCandidateEffectIntent[] = ["stageDepth", "cleanReadable", "chineseSeal", "campaignImpact", "editorialSoft", "playfulBadge"];
const DECORATION_INTENTS: readonly TitleCandidateDecorationIntent[] = ["none", "stageLight", "smallStars", "medalLine", "goldLine", "sealStamp", "paperTag", "bookMark", "campaignLabel", "growthArrow", "colorBlock", "badge", "playfulDot"];
const PATTERN_KEYS = Object.keys(TITLE_REFERENCE_PATTERNS) as TitleReferencePatternKey[];
const COMPOSITION_MODES = Object.keys(TITLE_COMPOSITION_GRAMMAR) as TitleCompositionMode[];
const BLUEPRINT_ORIENTATION_PREFERENCES: readonly BlueprintOrientationPreference[] = ["verticalFirst", "horizontalFirst", "diagonalFirst", "centerFirst", "balanced"];
const TITLE_FLOW_AXES: readonly TitleFlowAxis[] = ["vertical", "horizontal", "diagonal", "centered"];
const TITLE_UNIT_DIRECTIONS: readonly TitleUnitDirection[] = ["horizontal", "vertical", "mixed"];
const TITLE_UNIT_ALIGNMENTS: readonly TitleUnitAlignment[] = ["left", "center", "right", "top", "bottom"];
const SUBTITLE_PLACEMENT_POLICIES: readonly TitleSubtitlePlacementPolicy[] = ["belowMainLockup", "sideOfMainLockup", "secondaryAnchor", "hidden"];
const COLLISION_STRATEGIES: readonly TitleCollisionStrategy[] = ["reject", "moveWithinAnchor", "shrinkWithinAnchor", "scorePenalty"];
const FORBIDDEN_ZONE_CONFLICTS: readonly TitleForbiddenZoneConflict[] = ["reject", "moveWithinAnchor", "shrinkWithinAnchor"];
const MIN_READABLE_VERTICAL_ANCHOR_WIDTH = 320;
const STRUCTURED_OUTPUT_MODE = "json_schema" as const;
const TITLE_LOCKUP_DRAFTS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lockupDrafts"],
  properties: {
    lockupDrafts: {
      type: "array",
      minItems: 6,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "candidateId",
          "unitLayoutHints",
          "reason",
        ],
        properties: {
          candidateId: { type: "string" },
          unitLayoutHints: {
            type: "array",
            minItems: 0,
            maxItems: 6,
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "unitIndex",
                "direction",
                "alignment",
                "boxRatio",
              ],
              properties: {
                unitIndex: { type: "integer", minimum: 0, maximum: 5 },
                direction: { type: "string", enum: TITLE_UNIT_DIRECTIONS },
                alignment: { type: "string", enum: TITLE_UNIT_ALIGNMENTS },
                boxRatio: {
                  type: "object",
                  additionalProperties: false,
                  required: ["x", "y", "width", "height", "rotationDeg"],
                  properties: {
                    x: { type: "number", minimum: 0, maximum: 1 },
                    y: { type: "number", minimum: 0, maximum: 1 },
                    width: { type: "number", minimum: 0, maximum: 1 },
                    height: { type: "number", minimum: 0, maximum: 1 },
                    rotationDeg: { type: "number", minimum: -8, maximum: 8 },
                  },
                },
              },
            },
          },
          reason: { type: "string" },
        },
      },
    },
  },
} as const;

export async function generateTitleCandidates(
  input: GenerateTitleCandidatesInput,
): Promise<GenerateTitleCandidatesResult> {
  const spatialStrategy = await planSpatialStrategy(input);
  const candidatePlan = buildLockupBlueprintCandidatePlan(input.mainTitle, spatialStrategy);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallback(
      input,
      "OPENAI_API_KEY missing; used spatial-strategy fallback candidates.",
      spatialStrategy,
      candidatePlan,
      "unavailable",
    );
  }

  const client = new OpenAI({ apiKey });
  const validationDiagnostics: string[] = [];
  let sawStructuredValidationFailure = false;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await client.chat.completions.create({
        model: MODELS.recommendation,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          {
            role: "user",
            content: [
              { type: "text", text: buildUserPrompt(input, spatialStrategy, candidatePlan) },
              { type: "image_url", image_url: { url: buildImageUrl(input.backgroundImageBase64), detail: "low" } },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "title_lockup_drafts",
            strict: true,
            schema: TITLE_LOCKUP_DRAFTS_JSON_SCHEMA,
          },
        },
        temperature: 0.65,
      });
      const parsedDrafts = parseLockupDraftsWithDiagnostic(
        response.choices[0]?.message?.content,
        input.mainTitle,
        spatialStrategy,
        candidatePlan,
      );

      if (!parsedDrafts.lockupDrafts) {
        sawStructuredValidationFailure = true;
        validationDiagnostics.push(`attempt ${attempt} draft invalid: ${formatDiagnostic(parsedDrafts.diagnostic)}`);
        continue;
      }

      const parsedBlueprints = buildBlueprintsFromDraftsWithDiagnostic(
        input,
        parsedDrafts.lockupDrafts,
        spatialStrategy,
        candidatePlan,
      );

      if (!parsedBlueprints.lockupBlueprints) {
        sawStructuredValidationFailure = true;
        validationDiagnostics.push(`attempt ${attempt} blueprint invalid: ${formatDiagnostic(parsedBlueprints.diagnostic)}`);
        continue;
      }

      const candidates = buildLegacyCandidatesFromBlueprints(
        parsedBlueprints.lockupBlueprints,
        spatialStrategy,
      );

      return {
        source: "ai",
        structuredOutputMode: STRUCTURED_OUTPUT_MODE,
        lockupDraftCount: parsedDrafts.lockupDrafts.length,
        lockupDraftFields: getLockupDraftFields(parsedDrafts.lockupDrafts),
        firstDraftUnitLayoutHints: parsedDrafts.lockupDrafts[0]?.unitLayoutHints ?? [],
        lockupBlueprints: parsedBlueprints.lockupBlueprints,
        candidates,
        reason: "AI generated validated structured lockupDrafts; system completed TitleLockupBlueprints.",
        spatialStrategy,
        titleHierarchyContext: input.titleHierarchyContext,
      };
    } catch (error) {
      validationDiagnostics.push(`attempt ${attempt} request failed: ${errorMessage(error)}`);
    }
  }

  if (sawStructuredValidationFailure) {
    const ruleBasedResult = ruleBasedFromCandidatePlan(
      input,
      `AI title lockup output invalid after retry: ${validationDiagnostics.join(" | ")}; used deterministic candidatePlan title lockups.`,
      spatialStrategy,
      candidatePlan,
      STRUCTURED_OUTPUT_MODE,
    );

    if (ruleBasedResult) return ruleBasedResult;
  }

  return fallback(
    input,
    `AI title lockup output invalid after retry: ${validationDiagnostics.join(" | ")}; used fallback candidates.`,
    spatialStrategy,
    candidatePlan,
    STRUCTURED_OUTPUT_MODE,
  );
}

function buildSystemPrompt(): string {
  return [
    "你是远方智设的 Title Lockup Draft 候选生成器。",
    "你不是排版员，不是模板选择器，不能生成图片。",
    "你不能改写中文标题；不能增字、漏字、改字。",
    "你必须基于 Spatial Strategy、Semantic Splitter、Composition Grammar、candidatePlan 和 reference patterns 生成 exactly 6 个 lockupDrafts，不多不少。",
    "lockupDrafts 是 AI 草案；完整 TitleLockupBlueprint 由系统补全 subtitleLockup、spatialContract、collisionPolicy、forbiddenZonePolicy 和 isFallbackCandidate。",
    "candidatePlan 已经决定 candidateId / spatialAnchorId / semanticSplitId / compositionMode / flowAxis / patternKeys / effectIntent / decorationIntents。",
    "你不能输出 deterministic candidatePlan 字段：spatialAnchorId、semanticSplitId、compositionMode、flowAxis、orientationPreference、patternKeys、effectIntent、decorationIntents。",
    "你只能输出每个 candidate 的 candidateId、unitLayoutHints、reason。",
    "你不能输出 lockupBox；系统会在 spatialAnchor 内生成 lockupBox。",
    "你不能输出 absolute unitBox；系统会把 boxRatio 转成 unitBox。",
    "你不能输出 text、semanticRole、visualRole、readingOrder、allowEmphasis、visualWeight；系统会从 semanticSplit.units 注入。",
    "视觉权重由系统根据 semanticRole 决定，AI 不决定谁是主角。",
    "不要输出 subtitleLockup、spatialContract、collisionPolicy、forbiddenZonePolicy、isFallbackCandidate。",
    "reference patterns 是参考语法，不是固定模板，不能做固定 12 选 1。",
    "每个 lockupDraft 必须严格照 candidatePlan 输出 candidateId，但不要输出其它 plan 字段。",
    "每个 lockupDraft 必须包含 unitLayoutHints。",
    "unitLayoutHints 只通过 unitIndex 绑定 semanticSplit.units，不能改写、增加、删除或重排中文标题文字。",
    "unitLayoutHints.boxRatio 的 x/y/width/height 必须是 0 到 1 的比例值，不是像素坐标，不是 0-1000 坐标。",
    "不要选择 anchor；不要移动 c5/c6 到 secondary anchor；系统会按 candidatePlan 合并 spatialAnchorId。",
    "不要选择 compositionMode；不要选择 semanticSplitId；不要选择 patternKeys。",
    "不要只横排一整行、竖排一整列、整句斜着放。",
    "候选之间必须有明显结构差异。",
    "verticalFirst 表示标题组合体沿竖向空间生长，不等于逐字竖排。",
    "platformCaption 不能作为主标题主锚点。",
    "secondary anchor 默认只能承载副标题或辅助信息，不能默认承载主标题。",
    "unitLayoutHints.direction 只能是：horizontal / vertical / mixed。",
    "unitLayoutHints 不能包含 visualWeight。",
    "如果你想表达“徽章感”，只能在 reason 中解释几何节奏，不要输出 badge 作为字段值。",
    "不要把中文词语切断成无意义字组。拆分必须符合语义词组。",
    "reason 每项控制在 60 个中文字符以内，不要长段解释。",
    "必须只输出 JSON，不要 Markdown，不要解释。",
  ].join("\n");
}

function buildUserPrompt(
  input: GenerateTitleCandidatesInput,
  spatialStrategy: SpatialStrategy,
  candidatePlan: readonly LockupBlueprintCandidatePlanItem[],
): string {
  const patternPool = spatialStrategy.patternPool;
  const primaryAnchor = getTextAnchorById(spatialStrategy, spatialStrategy.primaryTextAnchorId)
    ?? fallbackTextAnchor(spatialStrategy.primaryTextAnchorId);
  const semanticSplits = getSemanticSplitCandidates(input.mainTitle);
  const compositionModes = getAllowedCompositionModes(semanticSplits, spatialStrategy.orientationPreference);
  const examplePlan = candidatePlan[0];
  const exampleDraft = buildExampleLockupDraft(
    input,
    spatialStrategy,
    getTextAnchorById(spatialStrategy, examplePlan.spatialAnchorId) ?? primaryAnchor,
    getSemanticSplitCandidateById(input.mainTitle, examplePlan.semanticSplitId) ?? semanticSplits[0],
    examplePlan,
  );

  return [
    "【梳理模板体系现状Prompt】",
    `mainTitle: ${input.mainTitle}`,
    `subtitle: ${input.subtitle || "未填写"}`,
    `designFamily: ${input.designFamily || "未填写"}`,
    `layoutFamily: ${input.layoutFamily || "未填写"}`,
    `displayPolicy: ${input.displayPolicy || "未填写"}`,
    `productOutputType: ${input.productOutputType || "未填写"}`,
    `eventBrief: ${input.eventBrief || "未填写"}`,
    `styleBrief: ${input.styleBrief || "未填写"}`,
    `visualDetails: ${input.visualDetails || "未填写"}`,
    `avoidNotes: ${input.avoidNotes || "未填写"}`,
    ...titleHierarchyPromptLines(input.titleHierarchyContext),
    "【Spatial Strategy】",
    `contentIntent: ${spatialStrategy.contentIntent}`,
    `strategyMode: ${spatialStrategy.strategyMode}`,
    `orientationPreference: ${spatialStrategy.orientationPreference}`,
    `primaryTextAnchorId: ${spatialStrategy.primaryTextAnchorId}`,
    `secondaryTextAnchorIds: ${spatialStrategy.secondaryTextAnchorIds.join(" / ") || "无"}`,
    `patternPool.primary: ${patternPool.primary.join(" / ")}`,
    `patternPool.secondary: ${patternPool.secondary.join(" / ")}`,
    `patternPool.exploratory: ${patternPool.exploratory.join(" / ")}`,
    `patternPool.disallowed: ${patternPool.disallowed.join(" / ")}`,
    "candidateGuidance:",
    JSON.stringify(spatialStrategy.candidateGuidance, null, 2),
    "forbiddenGuidance:",
    JSON.stringify(spatialStrategy.forbiddenGuidance, null, 2),
    "backgroundLayout.textAnchors:",
    JSON.stringify(spatialStrategy.backgroundLayout.textAnchors, null, 2),
    "backgroundLayout.forbiddenZones:",
    JSON.stringify(spatialStrategy.backgroundLayout.forbiddenZones, null, 2),
    `backgroundLayout.negativeSpaceShape: ${spatialStrategy.backgroundLayout.negativeSpaceShape}`,
    `backgroundLayout.dominantFlow: ${spatialStrategy.backgroundLayout.dominantFlow}`,
    `backgroundLayout.recommendedTitleFlow: ${spatialStrategy.backgroundLayout.recommendedTitleFlow}`,
    "推荐 primary patterns 摘要：",
    JSON.stringify(getReferencePatternSummaries(patternPool.primary), null, 2),
    "可混合 secondary patterns 摘要：",
    JSON.stringify(getReferencePatternSummaries(patternPool.secondary), null, 2),
    "少量 exploratory patterns 摘要：",
    JSON.stringify(getReferencePatternSummaries(patternPool.exploratory), null, 2),
    `禁用 disallowed pattern keys：${patternPool.disallowed.join(" / ")}`,
    "【Candidate Plan】",
    "You must not choose semanticSplitId freely.",
    "You must not choose compositionMode freely.",
    "Use the provided candidatePlan exactly.",
    "candidatePlan defines candidateId / spatialAnchorId / semanticSplitId / compositionMode / flowAxis / patternKeys / effectIntent / decorationIntents.",
    "You must not output those plan fields.",
    "AI only outputs relative geometry hints and reasoning for each candidate: candidateId / unitLayoutHints / reason.",
    "The system will merge your geometry draft with candidatePlan.",
    "You do not output lockupBox.",
    "You do not output absolute unitBox.",
    "You only output unitLayoutHints with unitIndex and boxRatio values from 0 to 1.",
    "You do not output text.",
    "You do not output semanticRole.",
    "You do not output visualRole.",
    "You do not output readingOrder.",
    "You do not output allowEmphasis.",
    "You do not output visualWeight.",
    "The system derives visualWeight from semanticRole.",
    "The system will bind unitIndex to the semantic split units.",
    "The system will inject Chinese text and semantic roles.",
    "You do not decide which unit is hero.",
    "Do not rewrite, add, delete, or reorder Chinese title text.",
    "The system will create lockupBox inside the spatial anchor.",
    "The system will convert boxRatio into unitBox.",
    "Do not use pixel coordinates.",
    "Do not use anchor coordinates.",
    "Do not output x/y values larger than 1.",
    "Do not output width/height values larger than 1.",
    "Do not move c5/c6 to secondary anchor.",
    "Do not choose any anchor.",
    "Do not choose any compositionMode.",
    "Do not choose any semanticSplitId.",
    "Do not choose any patternKeys.",
    "Do not output subtitleLockup / spatialContract / collisionPolicy / forbiddenZonePolicy / isFallbackCandidate. The system will complete them.",
    "reference pattern keys are not composition modes.",
    "literaryMagazineBlock / stageSplitHero / stageMedalTitle / businessLaunchHero are patternKeys, not compositionMode.",
    "compositionMode cannot be literaryMagazineBlock.",
    JSON.stringify(candidatePlan, null, 2),
    "【Semantic Splitter】",
    "只能从以下 semantic split 中选择，不允许自己乱切标题：",
    JSON.stringify(getSemanticSplitSummaries(semanticSplits), null, 2),
    "禁止语义切分：",
    JSON.stringify(TITLE_FORBIDDEN_SEMANTIC_SPLITS, null, 2),
    "【Composition Grammar】",
    "compositionMode 只能从以下 7 个值中选择：verticalHeroStack / splitLeadHero / staggeredColumn / stageMonument / badgeHeroLockup / centerStageLockup / platformCaption。",
    "不能输出其他近义词，尤其不能输出 centerStage / centeredStageLockup / stageCenterLockup / verticalStack / heroStack / badgeLockup。",
    "platformCaption 不能作为主标题主 lockup；本次 mainTitle candidate 不要使用 platformCaption。",
    "本次 achievementShowcase + verticalFirst 优先使用：verticalHeroStack / splitLeadHero / staggeredColumn / stageMonument / centerStageLockup / badgeHeroLockup。",
    "只能从以下 compositionMode 中选择，compositionMode 是组合体语法，不是固定模板：",
    JSON.stringify(getCompositionGrammarSummaries(compositionModes), null, 2),
    "TitleLockupBlueprint 校验规则由系统补全后执行：",
    JSON.stringify(TITLE_LOCKUP_BLUEPRINT_RULES, null, 2),
    "Structured Output JSON 格式：{ \"lockupDrafts\": [LockupDraft...] }。",
    "lockupDrafts 数组长度必须正好是 6。",
    "每个 draft 只能包含 candidateId、unitLayoutHints、reason。",
    "不要输出 mainTitle、lockupBox、titleUnits、titleUnitLayouts、unitBox、text、semanticRole、visualRole、readingOrder、allowEmphasis、visualWeight、spatialAnchorId、semanticSplitId、compositionMode、flowAxis、orientationPreference、patternKeys、effectIntent、decorationIntents、subtitleLockup、spatialContract、collisionPolicy、forbiddenZonePolicy、isFallbackCandidate。",
    "candidateId 必须来自 candidatePlan。",
    "系统会根据 candidatePlan.spatialAnchorId 和 compositionMode 生成 lockupBox，AI 不允许生成或移动 lockupBox。",
    "每个 unitLayoutHint.boxRatio 必须位于 0-1 的局部比例坐标内。",
    "所有 boxRatio 使用 lockupBox 内部相对比例，不是 0-1000 全局归一化坐标。",
    "如果 orientationPreference 是 verticalFirst：至少 4 个 blueprint 必须体现竖向空间组织，但不能逐字竖排；可以用上下错落、lead/hero 分层、stageMonument 或 verticalHeroStack。",
    "patternKeys 不能包含 patternPool.disallowed。",
    "platformCaption 不能作为主标题主锚点。",
    "即使使用 stage/business pattern，也必须沿 verticalColumn 组织字组，不要误改成国风。",
    "reference pattern 是设计语法，不是模板；背景空间策略优先。",
    "candidate 1-4：必须使用 primary patterns，可以 1 个 pattern 或 primary+primary 混合。",
    "candidate 5：可以使用 primary + secondary。",
    "candidate 6：可以使用 secondary 或 exploratory，但不能使用 disallowed。",
    "6 个 lockupBlueprints 中至少 4 个必须只使用 primary patterns，最多 2 个可以使用 secondary patterns，最多 1 个可以使用 exploratory patterns。",
    "禁止使用 disallowed pattern keys。",
    "如果使用 exploratory pattern，必须在 reason 中说明为什么它没有偏题。",
    "不允许为了变化而使用明显不相关的 pattern。",
    "reference pattern 是参考语法，不是模板；候选之间要有结构变化，但必须围绕当前活动目标。",
    "如果 designFamily 是 achievementShowcase：不要使用 modernChineseVerticalSeal，除非 eventBrief 明确是国学/诗词/传统文化。",
    "如果 designFamily 是 achievementShowcase：不要使用 campaignDiagonalImpact，除非 eventBrief 明确是招生/报名/开班提醒。",
    "如果 designFamily 是 achievementShowcase：不要使用 ipPlayfulStack，除非 eventBrief 明确是游园会/IP/轻活动。",
    "成长汇报课优先 stage / business / clean / literary 的成果展示语法。",
    "unitLayoutHints 每项只包含 unitIndex、boxRatio、direction、alignment。",
    "boxRatio 必须包含 x、y、width、height、rotationDeg。",
    "boxRatio.x/y/width/height 必须是 0-1；boxRatio.rotationDeg -8 到 8。",
    "reason 必须说明它如何服从背景空间、语义切分和组合语法，且如何避免固定模板套用。",
    "如果 mainTitle 是“成长汇报课”，优先考虑：成长 / 汇报课、成长 / 汇报 / 课、成长汇报课。",
    "禁止无意义拆分，例如：成长汇 / 报课。",
    "严格字段示例：",
    JSON.stringify({ lockupDrafts: [exampleDraft] }, null, 2),
    "禁止输出：\"spatialAnchorId\": \"anchorTopCenterHorizontal\"",
    "禁止输出：\"compositionMode\": \"centeredStageLockup\"",
    "禁止输出：\"patternKeys\": [\"stageSplitHero\"]",
    "禁止输出：\"lockupBox\": {\"x\": 300, \"y\": 120, \"width\": 400, \"height\": 500}",
    "禁止输出：\"unitBox\": {\"x\": 300, \"y\": 120, \"width\": 200, \"height\": 80}",
    "禁止输出：\"text\": \"成长\"",
    "禁止输出：\"visualRole\": \"hero\"",
    "禁止输出：\"visualWeight\": 6",
    "禁止输出：\"readingOrder\": [\"成长\", \"汇报课\"]",
    "禁止输出：\"semanticRole\": \"badge\"",
    "正确写法：\"unitIndex\": 0",
    "正确写法：只输出 candidateId、unitLayoutHints、reason。",
  ].join("\n");
}

function getReferencePatternSummaries(keys: readonly TitleReferencePatternKey[]): PatternSummary[] {
  return keys.map((key) => {
    const pattern = TITLE_REFERENCE_PATTERNS[key];

    return {
      key,
      label: pattern.label,
      family: pattern.family,
      unitPattern: pattern.unitPattern,
      flexibility: pattern.flexibility,
      candidateRole: pattern.candidateRole,
      canHybridWith: pattern.canHybridWith,
      mutationAllowed: pattern.mutationAllowed,
      promptGuidance: pattern.promptGuidance,
      templateRiskWarning: pattern.templateRiskWarning,
    };
  });
}

function titleHierarchyPromptLines(context: TitleHierarchyContext | undefined): string[] {
  if (!context) return [];
  return [
    "【Title Hierarchy Context】",
    `primaryMessage: ${context.primaryMessage || "none"}`,
    `hookSource: ${context.hookSource}`,
    `mainTitleMismatch: ${context.mainTitleMismatch ? "YES" : "NO"}`,
    `titleHierarchyRisk: ${context.titleHierarchyRisk}`,
    `hierarchyIntent: ${context.hierarchyIntent}`,
    `recommendedSubtitlePriority: ${context.recommendedSubtitlePriority}`,
    `titleEmphasisWords: ${context.titleEmphasisWords?.join(" / ") || "none"}`,
    `allowedVisibleText: ${context.visibleTextPolicy.allowedVisibleText.join(" / ") || "none"}`,
    "primaryMessage is hierarchy guidance only; it is not permission to create new visible title text.",
    "Preserve mainTitle exactly. Preserve subtitle text exactly when subtitle is rendered.",
    "If primaryMessage is not in allowedVisibleText, use it only for semantic rhythm/pattern reasoning and never render it as text.",
    "If primaryMessage appears in subtitle, keep subtitle visually present when spatial safety allows; mainTitle still remains the primary title.",
    ...context.warnings.map((warning) => `hierarchyWarning: ${warning}`),
  ];
}

function getSemanticSplitSummaries(candidates: readonly TitleSemanticSplitCandidate[]): Array<{
  splitId: string;
  label: string;
  units: Array<{
    text: string;
    semanticRole: string;
    visualRoleHint: string;
    importance: number;
  }>;
  readingOrder: string[];
  preferredCompositionModes: TitleCompositionMode[];
  avoidCompositionModes: TitleCompositionMode[];
  reason: string;
  forbiddenSplitWarning: string;
}> {
  return candidates.map((candidate) => ({
    splitId: candidate.splitId,
    label: candidate.label,
    units: candidate.units.map((unit) => ({
      text: unit.text,
      semanticRole: unit.semanticRole,
      visualRoleHint: unit.visualRoleHint,
      importance: unit.importance,
    })),
    readingOrder: candidate.readingOrder,
    preferredCompositionModes: candidate.preferredCompositionModes,
    avoidCompositionModes: candidate.avoidCompositionModes,
    reason: candidate.reason,
    forbiddenSplitWarning: candidate.forbiddenSplitWarning,
  }));
}

function getCompositionGrammarSummaries(modes: readonly TitleCompositionMode[]): Array<{
  mode: TitleCompositionMode;
  label: string;
  flowAxis: string;
  directionPolicy: string;
  subtitlePlacementPolicy: string;
  anchorUsagePolicy: string;
  minUnits: number;
  maxUnits: number;
  promptGuidance: string;
  forbiddenRules: string[];
  templateRiskWarning: string;
}> {
  return modes.map((mode) => {
    const grammar = TITLE_COMPOSITION_GRAMMAR[mode];

    return {
      mode,
      label: grammar.label,
      flowAxis: grammar.flowAxis,
      directionPolicy: grammar.directionPolicy,
      subtitlePlacementPolicy: grammar.subtitlePlacementPolicy,
      anchorUsagePolicy: grammar.anchorUsagePolicy,
      minUnits: grammar.minUnits,
      maxUnits: grammar.maxUnits,
      promptGuidance: grammar.promptGuidance,
      forbiddenRules: grammar.forbiddenRules,
      templateRiskWarning: grammar.templateRiskWarning,
    };
  });
}

function parseLockupBlueprints(
  content: string | null | undefined,
  mainTitle: string,
  spatialStrategy: SpatialStrategy,
  candidatePlan: readonly LockupBlueprintCandidatePlanItem[],
): TitleLockupBlueprint[] | undefined {
  return parseLockupBlueprintsWithDiagnostic(content, mainTitle, spatialStrategy, candidatePlan).lockupBlueprints;
}

function parseLockupBlueprintsWithDiagnostic(
  content: string | null | undefined,
  mainTitle: string,
  spatialStrategy: SpatialStrategy,
  candidatePlan: readonly LockupBlueprintCandidatePlanItem[],
): {
  lockupBlueprints?: TitleLockupBlueprint[];
  diagnostic: LockupBlueprintValidationDiagnostic;
} {
  if (!content) {
    return { diagnostic: { valid: false, reason: "empty model content" } };
  }

  try {
    return validateLockupBlueprintsWithDiagnostic(
      JSON.parse(stripJsonFence(content)),
      mainTitle,
      spatialStrategy,
      candidatePlan,
      rawPreview(content),
    );
  } catch (error) {
    return {
      diagnostic: {
        valid: false,
        reason: `JSON parse failed: ${errorMessage(error)}`,
        rawPreview: rawPreview(content),
      },
    };
  }
}

function parseLockupDraftsWithDiagnostic(
  content: string | null | undefined,
  mainTitle: string,
  spatialStrategy: SpatialStrategy,
  candidatePlan: readonly LockupBlueprintCandidatePlanItem[],
): {
  lockupDrafts?: LockupDraft[];
  diagnostic: LockupDraftValidationDiagnostic;
} {
  if (!content) {
    return { diagnostic: { valid: false, reason: "empty model content" } };
  }

  try {
    return validateLockupDraftsWithDiagnostic(
      JSON.parse(stripJsonFence(content)),
      mainTitle,
      spatialStrategy,
      candidatePlan,
      rawPreview(content),
    );
  } catch (error) {
    return {
      diagnostic: {
        valid: false,
        reason: `JSON parse failed: ${errorMessage(error)}`,
        rawPreview: rawPreview(content),
      },
    };
  }
}

function parseCandidates(
  content: string | null | undefined,
  mainTitle: string,
  spatialStrategy: SpatialStrategy,
): TitleCandidate[] | undefined {
  return parseCandidatesWithDiagnostic(content, mainTitle, spatialStrategy).candidates;
}

function parseCandidatesWithDiagnostic(
  content: string | null | undefined,
  mainTitle: string,
  spatialStrategy: SpatialStrategy,
): {
  candidates?: TitleCandidate[];
  diagnostic: CandidateValidationDiagnostic;
} {
  if (!content) {
    return { diagnostic: { valid: false, reason: "empty model content" } };
  }

  try {
    return validateCandidatesWithDiagnostic(
      JSON.parse(stripJsonFence(content)),
      mainTitle,
      spatialStrategy,
      rawPreview(content),
    );
  } catch (error) {
    return {
      diagnostic: {
        valid: false,
        reason: `JSON parse failed: ${errorMessage(error)}`,
        rawPreview: rawPreview(content),
      },
    };
  }
}

export function validateLockupBlueprints(
  value: unknown,
  mainTitle: string,
  spatialStrategy: SpatialStrategy,
  candidatePlan: readonly LockupBlueprintCandidatePlanItem[],
): TitleLockupBlueprint[] | undefined {
  return validateLockupBlueprintsWithDiagnostic(value, mainTitle, spatialStrategy, candidatePlan).lockupBlueprints;
}

function validateLockupDraftsWithDiagnostic(
  value: unknown,
  mainTitle: string,
  spatialStrategy: SpatialStrategy,
  candidatePlan: readonly LockupBlueprintCandidatePlanItem[],
  preview?: string,
): {
  lockupDrafts?: LockupDraft[];
  diagnostic: LockupDraftValidationDiagnostic;
} {
  if (!isRecord(value)) {
    return draftFailure("root is not object", preview);
  }

  if (!Array.isArray(value.lockupDrafts)) {
    return draftFailure("lockupDrafts missing or not array", preview);
  }

  if (value.lockupDrafts.length !== 6) {
    return draftFailure(`lockupDrafts count must be exactly 6: ${value.lockupDrafts.length}`, preview);
  }

  if (candidatePlan.length < 6) {
    return draftFailure(`candidatePlan count < 6: ${candidatePlan.length}`, preview);
  }

  const normalized = value.lockupDrafts.map((draft, index) => (
    normalizeLockupDraftWithReason(draft, mainTitle, index, spatialStrategy, candidatePlan)
  ));
  const lockupDrafts = normalized
    .map((result) => result.lockupDraft)
    .filter((draft): draft is LockupDraft => Boolean(draft));

  if (lockupDrafts.length < 6) {
    const invalidReasons = normalized
      .filter((result) => !result.lockupDraft)
      .map((result) => result.reason)
      .filter(isNonEmptyString)
      .slice(0, 6)
      .join("; ");

    return draftFailure(
      `valid lockupDrafts after filtering < 6: ${lockupDrafts.length}; ${invalidReasons}`,
      preview,
    );
  }

  const duplicateCandidateId = lockupDrafts
    .map((draft) => draft.candidateId)
    .find((candidateId, index, candidateIds) => candidateIds.indexOf(candidateId) !== index);

  if (duplicateCandidateId) {
    return draftFailure(`duplicate candidateId in lockupDrafts: ${duplicateCandidateId}`, preview);
  }

  const missingPlanIds = candidatePlan
    .map((planItem) => planItem.candidateId)
    .filter((candidateId) => !lockupDrafts.some((draft) => draft.candidateId === candidateId));

  if (missingPlanIds.length > 0) {
    return draftFailure(`lockupDrafts missing candidatePlan ids: ${missingPlanIds.join(",")}`, preview);
  }

  const sortedDrafts = candidatePlan
    .map((planItem) => lockupDrafts.find((draft) => draft.candidateId === planItem.candidateId))
    .filter((draft): draft is LockupDraft => Boolean(draft));

  return {
    lockupDrafts: sortedDrafts,
    diagnostic: { valid: true },
  };
}

function draftFailure(
  reason: string,
  preview?: string,
): {
  diagnostic: LockupDraftValidationDiagnostic;
} {
  return {
    diagnostic: {
      valid: false,
      reason,
      ...(preview ? { rawPreview: preview } : {}),
    },
  };
}

function validateLockupBlueprintsWithDiagnostic(
  value: unknown,
  mainTitle: string,
  spatialStrategy: SpatialStrategy,
  candidatePlan: readonly LockupBlueprintCandidatePlanItem[],
  preview?: string,
): {
  lockupBlueprints?: TitleLockupBlueprint[];
  diagnostic: LockupBlueprintValidationDiagnostic;
} {
  if (!isRecord(value)) {
    return lockupFailure("root is not object", preview);
  }

  if (!Array.isArray(value.lockupBlueprints)) {
    return lockupFailure("lockupBlueprints missing or not array", preview);
  }

  if (value.lockupBlueprints.length < 6) {
    return lockupFailure(`lockupBlueprints count < 6: ${value.lockupBlueprints.length}`, preview);
  }

  if (value.lockupBlueprints.length > 12) {
    return lockupFailure(`lockupBlueprints count > 12: ${value.lockupBlueprints.length}`, preview);
  }

  if (candidatePlan.length < 6) {
    return lockupFailure(`candidatePlan count < 6: ${candidatePlan.length}`, preview);
  }

  const normalized = value.lockupBlueprints.map((blueprint, index) => (
    normalizeLockupBlueprintWithReason(blueprint, mainTitle, index, spatialStrategy, candidatePlan)
  ));
  const lockupBlueprints = normalized
    .map((result) => result.lockupBlueprint)
    .filter((blueprint): blueprint is TitleLockupBlueprint => Boolean(blueprint));

  if (lockupBlueprints.length < 6) {
    const invalidReasons = normalized
      .filter((result) => !result.lockupBlueprint)
      .map((result) => result.reason)
      .filter(isNonEmptyString)
      .slice(0, 6)
      .join("; ");

    return lockupFailure(
      `valid lockupBlueprints after filtering < 6: ${lockupBlueprints.length}; ${invalidReasons}`,
      preview,
    );
  }

  if (
    spatialStrategy.orientationPreference === "verticalFirst" &&
    lockupBlueprints.filter(blueprintUsesVerticalOrganization).length < 4
  ) {
    return lockupFailure(
      `verticalFirst requires at least 4 lockupBlueprints with vertical lockup organization: ${verticalOrganizationSummary(lockupBlueprints)}`,
      preview,
    );
  }

  return {
    lockupBlueprints: lockupBlueprints.slice(0, 12),
    diagnostic: { valid: true },
  };
}

function lockupFailure(
  reason: string,
  preview?: string,
): {
  diagnostic: LockupBlueprintValidationDiagnostic;
} {
  return {
    diagnostic: {
      valid: false,
      reason,
      ...(preview ? { rawPreview: preview } : {}),
    },
  };
}

function normalizeLockupDraftWithReason(
  value: unknown,
  mainTitle: string,
  index: number,
  spatialStrategy: SpatialStrategy,
  candidatePlan: readonly LockupBlueprintCandidatePlanItem[],
): {
  lockupDraft?: LockupDraft;
  reason?: string;
} {
  const label = `lockupDraft ${index + 1}`;

  if (!isRecord(value)) {
    return { reason: `${label} filtered because root is not object` };
  }

  const candidateId = typeof value.candidateId === "string" && value.candidateId.trim()
    ? value.candidateId.trim()
    : `c${index + 1}`;
  const planItem = getCandidatePlanItemById(candidatePlan, candidateId);

  if (!planItem) {
    return { reason: `${label} filtered because candidateId missing from candidatePlan: "${candidateId}"` };
  }

  const anchor = getTextAnchorById(spatialStrategy, planItem.spatialAnchorId);

  if (!anchor) {
    return { reason: `${label} filtered because candidatePlan spatialAnchorId has no textAnchor` };
  }

  const semanticSplit = getSemanticSplitCandidateById(mainTitle, planItem.semanticSplitId);

  if (!semanticSplit) {
    return { reason: `${label} filtered because candidatePlan semanticSplitId invalid` };
  }

  const grammar = TITLE_COMPOSITION_GRAMMAR[planItem.compositionMode];

  if (grammar.anchorUsagePolicy !== "mainTitleAllowed" || planItem.compositionMode === "platformCaption") {
    return { reason: `${label} filtered because compositionMode cannot carry primary main title` };
  }

  const unitLayoutHints = normalizeUnitLayoutHints(value.unitLayoutHints);

  if (!unitLayoutHints) {
    return { reason: `${label} filtered because unitLayoutHints invalid` };
  }

  const lockupBox = createLockupBoxFromPlan(planItem, anchor, grammar, index);
  const titleUnits = buildTitleUnitsFromLayoutHints(
    unitLayoutHints,
    semanticSplit,
    lockupBox,
    grammar.flowAxis,
    planItem.compositionMode,
    toBlueprintOrientationPreference(spatialStrategy.orientationPreference),
    index,
  );

  if (!titleUnits.every((unit) => isUnitBoxInsideLockupBox(unit.unitBox, lockupBox))) {
    return { reason: `${label} filtered because unitLayoutHints converted outside lockupBox` };
  }

  const orderedTitle = titleUnits
    .slice()
    .sort((left, right) => left.readingOrder - right.readingOrder)
    .map((unit) => unit.text)
    .join("");

  if (orderedTitle !== mainTitle) {
    return { reason: `${label} filtered because titleUnits joined by readingOrder !== mainTitle` };
  }

  if (!lockupUnitsMatchSemanticSplit(titleUnits, semanticSplit)) {
    return { reason: `${label} filtered because titleUnits do not match semantic split` };
  }

  if (!heroVisualWeightDominates(titleUnits, false)) {
    return { reason: `${label} filtered because hero visualWeight does not dominate` };
  }

  if (!isNonEmptyString(value.reason)) {
    return { reason: `${label} filtered because reason missing` };
  }

  return {
    lockupDraft: {
      candidateId,
      unitLayoutHints,
      reason: value.reason.trim(),
    },
  };
}

function normalizeLockupBlueprintWithReason(
  value: unknown,
  mainTitle: string,
  index: number,
  spatialStrategy: SpatialStrategy,
  candidatePlan: readonly LockupBlueprintCandidatePlanItem[],
): {
  lockupBlueprint?: TitleLockupBlueprint;
  reason?: string;
} {
  const label = `lockupBlueprint ${index + 1}`;

  if (!isRecord(value)) {
    return { reason: `${label} filtered because root is not object` };
  }

  const candidateId = typeof value.candidateId === "string" && value.candidateId.trim()
    ? value.candidateId.trim()
    : `c${index + 1}`;
  const spatialAnchorId = typeof value.spatialAnchorId === "string" ? value.spatialAnchorId.trim() : "";
  const semanticSplitId = typeof value.semanticSplitId === "string" ? value.semanticSplitId.trim() : "";
  const patternKeys = normalizePatternKeys(value.patternKeys);
  const planItem = candidatePlan[index];

  if (!planItem) {
    return { reason: `${label} filtered because candidatePlan missing` };
  }

  const planMismatch = getCandidatePlanMismatch(value, candidateId, spatialAnchorId, semanticSplitId, patternKeys, planItem);

  if (planMismatch) {
    return { reason: `${label} filtered because ${planMismatch}` };
  }

  if (!isAllowedSpatialAnchorId(spatialStrategy, spatialAnchorId)) {
    return { reason: `${label} filtered because spatialAnchorId invalid` };
  }

  if (index < 4 && spatialAnchorId !== spatialStrategy.primaryTextAnchorId) {
    return { reason: `${label} filtered because candidate 1-4 must use primaryTextAnchorId` };
  }

  const anchor = getTextAnchorById(spatialStrategy, spatialAnchorId);

  if (!anchor) {
    return { reason: `${label} filtered because spatialAnchorId has no textAnchor` };
  }

  if (!patternKeys) {
    return { reason: `${label} filtered because patternKeys invalid` };
  }

  if (!matchesCandidatePatternSelection(patternKeys, index, spatialStrategy.patternPool)) {
    return { reason: `${label} filtered because patternKeys invalid for selected pool` };
  }

  if (value.mainTitle !== mainTitle) {
    return { reason: `${label} filtered because mainTitle mismatches input` };
  }

  const semanticSplit = getSemanticSplitCandidateById(mainTitle, semanticSplitId);

  if (!semanticSplit) {
    return { reason: `${label} filtered because semanticSplitId invalid` };
  }

  if (!isOneOf(value.compositionMode, COMPOSITION_MODES)) {
    return { reason: `${label} filtered because compositionMode invalid: ${formatUnknownValue(value.compositionMode)}` };
  }

  const compositionMode = value.compositionMode;
  const grammar = TITLE_COMPOSITION_GRAMMAR[compositionMode];

  if (grammar.anchorUsagePolicy !== "mainTitleAllowed" || compositionMode === "platformCaption") {
    return { reason: `${label} filtered because compositionMode cannot carry primary main title` };
  }

  if (
    !semanticSplit.preferredCompositionModes.includes(compositionMode) &&
    !isPlanCompositionMode(planItem, semanticSplitId, compositionMode)
  ) {
    return { reason: `${label} filtered because compositionMode "${compositionMode}" is not allowed by semanticSplitId "${semanticSplitId}"` };
  }

  if (
    semanticSplit.avoidCompositionModes.includes(compositionMode) &&
    !isPlanCompositionMode(planItem, semanticSplitId, compositionMode)
  ) {
    return { reason: `${label} filtered because compositionMode "${compositionMode}" is forbidden by semanticSplitId "${semanticSplitId}"` };
  }

  if (value.flowAxis !== grammar.flowAxis) {
    return { reason: `${label} filtered because flowAxis mismatches composition grammar` };
  }

  const orientationPreference = toBlueprintOrientationPreference(spatialStrategy.orientationPreference);

  if (value.orientationPreference !== orientationPreference) {
    return { reason: `${label} filtered because orientationPreference mismatches spatialStrategy` };
  }

  const lockupBox = normalizeLockupBox(value.lockupBox);

  if (!lockupBox) {
    return { reason: `${label} filtered because lockupBox invalid` };
  }

  if (!isLockupBoxInsideAnchor(lockupBox, anchor)) {
    return { reason: `${label} filtered because lockupBox outside spatialAnchor` };
  }

  const titleUnits = normalizeLockupUnits(value.titleUnits, lockupBox, semanticSplit);

  if (!titleUnits) {
    return { reason: `${label} filtered because titleUnits invalid` };
  }

  const orderedTitle = titleUnits
    .slice()
    .sort((left, right) => left.readingOrder - right.readingOrder)
    .map((unit) => unit.text)
    .join("");

  if (orderedTitle !== mainTitle) {
    return { reason: `${label} filtered because titleUnits joined by readingOrder !== mainTitle` };
  }

  const readingOrder = normalizeReadingOrder(value.readingOrder, mainTitle);

  if (!readingOrder) {
    return { reason: `${label} filtered because readingOrder invalid` };
  }

  if (!lockupUnitsMatchSemanticSplit(titleUnits, semanticSplit)) {
    return { reason: `${label} filtered because titleUnits do not match semantic split` };
  }

  if (!heroVisualWeightDominates(titleUnits, Boolean(value.isFallbackCandidate))) {
    return { reason: `${label} filtered because hero visualWeight does not dominate` };
  }

  if (!isOneOf(value.effectIntent, EFFECT_INTENTS)) {
    return { reason: `${label} filtered because effectIntent invalid` };
  }

  const decorationIntents = normalizeDecorationIntents(value.decorationIntents);

  if (!decorationIntents) {
    return { reason: `${label} filtered because decorationIntents invalid` };
  }

  const collisionPolicy = normalizeCollisionPolicy(value.collisionPolicy);
  const forbiddenZonePolicy = normalizeForbiddenZonePolicy(value.forbiddenZonePolicy, spatialStrategy);

  if (!collisionPolicy) {
    return { reason: `${label} filtered because collisionPolicy invalid` };
  }

  if (!forbiddenZonePolicy) {
    return { reason: `${label} filtered because forbiddenZonePolicy invalid` };
  }

  const spatialContract = normalizeSpatialContract(
    value.spatialContract,
    spatialAnchorId,
    anchor,
    lockupBox,
    grammar.flowAxis,
    spatialStrategy,
  );

  if (!spatialContract) {
    return { reason: `${label} filtered because spatialContract invalid` };
  }

  const subtitleLockup = normalizeSubtitleLockup(
    value.subtitleLockup,
    inputSubtitleText(value),
    lockupBox,
    anchor,
    titleUnits,
  );

  if (!subtitleLockup) {
    return { reason: `${label} filtered because subtitleLockup invalid` };
  }

  if (!isNonEmptyString(value.reason)) {
    return { reason: `${label} filtered because reason missing` };
  }

  return {
    lockupBlueprint: {
      candidateId,
      spatialAnchorId,
      semanticSplitId,
      mainTitle,
      compositionMode,
      flowAxis: grammar.flowAxis,
      orientationPreference,
      patternKeys,
      effectIntent: value.effectIntent,
      decorationIntents,
      spatialContract,
      lockupBox,
      titleUnits,
      subtitleLockup,
      collisionPolicy,
      forbiddenZonePolicy,
      readingOrder,
      isFallbackCandidate: Boolean(value.isFallbackCandidate),
      reason: value.reason.trim(),
    },
  };
}

function inputSubtitleText(value: Record<string, unknown>): string {
  const subtitleLockup = value.subtitleLockup;

  if (isRecord(subtitleLockup) && typeof subtitleLockup.text === "string") {
    return subtitleLockup.text;
  }

  return "";
}

function getCandidatePlanItemById(
  candidatePlan: readonly LockupBlueprintCandidatePlanItem[],
  candidateId: string,
): LockupBlueprintCandidatePlanItem | undefined {
  return candidatePlan.find((planItem) => planItem.candidateId === candidateId);
}

function getCandidatePlanMismatch(
  value: Record<string, unknown>,
  candidateId: string,
  spatialAnchorId: string,
  semanticSplitId: string,
  patternKeys: TitleReferencePatternKey[] | undefined,
  planItem: LockupBlueprintCandidatePlanItem,
): string | undefined {
  if (candidateId !== planItem.candidateId) {
    return `candidatePlan mismatch: expected candidateId "${planItem.candidateId}", got "${candidateId}"`;
  }

  if (semanticSplitId !== planItem.semanticSplitId) {
    return `candidatePlan mismatch: expected semanticSplitId "${planItem.semanticSplitId}", got "${semanticSplitId}"`;
  }

  if (value.compositionMode !== planItem.compositionMode) {
    const invalidSuffix = isOneOf(value.compositionMode, COMPOSITION_MODES)
      ? ""
      : `; compositionMode invalid: ${formatUnknownValue(value.compositionMode)}`;

    return `candidatePlan mismatch: expected compositionMode "${planItem.compositionMode}", got ${formatUnknownValue(value.compositionMode)}${invalidSuffix}`;
  }

  if (value.flowAxis !== planItem.flowAxis) {
    return `candidatePlan mismatch: expected flowAxis "${planItem.flowAxis}", got ${formatUnknownValue(value.flowAxis)}`;
  }

  if (spatialAnchorId !== planItem.spatialAnchorId) {
    return `candidatePlan mismatch: expected spatialAnchorId "${planItem.spatialAnchorId}", got "${spatialAnchorId}"`;
  }

  if (!patternKeys) {
    return undefined;
  }

  const missingPatternKeys = planItem.patternKeys.filter((patternKey) => !patternKeys.includes(patternKey));

  return missingPatternKeys.length > 0
    ? `candidatePlan mismatch: patternKeys missing ${missingPatternKeys.join(",")}`
    : undefined;
}

function isPlanCompositionMode(
  planItem: LockupBlueprintCandidatePlanItem,
  semanticSplitId: string,
  compositionMode: TitleCompositionMode,
): boolean {
  return (
    planItem.semanticSplitId === semanticSplitId &&
    planItem.compositionMode === compositionMode
  );
}

function normalizeUnitLayoutHints(
  value: unknown,
): TitleLockupDraftUnitLayoutHint[] | undefined {
  if (!Array.isArray(value) || value.length > 6) {
    return undefined;
  }

  return value
    .map((hint) => normalizeUnitLayoutHint(hint))
    .filter((hint): hint is TitleLockupDraftUnitLayoutHint => Boolean(hint));
}

function normalizeUnitLayoutHint(value: unknown): TitleLockupDraftUnitLayoutHint | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const unitIndex = value.unitIndex;

  if (!isFiniteNumber(unitIndex) || !Number.isInteger(unitIndex) || unitIndex < 0) {
    return undefined;
  }

  const boxRatio = normalizeBoxRatio(value.boxRatio);

  if (
    !boxRatio ||
    !isOneOf(value.direction, TITLE_UNIT_DIRECTIONS) ||
    !isOneOf(value.alignment, TITLE_UNIT_ALIGNMENTS)
  ) {
    return undefined;
  }

  return {
    unitIndex,
    direction: value.direction,
    alignment: value.alignment,
    boxRatio,
  };
}

function normalizeBoxRatio(value: unknown): TitleLockupDraftBoxRatio | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const { x, y, width, height, rotationDeg } = value;

  if (
    !isRatioCoordinate(x) ||
    !isRatioCoordinate(y) ||
    !isRatioSize(width) ||
    !isRatioSize(height) ||
    x + width > 1 ||
    y + height > 1 ||
    !isFiniteNumber(rotationDeg) ||
    rotationDeg < -8 ||
    rotationDeg > 8
  ) {
    return undefined;
  }

  return { x, y, width, height, rotationDeg };
}

function normalizeLockupUnits(
  value: unknown,
  lockupBox: TitleLockupBox,
  semanticSplit: TitleSemanticSplitCandidate,
): TitleLockupUnit[] | undefined {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6) {
    return undefined;
  }

  if (value.length !== semanticSplit.units.length) {
    return undefined;
  }

  const units = value.map((unit) => normalizeLockupUnit(unit, lockupBox));

  return units.every(Boolean) ? units as TitleLockupUnit[] : undefined;
}

function normalizeLockupUnit(
  value: unknown,
  lockupBox: TitleLockupBox,
): TitleLockupUnit | undefined {
  if (!isRecord(value) || !isNonEmptyString(value.text)) {
    return undefined;
  }

  const unitBox = normalizeUnitBox(value.unitBox);

  if (
    !unitBox ||
    !isOneOf(value.semanticRole, UNIT_ROLES_WITH_HERO) ||
    !isOneOf(value.visualRole, UNIT_ROLES_WITH_HERO) ||
    !isOneOf(value.direction, TITLE_UNIT_DIRECTIONS) ||
    !isOneOf(value.alignment, TITLE_UNIT_ALIGNMENTS) ||
    !isVisualWeight(value.visualWeight) ||
    !isReadingOrder(value.readingOrder) ||
    typeof value.allowEmphasis !== "boolean" ||
    !isUnitBoxInsideLockupBox(unitBox, lockupBox)
  ) {
    return undefined;
  }

  return {
    text: value.text.trim(),
    semanticRole: value.semanticRole,
    visualRole: value.visualRole,
    unitBox,
    direction: value.direction,
    visualWeight: value.visualWeight,
    alignment: value.alignment,
    readingOrder: value.readingOrder,
    allowEmphasis: value.allowEmphasis,
  };
}

function normalizeLockupBox(value: unknown): TitleLockupBox | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const safePadding = value.safePadding;
  const allowedOverflowPx = value.allowedOverflowPx;

  if (!isTitleBox(value)) {
    return undefined;
  }

  if (!isFiniteNumber(safePadding) || safePadding < 0 || safePadding > 120) {
    return undefined;
  }

  if (!isFiniteNumber(allowedOverflowPx) || allowedOverflowPx < 0 || allowedOverflowPx > 80) {
    return undefined;
  }

  return {
    x: value.x,
    y: value.y,
    width: value.width,
    height: value.height,
    safePadding,
    allowedOverflowPx,
  };
}

function normalizeUnitBox(value: unknown): TitleUnitBox | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const maxWidth = value.maxWidth;
  const maxHeight = value.maxHeight;
  const rotationDeg = value.rotationDeg;

  if (!isTitleBox(value)) {
    return undefined;
  }

  if (
    !isFiniteNumber(maxWidth) ||
    !isFiniteNumber(maxHeight) ||
    maxWidth < value.width ||
    maxHeight < value.height ||
    !isRotation(rotationDeg)
  ) {
    return undefined;
  }

  return {
    x: value.x,
    y: value.y,
    width: value.width,
    height: value.height,
    maxWidth,
    maxHeight,
    rotationDeg,
  };
}

function normalizeSubtitleLockup(
  value: unknown,
  _subtitleText: string,
  lockupBox: TitleLockupBox,
  anchor: TextAnchor,
  titleUnits: readonly TitleLockupUnit[],
): TitleLockupBlueprint["subtitleLockup"] | undefined {
  if (!isRecord(value) || typeof value.text !== "string") {
    return undefined;
  }

  if (
    !isOneOf(value.placementPolicy, SUBTITLE_PLACEMENT_POLICIES) ||
    !isReadingOrder(value.readingOrder)
  ) {
    return undefined;
  }

  if (value.placementPolicy === "hidden") {
    if (!isFiniteNumber(value.visualWeight) || value.visualWeight < 0 || value.visualWeight > 10) {
      return undefined;
    }

    return {
      text: value.text,
      placementPolicy: value.placementPolicy,
      subtitleBox: null,
      visualWeight: value.visualWeight,
      readingOrder: value.readingOrder,
    };
  }

  if (!isVisualWeight(value.visualWeight)) {
    return undefined;
  }

  const subtitleBox = normalizeUnitBox(value.subtitleBox);

  if (!subtitleBox) {
    return undefined;
  }

  if (!isSubtitleBoxSafe(subtitleBox, titleUnits, value.placementPolicy)) {
    return undefined;
  }

  if (
    value.placementPolicy !== "secondaryAnchor" &&
    !isUnitBoxInsideLockupBox(subtitleBox, lockupBox) &&
    !isUnitBoxInsideAnchor(subtitleBox, anchor)
  ) {
    return undefined;
  }

  return {
    text: value.text,
    placementPolicy: value.placementPolicy,
    subtitleBox,
    visualWeight: value.visualWeight,
    readingOrder: value.readingOrder,
  };
}

function normalizeCollisionPolicy(value: unknown): TitleLockupBlueprint["collisionPolicy"] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (
    !isOneOf(value.strategy, COLLISION_STRATEGIES) ||
    !isFiniteNumber(value.minGapPx) ||
    value.minGapPx < 0 ||
    value.minGapPx > 120 ||
    typeof value.avoidLogo !== "boolean" ||
    typeof value.avoidMascot !== "boolean" ||
    typeof value.avoidMainSubject !== "boolean"
  ) {
    return undefined;
  }

  return {
    strategy: value.strategy,
    minGapPx: value.minGapPx,
    avoidLogo: value.avoidLogo,
    avoidMascot: value.avoidMascot,
    avoidMainSubject: value.avoidMainSubject,
  };
}

function normalizeForbiddenZonePolicy(
  value: unknown,
  spatialStrategy: SpatialStrategy,
): TitleLockupBlueprint["forbiddenZonePolicy"] | undefined {
  if (!isRecord(value) || !Array.isArray(value.forbiddenZoneIds)) {
    return undefined;
  }

  const knownIds = spatialStrategy.backgroundLayout.forbiddenZones.map((zone) => zone.id);

  if (
    value.allowOverlap !== false ||
    !isOneOf(value.onConflict, FORBIDDEN_ZONE_CONFLICTS) ||
    !value.forbiddenZoneIds.every((id) => typeof id === "string" && knownIds.includes(id))
  ) {
    return undefined;
  }

  const forbiddenZoneIds = value.forbiddenZoneIds.filter((id): id is string => typeof id === "string");

  return {
    forbiddenZoneIds,
    allowOverlap: false,
    onConflict: value.onConflict,
  };
}

function normalizeSpatialContract(
  value: unknown,
  spatialAnchorId: string,
  anchor: TextAnchor,
  lockupBox: TitleLockupBox,
  flowAxis: TitleFlowAxis,
  spatialStrategy: SpatialStrategy,
): TitleLockupBlueprint["spatialContract"] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const anchorBox = normalizeTitleBox(value.anchorBox);
  const contractLockupBox = normalizeLockupBox(value.lockupBox);
  const collisionPolicy = normalizeCollisionPolicy(value.collisionPolicy);
  const forbiddenZonePolicy = normalizeForbiddenZonePolicy(value.forbiddenZonePolicy, spatialStrategy);

  if (
    value.spatialAnchorId !== spatialAnchorId ||
    !anchorBox ||
    !contractLockupBox ||
    !collisionPolicy ||
    !forbiddenZonePolicy ||
    value.flowAxis !== flowAxis ||
    value.secondaryAnchorDefaultUsage !== "subtitleOrAuxiliaryOnly" ||
    !Array.isArray(value.notes) ||
    !value.notes.every((note) => typeof note === "string") ||
    !titleBoxesMatch(anchorBox, anchor) ||
    !lockupBoxesMatch(contractLockupBox, lockupBox)
  ) {
    return undefined;
  }

  return {
    spatialAnchorId,
    anchorBox,
    lockupBox: contractLockupBox,
    flowAxis,
    secondaryAnchorDefaultUsage: "subtitleOrAuxiliaryOnly",
    collisionPolicy,
    forbiddenZonePolicy,
    notes: value.notes,
  };
}

function normalizeTitleBox(value: unknown): TitleLockupBlueprint["spatialContract"]["anchorBox"] | undefined {
  return isRecord(value) && isTitleBox(value)
    ? {
        x: value.x,
        y: value.y,
        width: value.width,
        height: value.height,
    }
    : undefined;
}

function isTitleBox(value: Record<string, unknown>): value is {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return (
    isCoordinate(value.x) &&
    isCoordinate(value.y) &&
    isFiniteNumber(value.width) &&
    isFiniteNumber(value.height) &&
    value.width > 20 &&
    value.height > 20 &&
    value.x + value.width <= 1000 &&
    value.y + value.height <= 1000
  );
}

function isLockupBoxInsideAnchor(lockupBox: TitleLockupBox, anchor: TextAnchor): boolean {
  const overflow = Math.min(10, lockupBox.allowedOverflowPx / 10);

  return (
    lockupBox.x >= anchor.x - overflow &&
    lockupBox.y >= anchor.y - overflow &&
    lockupBox.x + lockupBox.width <= anchor.x + anchor.width + overflow &&
    lockupBox.y + lockupBox.height <= anchor.y + anchor.height + overflow
  );
}

function isUnitBoxInsideLockupBox(unitBox: TitleUnitBox, lockupBox: TitleLockupBox): boolean {
  const overflow = Math.min(10, lockupBox.allowedOverflowPx / 10);

  return (
    unitBox.x >= lockupBox.x - overflow &&
    unitBox.y >= lockupBox.y - overflow &&
    unitBox.x + unitBox.width <= lockupBox.x + lockupBox.width + overflow &&
    unitBox.y + unitBox.height <= lockupBox.y + lockupBox.height + overflow
  );
}

function isUnitBoxInsideAnchor(unitBox: TitleUnitBox, anchor: TextAnchor): boolean {
  return (
    unitBox.x >= anchor.x &&
    unitBox.y >= anchor.y &&
    unitBox.x + unitBox.width <= anchor.x + anchor.width &&
    unitBox.y + unitBox.height <= anchor.y + anchor.height
  );
}

function isSubtitleBoxSafe(
  subtitleBox: TitleUnitBox,
  titleUnits: readonly TitleLockupUnit[],
  placementPolicy: TitleSubtitlePlacementPolicy,
): boolean {
  if (titleUnits.some((unit) => boxOverlapRatio(subtitleBox, unit.unitBox) > 0.01)) {
    return false;
  }

  const minTitleX = Math.min(...titleUnits.map((unit) => unit.unitBox.x));
  const maxTitleX = Math.max(...titleUnits.map((unit) => unit.unitBox.x + unit.unitBox.width));
  const maxTitleBottom = Math.max(...titleUnits.map((unit) => unit.unitBox.y + unit.unitBox.height));
  const isBesideTitle = subtitleBox.x + subtitleBox.width <= minTitleX - 8 || subtitleBox.x >= maxTitleX + 8;

  return placementPolicy === "sideOfMainLockup"
    ? isBesideTitle || subtitleBox.y >= maxTitleBottom + 8
    : subtitleBox.y >= maxTitleBottom + 8;
}

function boxOverlapRatio(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
): number {
  const width = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x));
  const height = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));

  return width * height / Math.max(1, Math.min(left.width * left.height, right.width * right.height));
}

function titleBoxesMatch(
  box: TitleLockupBlueprint["spatialContract"]["anchorBox"],
  anchor: TextAnchor,
): boolean {
  return (
    Math.round(box.x) === Math.round(anchor.x) &&
    Math.round(box.y) === Math.round(anchor.y) &&
    Math.round(box.width) === Math.round(anchor.width) &&
    Math.round(box.height) === Math.round(anchor.height)
  );
}

function lockupBoxesMatch(left: TitleLockupBox, right: TitleLockupBox): boolean {
  return (
    Math.round(left.x) === Math.round(right.x) &&
    Math.round(left.y) === Math.round(right.y) &&
    Math.round(left.width) === Math.round(right.width) &&
    Math.round(left.height) === Math.round(right.height) &&
    Math.round(left.safePadding) === Math.round(right.safePadding) &&
    Math.round(left.allowedOverflowPx) === Math.round(right.allowedOverflowPx)
  );
}

function lockupUnitsMatchSemanticSplit(
  titleUnits: TitleLockupUnit[],
  semanticSplit: TitleSemanticSplitCandidate,
): boolean {
  const orderedUnits = titleUnits.slice().sort((left, right) => left.readingOrder - right.readingOrder);

  return (
    orderedUnits.length === semanticSplit.units.length &&
    orderedUnits.every((unit, index) => (
      unit.text === semanticSplit.units[index]?.text &&
      unit.semanticRole === semanticSplit.units[index]?.semanticRole &&
      unit.visualRole === semanticSplit.units[index]?.visualRoleHint
    ))
  );
}

function heroVisualWeightDominates(
  titleUnits: TitleLockupUnit[],
  isFallbackCandidate: boolean,
): boolean {
  if (isFallbackCandidate) {
    return true;
  }

  const heroWeights = titleUnits
    .filter((unit) => unit.visualRole === "hero")
    .map((unit) => unit.visualWeight);

  if (heroWeights.length === 0) {
    return false;
  }

  const maxHeroWeight = Math.max(...heroWeights);
  const maxOtherWeight = Math.max(
    0,
    ...titleUnits
      .filter((unit) => unit.visualRole !== "hero")
      .map((unit) => unit.visualWeight),
  );

  return maxHeroWeight > maxOtherWeight;
}

function blueprintUsesVerticalOrganization(blueprint: TitleLockupBlueprint): boolean {
  if (blueprint.flowAxis === "vertical") {
    return true;
  }

  if (blueprint.compositionMode === "verticalHeroStack" || blueprint.compositionMode === "staggeredColumn") {
    return true;
  }

  if (blueprint.titleUnits.some((unit) => unit.direction === "vertical")) {
    return true;
  }

  if (blueprint.titleUnits.length < 2) {
    return false;
  }

  const ySpan = getBlueprintUnitYSpan(blueprint);
  const aspect = getBlueprintLockupBoxAspect(blueprint);
  const spanThreshold = Math.max(40, Math.min(120, blueprint.lockupBox.height * 0.22));

  if (
    blueprint.orientationPreference === "verticalFirst" &&
    (blueprint.compositionMode === "centerStageLockup" || blueprint.compositionMode === "badgeHeroLockup") &&
    ySpan >= spanThreshold
  ) {
    return true;
  }

  if (aspect > 1.15 && ySpan >= spanThreshold) {
    return true;
  }

  return ySpan >= 80;
}

function getBlueprintUnitYSpan(blueprint: TitleLockupBlueprint): number {
  if (blueprint.titleUnits.length < 2) {
    return 0;
  }

  const yCenters = blueprint.titleUnits.map((unit) => unit.unitBox.y + unit.unitBox.height / 2);

  return Math.round(Math.max(...yCenters) - Math.min(...yCenters));
}

function getBlueprintLockupBoxAspect(blueprint: TitleLockupBlueprint): number {
  return Number((blueprint.lockupBox.height / Math.max(1, blueprint.lockupBox.width)).toFixed(2));
}

function verticalOrganizationSummary(blueprints: readonly TitleLockupBlueprint[]): string {
  return blueprints.map((blueprint) => [
    blueprint.candidateId,
    blueprint.compositionMode,
    blueprint.flowAxis,
    `flag=${blueprintUsesVerticalOrganization(blueprint)}`,
    `aspect=${getBlueprintLockupBoxAspect(blueprint)}`,
    `ySpan=${getBlueprintUnitYSpan(blueprint)}`,
  ].join(":")).join(" | ");
}

function toBlueprintOrientationPreference(
  orientationPreference: TitleOrientationPreference,
): BlueprintOrientationPreference {
  if (orientationPreference === "verticalFirst") return "verticalFirst";
  if (orientationPreference === "horizontalFirst") return "horizontalFirst";
  if (orientationPreference === "diagonalAllowed") return "diagonalFirst";
  return "balanced";
}

export function validateCandidates(
  value: unknown,
  mainTitle: string,
  spatialStrategy: SpatialStrategy,
): TitleCandidate[] | undefined {
  return validateCandidatesWithDiagnostic(value, mainTitle, spatialStrategy).candidates;
}

function validateCandidatesWithDiagnostic(
  value: unknown,
  mainTitle: string,
  spatialStrategy: SpatialStrategy,
  preview?: string,
): {
  candidates?: TitleCandidate[];
  diagnostic: CandidateValidationDiagnostic;
} {
  if (!isRecord(value)) {
    return failure("root is not object", preview);
  }

  if (!Array.isArray(value.candidates)) {
    return failure("candidates missing or not array", preview);
  }

  if (value.candidates.length < 6) {
    return failure(`candidates count < 6: ${value.candidates.length}`, preview);
  }

  if (value.candidates.length > 12) {
    return failure(`candidates count > 12: ${value.candidates.length}`, preview);
  }

  const normalized = value.candidates.map((candidate, index) => normalizeCandidateWithReason(candidate, mainTitle, index, spatialStrategy));
  const candidates = normalized
    .map((result) => result.candidate)
    .filter((candidate): candidate is TitleCandidate => Boolean(candidate));

  if (candidates.length < 6) {
    const invalidReasons = normalized
      .filter((result) => !result.candidate)
      .map((result) => result.reason)
      .filter(isNonEmptyString)
      .slice(0, 6)
      .join("; ");

    return failure(
      `valid candidates after filtering < 6: ${candidates.length}; ${invalidReasons}`,
      preview,
    );
  }

  if (
    spatialStrategy.orientationPreference === "verticalFirst" &&
    candidates.filter(candidateUsesVerticalOrganization).length < 4
  ) {
    return failure("verticalFirst requires at least 4 candidates with vertical organization", preview);
  }

  return {
    candidates: candidates.slice(0, 12),
    diagnostic: { valid: true },
  };
}

function failure(
  reason: string,
  preview?: string,
): {
  diagnostic: CandidateValidationDiagnostic;
} {
  return {
    diagnostic: {
      valid: false,
      reason,
      ...(preview ? { rawPreview: preview } : {}),
    },
  };
}

function normalizeCandidate(
  value: unknown,
  mainTitle: string,
  index: number,
  spatialStrategy: SpatialStrategy,
): TitleCandidate | undefined {
  return normalizeCandidateWithReason(value, mainTitle, index, spatialStrategy).candidate;
}

function normalizeCandidateWithReason(
  value: unknown,
  mainTitle: string,
  index: number,
  spatialStrategy: SpatialStrategy,
): {
  candidate?: TitleCandidate;
  reason?: string;
} {
  const label = `candidate ${index + 1}`;

  if (!isRecord(value)) {
    return { reason: `${label} filtered because root is not object` };
  }

  const patternKeys = normalizePatternKeys(value.patternKeys);
  const titleUnits = normalizeTitleUnits(value.titleUnits);
  const candidateId = typeof value.candidateId === "string" && value.candidateId.trim()
    ? value.candidateId.trim()
    : `c${index + 1}`;
  const spatialAnchorId = typeof value.spatialAnchorId === "string" ? value.spatialAnchorId.trim() : "";

  if (!patternKeys) {
    return { reason: `${label} filtered because patternKeys invalid` };
  }

  if (!matchesCandidatePatternSelection(patternKeys, index, spatialStrategy.patternPool)) {
    return { reason: `${label} filtered because patternKeys invalid for selected pool` };
  }

  if (!isAllowedSpatialAnchorId(spatialStrategy, spatialAnchorId)) {
    return { reason: `${label} filtered because spatialAnchorId invalid` };
  }

  if (index < 4 && spatialAnchorId !== spatialStrategy.primaryTextAnchorId) {
    return { reason: `${label} filtered because candidate 1-4 must use primaryTextAnchorId` };
  }

  if (value.strategyMode !== spatialStrategy.strategyMode) {
    return { reason: `${label} filtered because strategyMode mismatches spatialStrategy` };
  }

  if (value.orientationPreference !== spatialStrategy.orientationPreference) {
    return { reason: `${label} filtered because orientationPreference mismatches spatialStrategy` };
  }

  if (!titleUnits) {
    return { reason: `${label} filtered because titleUnits invalid` };
  }

  const anchor = getTextAnchorById(spatialStrategy, spatialAnchorId);

  if (!anchor) {
    return { reason: `${label} filtered because spatialAnchorId has no textAnchor` };
  }

  if (titleUnits.some((unit) => !isPointInsideAnchorBox(unit.x, unit.y, anchor))) {
    return { reason: `${label} filtered because titleUnits outside spatialAnchor box` };
  }

  const joinedTitle = titleUnits.map((unit) => unit.text).join("");

  if (joinedTitle !== mainTitle) {
    return {
      reason: `${label} filtered because titleUnits joined text !== mainTitle: "${joinedTitle}" !== "${mainTitle}"`,
    };
  }

  if (!isOneOf(value.effectIntent, EFFECT_INTENTS)) {
    return { reason: `${label} filtered because effectIntent invalid` };
  }

  if (
    !Array.isArray(value.decorationIntents) ||
    !value.decorationIntents.every((item) => isOneOf(item, DECORATION_INTENTS))
  ) {
    return { reason: `${label} filtered because decorationIntents invalid` };
  }

  if (
    !isNonEmptyString(value.hybridStrategy) ||
    !isNonEmptyString(value.readabilityPlan) ||
    !isNonEmptyString(value.backgroundFitReason) ||
    !isNonEmptyString(value.whyNotTemplate)
  ) {
    return { reason: `${label} filtered because required text fields missing` };
  }

  const subtitle = normalizeSubtitle(value.subtitle);

  return {
    candidate: {
      candidateId,
      spatialAnchorId,
      strategyMode: spatialStrategy.strategyMode,
      orientationPreference: spatialStrategy.orientationPreference,
      patternKeys,
      hybridStrategy: value.hybridStrategy.trim(),
      titleUnits,
      ...(subtitle ? { subtitle } : {}),
      effectIntent: value.effectIntent,
      decorationIntents: value.decorationIntents,
      readabilityPlan: value.readabilityPlan.trim(),
      backgroundFitReason: value.backgroundFitReason.trim(),
      whyNotTemplate: value.whyNotTemplate.trim(),
    },
  };
}

function normalizePatternKeys(value: unknown): TitleReferencePatternKey[] | undefined {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) {
    return undefined;
  }

  return value.every((key) => isOneOf(key, PATTERN_KEYS))
    ? value
    : undefined;
}

function normalizeDecorationIntents(value: unknown): TitleCandidateDecorationIntent[] | undefined {
  if (!Array.isArray(value) || !value.every((item) => isOneOf(item, DECORATION_INTENTS))) {
    return undefined;
  }

  return value;
}

function normalizeReadingOrder(value: unknown, mainTitle: string): string[] | undefined {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return undefined;
  }

  return value.join("") === mainTitle ? value : undefined;
}

function matchesCandidatePatternSelection(
  patternKeys: TitleReferencePatternKey[],
  index: number,
  patternSelection: SpatialStrategy["patternPool"],
): boolean {
  if (patternKeys.some((key) => patternSelection.disallowed.includes(key))) {
    return false;
  }

  if (index < 4) {
    return patternKeys.every((key) => patternSelection.primary.includes(key));
  }

  if (index === 4) {
    return patternKeys.every((key) => (
      patternSelection.primary.includes(key) ||
      patternSelection.secondary.includes(key)
    ));
  }

  return patternKeys.every((key) => (
    patternSelection.primary.includes(key) ||
    patternSelection.secondary.includes(key) ||
    patternSelection.exploratory.includes(key)
  ));
}

function getAllowedSpatialAnchorIds(spatialStrategy: SpatialStrategy): string[] {
  return [spatialStrategy.primaryTextAnchorId, ...spatialStrategy.secondaryTextAnchorIds]
    .filter((id, index, ids) => id.trim().length > 0 && ids.indexOf(id) === index);
}

function isAllowedSpatialAnchorId(spatialStrategy: SpatialStrategy, spatialAnchorId: string): boolean {
  return getAllowedSpatialAnchorIds(spatialStrategy).includes(spatialAnchorId);
}

function getTextAnchorById(
  spatialStrategy: SpatialStrategy,
  spatialAnchorId: string,
): TextAnchor | undefined {
  const anchor = spatialStrategy.backgroundLayout.textAnchors.find((item) => item.id === spatialAnchorId);

  if (anchor) {
    return normalizePrimaryTextAnchor(spatialStrategy, anchor);
  }

  return spatialAnchorId === spatialStrategy.primaryTextAnchorId
    ? fallbackTextAnchor(spatialAnchorId)
    : undefined;
}

function normalizePrimaryTextAnchor(
  spatialStrategy: SpatialStrategy,
  anchor: TextAnchor,
): TextAnchor {
  if (
    anchor.id !== spatialStrategy.primaryTextAnchorId ||
    spatialStrategy.orientationPreference !== "verticalFirst"
  ) {
    return anchor;
  }

  const safeZone = spatialStrategy.backgroundLayout.safeZones.find((zone) => zone.id === anchor.safeZoneId);

  if (!safeZone || !shouldExpandPrimaryAnchorFromSafeZone(anchor, safeZone)) {
    return anchor;
  }

  const expandedAnchor = expandPrimaryAnchorFromVerticalSafeZone(anchor, safeZone);

  return expandedAnchor.height > anchor.height || expandedAnchor.width > anchor.width ? avoidForbiddenZonesForPrimaryAnchor(
    expandedAnchor,
    safeZone,
    spatialStrategy.backgroundLayout.forbiddenZones,
  ) : anchor;
}

function shouldExpandPrimaryAnchorFromSafeZone(
  anchor: TextAnchor,
  safeZone: { shape?: string; width: number; height: number },
): boolean {
  if (safeZone.shape === "verticalColumn") return true;
  return safeZone.shape === "centerBlock" &&
    safeZone.height >= 320 &&
    safeZone.height >= anchor.height * 1.35;
}

function expandPrimaryAnchorFromVerticalSafeZone(
  anchor: TextAnchor,
  safeZone: { x: number; y: number; width: number; height: number },
): TextAnchor {
  const targetHeight = Math.round(Math.min(
    safeZone.height - 2,
    Math.max(anchor.height, safeZone.height * 0.78, 360),
  ));
  const targetWidth = Math.round(Math.min(
    safeZone.width - 2,
    Math.max(anchor.width, safeZone.width * 0.76, Math.min(MIN_READABLE_VERTICAL_ANCHOR_WIDTH, safeZone.width - 2)),
  ));

  if (anchor.height >= targetHeight * 0.82 && anchor.width >= targetWidth * 0.92) {
    return anchor;
  }

  const x = Math.round(clamp(
    safeZone.x + (safeZone.width - targetWidth) / 2,
    safeZone.x + 1,
    safeZone.x + safeZone.width - targetWidth - 1,
  ));
  const y = Math.round(clamp(
    safeZone.y + safeZone.height * 0.08,
    safeZone.y + 1,
    safeZone.y + safeZone.height - targetHeight - 1,
  ));

  return {
    ...anchor,
    x,
    y,
    width: targetWidth,
    height: targetHeight,
    preferredOrientation: "vertical",
    reason: `${anchor.reason} System expanded primary anchor from verticalColumn safeZone for readable horizontal title units.`,
  };
}

function avoidForbiddenZonesForPrimaryAnchor(
  anchor: TextAnchor,
  safeZone: { x: number; y: number; width: number; height: number },
  forbiddenZones: readonly { x: number; y: number; width: number; height: number }[],
): TextAnchor {
  let y = anchor.y;
  let height = anchor.height;
  const gap = 8;
  const minHeight = Math.min(320, Math.max(220, safeZone.height * 0.52));

  for (const zone of forbiddenZones) {
    if (boxOverlapRatio(anchor, zone) <= 0.02) continue;

    const zoneBottom = zone.y + zone.height;

    if (zoneBottom <= y + height * 0.42 && height - (zoneBottom + gap - y) >= minHeight) {
      height -= zoneBottom + gap - y;
      y = zoneBottom + gap;
    } else if (zone.y >= y + height * 0.58 && zone.y - gap - y >= minHeight) {
      height = zone.y - gap - y;
    }
  }

  height = Math.round(clamp(height, minHeight, safeZone.height - 2));
  y = Math.round(clamp(y, safeZone.y + 1, safeZone.y + safeZone.height - height - 1));

  return { ...anchor, y, height };
}

function fallbackTextAnchor(id: string): TextAnchor {
  return {
    id,
    safeZoneId: "fallbackCenterSafeZone",
    x: 260,
    y: 160,
    width: 480,
    height: 520,
    preferredOrientation: "vertical",
    recommendedTitleFlow: "followShape",
    priority: 1,
    confidence: 0.5,
    reason: "fallback text anchor for title candidate generation.",
  };
}

function isPointInsideAnchorBox(x: number, y: number, anchor: TextAnchor): boolean {
  return (
    x >= anchor.x &&
    y >= anchor.y &&
    x <= anchor.x + anchor.width &&
    y <= anchor.y + anchor.height
  );
}

function candidateUsesVerticalOrganization(candidate: TitleCandidate): boolean {
  if (candidate.titleUnits.some((unit) => unit.direction === "vertical")) {
    return true;
  }

  if (candidate.titleUnits.length < 2) {
    return false;
  }

  const yValues = candidate.titleUnits.map((unit) => unit.y);
  const yRange = Math.max(...yValues) - Math.min(...yValues);

  return yRange >= 80;
}

function normalizeTitleUnits(value: unknown): TitleCandidateUnit[] | undefined {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6) {
    return undefined;
  }

  const units = value.map(normalizeTitleUnit);

  return units.every(Boolean) ? units as TitleCandidateUnit[] : undefined;
}

function normalizeTitleUnit(value: unknown): TitleCandidateUnit | undefined {
  if (!isRecord(value) || !isNonEmptyString(value.text)) {
    return undefined;
  }

  if (
    !isOneOf(value.role, UNIT_ROLES) ||
    !isOneOf(value.direction, UNIT_DIRECTIONS) ||
    !isCoordinate(value.x) ||
    !isCoordinate(value.y) ||
    !isScale(value.scale) ||
    !isRotation(value.rotationDeg)
  ) {
    return undefined;
  }

  return {
    text: value.text,
    role: value.role,
    direction: value.direction,
    x: value.x,
    y: value.y,
    scale: value.scale,
    rotationDeg: value.rotationDeg,
  };
}

function normalizeSubtitle(value: unknown): TitleCandidateSubtitle | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value) || typeof value.text !== "string") {
    return undefined;
  }

  if (
    !isCoordinate(value.x) ||
    !isCoordinate(value.y) ||
    !isScale(value.scale) ||
    !isOneOf(value.placement, SUBTITLE_PLACEMENTS)
  ) {
    return undefined;
  }

  return {
    text: value.text,
    x: value.x,
    y: value.y,
    scale: value.scale,
    placement: value.placement,
  };
}

function buildLockupBlueprintCandidatePlan(
  mainTitle: string,
  spatialStrategy: SpatialStrategy,
): LockupBlueprintCandidatePlanItem[] {
  if (
    mainTitle === "成长汇报课" &&
    spatialStrategy.contentIntent === "achievementShowcase"
  ) {
    return [
      createCandidatePlanItem(spatialStrategy, "c1", "leadHero", "verticalHeroStack", ["stageSplitHero"], "c1 使用 leadHero 与 verticalHeroStack，沿竖向聚光柱组织成长/汇报课。"),
      createCandidatePlanItem(spatialStrategy, "c2", "fullHero", "stageMonument", ["stageMedalTitle"], "c2 使用完整标题与 stageMonument，形成成果展示主视觉重量。"),
      createCandidatePlanItem(spatialStrategy, "c3", "threeStep", "staggeredColumn", ["businessLaunchHero", "stageSplitHero"], "c3 使用 threeStep 与 staggeredColumn，生成竖向错落节奏。"),
      createCandidatePlanItem(spatialStrategy, "c4", "leadHero", "centerStageLockup", ["stageSplitHero", "stageMedalTitle"], "c4 使用中心舞台 lockup，保持标题稳定居中。"),
      createCandidatePlanItem(spatialStrategy, "c5", "leadHero", "badgeHeroLockup", ["stageMedalTitle"], "c5 使用荣誉徽章感服务成果展示，但不改写主标题。"),
      createCandidatePlanItem(spatialStrategy, "c6", "threeStep", "verticalHeroStack", ["stageSplitHero", "businessLaunchHero"], "c6 回到 verticalHeroStack，对 threeStep 做另一种竖向组织。"),
    ];
  }

  const semanticSplits = getSemanticSplitCandidates(mainTitle);
  const compositionModes = getAllowedCompositionModes(semanticSplits, spatialStrategy.orientationPreference);
  const patternGroups = getFallbackPatternGroups(spatialStrategy);

  return Array.from({ length: 6 }, (_, index) => {
    const semanticSplit = semanticSplits[index % semanticSplits.length];
    const compositionMode = compositionModes[index % compositionModes.length];

    return createCandidatePlanItem(
      spatialStrategy,
      `c${index + 1}`,
      semanticSplit.splitId,
      compositionMode,
      patternGroups[index] || patternGroups[0] || ["cleanBrandCentered"],
      `c${index + 1} 按 spatialStrategy 生成固定 blueprint plan，AI 只补几何细节。`,
    );
  });
}

function createCandidatePlanItem(
  spatialStrategy: SpatialStrategy,
  candidateId: string,
  semanticSplitId: string,
  compositionMode: TitleCompositionMode,
  preferredPatternKeys: TitleReferencePatternKey[],
  reasonHint: string,
): LockupBlueprintCandidatePlanItem {
  const patternKeys = getPlanPatternKeys(preferredPatternKeys, spatialStrategy);

  return {
    candidateId,
    semanticSplitId,
    compositionMode,
    flowAxis: TITLE_COMPOSITION_GRAMMAR[compositionMode].flowAxis,
    spatialAnchorId: spatialStrategy.primaryTextAnchorId,
    patternKeys,
    effectIntent: getFallbackEffectIntent(patternKeys[0]),
    decorationIntents: getFallbackDecorationIntents(patternKeys[0]),
    reasonHint,
  };
}

function getPlanPatternKeys(
  preferredPatternKeys: readonly TitleReferencePatternKey[],
  spatialStrategy: SpatialStrategy,
): TitleReferencePatternKey[] {
  const allowedPatternKeys = [
    ...spatialStrategy.patternPool.primary,
    ...spatialStrategy.patternPool.secondary,
    ...spatialStrategy.patternPool.exploratory,
  ].filter((key) => !spatialStrategy.patternPool.disallowed.includes(key));
  const patternKeys = preferredPatternKeys.filter((key) => allowedPatternKeys.includes(key));

  if (patternKeys.length > 0) {
    return patternKeys.slice(0, 3);
  }

  return [
    spatialStrategy.patternPool.primary.find((key) => allowedPatternKeys.includes(key)) ||
      allowedPatternKeys[0] ||
      "cleanBrandCentered",
  ];
}

function fallback(
  input: GenerateTitleCandidatesInput,
  reason: string,
  spatialStrategy: SpatialStrategy,
  candidatePlan: readonly LockupBlueprintCandidatePlanItem[],
  structuredOutputMode: GenerateTitleCandidatesResult["structuredOutputMode"],
): GenerateTitleCandidatesResult {
  const fallbackDrafts = buildFallbackLockupDrafts(input, spatialStrategy, candidatePlan);
  const parsedBlueprints = buildBlueprintsFromDraftsWithDiagnostic(
    input,
    fallbackDrafts,
    spatialStrategy,
    candidatePlan,
    true,
  );
  const fallbackResult = parsedBlueprints.lockupBlueprints && parsedBlueprints.lockupBlueprints.length >= 6
    ? {
        lockupBlueprints: parsedBlueprints.lockupBlueprints,
        reason,
      }
    : {
        lockupBlueprints: buildSafeFallbackLockupBlueprints(
          input,
          fallbackDrafts,
          spatialStrategy,
          candidatePlan,
        ),
        reason: `${reason} Fallback validation diagnostic: ${formatDiagnostic(parsedBlueprints.diagnostic)}; returned system-built diagnostic fallback.`,
      };
  const lockupBlueprints = fallbackResult.lockupBlueprints;
  const candidates = buildLegacyCandidatesFromBlueprints(lockupBlueprints, spatialStrategy);

  return {
    source: "fallback",
    structuredOutputMode,
    lockupDraftCount: fallbackDrafts.length,
    lockupDraftFields: getLockupDraftFields(fallbackDrafts),
    firstDraftUnitLayoutHints: fallbackDrafts[0]?.unitLayoutHints ?? [],
    lockupBlueprints,
    candidates,
    reason: fallbackResult.reason,
    spatialStrategy,
    titleHierarchyContext: input.titleHierarchyContext,
  };
}

function ruleBasedFromCandidatePlan(
  input: GenerateTitleCandidatesInput,
  reason: string,
  spatialStrategy: SpatialStrategy,
  candidatePlan: readonly LockupBlueprintCandidatePlanItem[],
  structuredOutputMode: GenerateTitleCandidatesResult["structuredOutputMode"],
): GenerateTitleCandidatesResult | undefined {
  const drafts = buildFallbackLockupDrafts(input, spatialStrategy, candidatePlan);
  const parsedBlueprints = buildBlueprintsFromDraftsWithDiagnostic(
    input,
    drafts,
    spatialStrategy,
    candidatePlan,
    false,
  );

  if (!parsedBlueprints.lockupBlueprints || parsedBlueprints.lockupBlueprints.length < 6) {
    return undefined;
  }

  const lockupBlueprints = parsedBlueprints.lockupBlueprints;
  const candidates = buildLegacyCandidatesFromBlueprints(lockupBlueprints, spatialStrategy);

  return {
    source: "rule-based",
    structuredOutputMode,
    lockupDraftCount: drafts.length,
    lockupDraftFields: getLockupDraftFields(drafts),
    firstDraftUnitLayoutHints: drafts[0]?.unitLayoutHints ?? [],
    lockupBlueprints,
    candidates,
    reason,
    spatialStrategy,
    titleHierarchyContext: input.titleHierarchyContext,
  };
}

function buildSafeFallbackLockupBlueprints(
  input: GenerateTitleCandidatesInput,
  fallbackDrafts: readonly LockupDraft[],
  spatialStrategy: SpatialStrategy,
  candidatePlan: readonly LockupBlueprintCandidatePlanItem[],
): TitleLockupBlueprint[] {
  return fallbackDrafts
    .map((draft, index) => {
      const planItem = getCandidatePlanItemById(candidatePlan, draft.candidateId)
        ?? candidatePlan[index];

      return planItem
        ? buildBlueprintFromDraftAndPlan(input, draft, spatialStrategy, planItem, index, true)
        : undefined;
    })
    .filter((blueprint): blueprint is TitleLockupBlueprint => Boolean(blueprint))
    .slice(0, 6);
}

function getLockupDraftFields(lockupDrafts: readonly LockupDraft[]): string[] {
  const firstDraft = lockupDrafts[0];

  return firstDraft ? Object.keys(firstDraft) : [];
}

function buildFallbackLockupDrafts(
  input: GenerateTitleCandidatesInput,
  spatialStrategy: SpatialStrategy,
  candidatePlan: readonly LockupBlueprintCandidatePlanItem[],
): LockupDraft[] {
  return candidatePlan.map((planItem, index) => {
    const anchor = getTextAnchorById(spatialStrategy, planItem.spatialAnchorId)
      ?? fallbackTextAnchor(planItem.spatialAnchorId);

    return createLockupDraft({
      input,
      spatialStrategy,
      anchor,
      semanticSplit: getSemanticSplitCandidateById(input.mainTitle, planItem.semanticSplitId)
        ?? getSemanticSplitCandidates(input.mainTitle)[0],
      planItem,
      candidateIndex: index,
      reason: planItem.reasonHint,
    });
  });
}

function buildExampleLockupDraft(
  input: GenerateTitleCandidatesInput,
  spatialStrategy: SpatialStrategy,
  anchor: TextAnchor,
  semanticSplit: TitleSemanticSplitCandidate,
  planItem: LockupBlueprintCandidatePlanItem,
): LockupDraft {
  return createLockupDraft({
    input,
    spatialStrategy,
    anchor,
    semanticSplit,
    planItem,
    candidateIndex: 0,
    reason: "示例：标题组合体服从主空间锚点，按语义字组形成主视觉。",
  });
}

function buildBlueprintsFromDraftsWithDiagnostic(
  input: GenerateTitleCandidatesInput,
  lockupDrafts: readonly LockupDraft[],
  spatialStrategy: SpatialStrategy,
  candidatePlan: readonly LockupBlueprintCandidatePlanItem[],
  isFallbackCandidate = false,
): {
  lockupBlueprints?: TitleLockupBlueprint[];
  diagnostic: LockupBlueprintValidationDiagnostic;
} {
  const rawLockupBlueprints = lockupDrafts
    .map((draft) => {
      const planItem = getCandidatePlanItemById(candidatePlan, draft.candidateId);
      const planIndex = planItem ? candidatePlan.indexOf(planItem) : -1;

      return planItem
        ? buildBlueprintFromDraftAndPlan(input, draft, spatialStrategy, planItem, planIndex, isFallbackCandidate)
        : undefined;
    })
    .filter((blueprint): blueprint is TitleLockupBlueprint => Boolean(blueprint));

  return validateLockupBlueprintsWithDiagnostic(
    { lockupBlueprints: rawLockupBlueprints },
    input.mainTitle,
    spatialStrategy,
    candidatePlan,
  );
}

function buildBlueprintFromDraftAndPlan(
  input: GenerateTitleCandidatesInput,
  draft: LockupDraft,
  spatialStrategy: SpatialStrategy,
  planItem: LockupBlueprintCandidatePlanItem,
  candidateIndex: number,
  isFallbackCandidate: boolean,
): TitleLockupBlueprint {
  const anchor = getTextAnchorById(spatialStrategy, planItem.spatialAnchorId)
    ?? fallbackTextAnchor(planItem.spatialAnchorId);
  const grammar = TITLE_COMPOSITION_GRAMMAR[planItem.compositionMode];
  const semanticSplit = getSemanticSplitCandidateById(input.mainTitle, planItem.semanticSplitId)
    ?? getSemanticSplitCandidates(input.mainTitle)[0];
  const lockupBox = createLockupBoxFromPlan(planItem, anchor, grammar, Math.max(candidateIndex, 0));
  const titleUnits = buildTitleUnitsFromLayoutHints(
    draft.unitLayoutHints,
    semanticSplit,
    lockupBox,
    grammar.flowAxis,
    planItem.compositionMode,
    toBlueprintOrientationPreference(spatialStrategy.orientationPreference),
    Math.max(candidateIndex, 0),
  );
  const collisionPolicy = createCollisionPolicy();
  const forbiddenZonePolicy = createForbiddenZonePolicy(spatialStrategy);
  const subtitleLockup = buildSubtitleLockup(
    input.subtitle,
    lockupBox,
    anchor,
    grammar.subtitlePlacementPolicy,
    titleUnits,
    spatialStrategy,
    input.titleHierarchyContext,
  );
  const spatialContract = {
    spatialAnchorId: anchor.id,
    anchorBox: {
      x: anchor.x,
      y: anchor.y,
      width: anchor.width,
      height: anchor.height,
    },
    lockupBox,
    flowAxis: grammar.flowAxis,
    secondaryAnchorDefaultUsage: "subtitleOrAuxiliaryOnly" as const,
    collisionPolicy,
    forbiddenZonePolicy,
    notes: [
      "AI 只输出 lockupDraft；系统补全空间契约和安全策略。",
      "标题组合体必须服从 spatialStrategy 的 textAnchor。",
      "verticalFirst 代表沿竖向空间组织，不代表逐字竖排。",
      planItem.reasonHint,
    ],
  };

  return {
    candidateId: planItem.candidateId,
    spatialAnchorId: planItem.spatialAnchorId,
    semanticSplitId: planItem.semanticSplitId,
    mainTitle: input.mainTitle,
    compositionMode: planItem.compositionMode,
    flowAxis: grammar.flowAxis,
    orientationPreference: toBlueprintOrientationPreference(spatialStrategy.orientationPreference),
    patternKeys: planItem.patternKeys,
    effectIntent: planItem.effectIntent,
    decorationIntents: planItem.decorationIntents,
    spatialContract,
    lockupBox,
    titleUnits,
    subtitleLockup,
    collisionPolicy,
    forbiddenZonePolicy,
    readingOrder: semanticSplit.readingOrder,
    isFallbackCandidate,
    reason: draft.reason,
  };
}

function createLockupDraft(params: {
  input: GenerateTitleCandidatesInput;
  spatialStrategy: SpatialStrategy;
  anchor: TextAnchor;
  semanticSplit: TitleSemanticSplitCandidate;
  planItem: LockupBlueprintCandidatePlanItem;
  candidateIndex: number;
  reason: string;
}): LockupDraft {
  const grammar = TITLE_COMPOSITION_GRAMMAR[params.planItem.compositionMode];
  const unitLayoutHints = buildFallbackUnitLayoutHints(
    params.semanticSplit,
    grammar.flowAxis,
    params.candidateIndex,
  );

  return {
    candidateId: params.planItem.candidateId,
    unitLayoutHints,
    reason: params.reason,
  };
}

function createLockupBlueprint(params: {
  input: GenerateTitleCandidatesInput;
  spatialStrategy: SpatialStrategy;
  anchor: TextAnchor;
  semanticSplit: TitleSemanticSplitCandidate;
  planItem: LockupBlueprintCandidatePlanItem;
  candidateIndex: number;
  isFallbackCandidate: boolean;
  reason: string;
}): TitleLockupBlueprint {
  const grammar = TITLE_COMPOSITION_GRAMMAR[params.planItem.compositionMode];
  const lockupBox = createLockupBox(params.anchor, grammar.flowAxis, params.candidateIndex);
  const collisionPolicy = createCollisionPolicy();
  const forbiddenZonePolicy = createForbiddenZonePolicy(params.spatialStrategy);
  const titleUnits = buildLockupUnits(params.semanticSplit, lockupBox, grammar.flowAxis, params.candidateIndex);
  const subtitleLockup = buildSubtitleLockup(
    params.input.subtitle,
    lockupBox,
    params.anchor,
    grammar.subtitlePlacementPolicy,
    titleUnits,
    params.spatialStrategy,
    params.input.titleHierarchyContext,
  );
  const spatialContract = {
    spatialAnchorId: params.anchor.id,
    anchorBox: {
      x: params.anchor.x,
      y: params.anchor.y,
      width: params.anchor.width,
      height: params.anchor.height,
    },
    lockupBox,
    flowAxis: grammar.flowAxis,
    secondaryAnchorDefaultUsage: "subtitleOrAuxiliaryOnly" as const,
    collisionPolicy,
    forbiddenZonePolicy,
    notes: [
      "标题组合体必须服从 spatialStrategy 的 primary textAnchor。",
      "verticalFirst 代表沿竖向空间组织，不代表逐字竖排。",
      "fallback blueprint 仅用于诊断和 preview 兼容。",
      params.planItem.reasonHint,
    ],
  };

  return {
    candidateId: params.planItem.candidateId,
    spatialAnchorId: params.anchor.id,
    semanticSplitId: params.semanticSplit.splitId,
    mainTitle: params.input.mainTitle,
    compositionMode: params.planItem.compositionMode,
    flowAxis: grammar.flowAxis,
    orientationPreference: toBlueprintOrientationPreference(params.spatialStrategy.orientationPreference),
    patternKeys: params.planItem.patternKeys,
    effectIntent: params.planItem.effectIntent,
    decorationIntents: params.planItem.decorationIntents,
    spatialContract,
    lockupBox,
    titleUnits,
    subtitleLockup,
    collisionPolicy,
    forbiddenZonePolicy,
    readingOrder: params.semanticSplit.readingOrder,
    isFallbackCandidate: params.isFallbackCandidate,
    reason: params.reason,
  };
}

function buildLegacyCandidatesFromBlueprints(
  lockupBlueprints: TitleLockupBlueprint[],
  spatialStrategy: SpatialStrategy,
): TitleCandidate[] {
  const rawCandidates = lockupBlueprints.map((blueprint) => {
    const titleUnits = blueprint.titleUnits
      .slice()
      .sort((left, right) => left.readingOrder - right.readingOrder)
      .map((unit) => legacyUnitFromLockupUnit(unit));
    const subtitle = legacySubtitleFromBlueprint(blueprint);
    const patternKeys = blueprint.patternKeys
      .filter((key): key is TitleReferencePatternKey => isOneOf(key, PATTERN_KEYS))
      .slice(0, 3);

    return {
      candidateId: blueprint.candidateId,
      spatialAnchorId: blueprint.spatialAnchorId,
      strategyMode: spatialStrategy.strategyMode,
      orientationPreference: spatialStrategy.orientationPreference,
      patternKeys: patternKeys.length > 0 ? patternKeys : [spatialStrategy.patternPool.primary[0] || "cleanBrandCentered"],
      hybridStrategy: `由 ${blueprint.compositionMode} lockupBlueprint 派生旧 preview 候选。`,
      titleUnits,
      ...(subtitle ? { subtitle } : {}),
      effectIntent: isOneOf(blueprint.effectIntent, EFFECT_INTENTS) ? blueprint.effectIntent : "cleanReadable",
      decorationIntents: normalizeDecorationIntents(blueprint.decorationIntents) || ["none"],
      readabilityPlan: "由 lockupBox 与 unitBox 派生点坐标，仅用于低保真 preview 兼容。",
      backgroundFitReason: blueprint.reason,
      whyNotTemplate: "主结构来自 TitleLockupBlueprint，不再由旧点坐标自由生成。",
    };
  });

  return validateCandidates({ candidates: rawCandidates }, lockupBlueprints[0]?.mainTitle || "", spatialStrategy) ?? rawCandidates;
}

function legacyUnitFromLockupUnit(unit: TitleLockupUnit): TitleCandidateUnit {
  return {
    text: unit.text,
    role: legacyRoleFromVisualRole(unit.visualRole),
    direction: unit.direction === "vertical" ? "vertical" : "horizontal",
    x: Math.round(unit.unitBox.x + unit.unitBox.width / 2),
    y: Math.round(unit.unitBox.y + unit.unitBox.height / 2),
    scale: clamp(0.72 + unit.visualWeight * 0.16, 0.7, 1.8),
    rotationDeg: unit.unitBox.rotationDeg,
  };
}

function legacyRoleFromVisualRole(visualRole: TitleLockupUnit["visualRole"]): TitleCandidateUnitRole {
  if (visualRole === "hero") return "main";
  return visualRole;
}

function legacySubtitleFromBlueprint(blueprint: TitleLockupBlueprint): TitleCandidateSubtitle | undefined {
  const subtitleBox = blueprint.subtitleLockup.subtitleBox;

  if (!subtitleBox || blueprint.subtitleLockup.placementPolicy === "hidden") {
    return undefined;
  }

  return {
    text: blueprint.subtitleLockup.text,
    x: Math.round(subtitleBox.x + subtitleBox.width / 2),
    y: Math.round(subtitleBox.y + subtitleBox.height / 2),
    scale: clamp(0.7 + blueprint.subtitleLockup.visualWeight * 0.08, 0.7, 1.1),
    placement: legacySubtitlePlacement(blueprint.subtitleLockup.placementPolicy),
  };
}

function legacySubtitlePlacement(
  placementPolicy: TitleSubtitlePlacementPolicy,
): TitleCandidateSubtitle["placement"] {
  if (placementPolicy === "sideOfMainLockup") return "side";
  if (placementPolicy === "secondaryAnchor") return "side";
  if (placementPolicy === "hidden") return "none";
  return "below";
}

function createLockupBoxFromPlan(
  planItem: LockupBlueprintCandidatePlanItem,
  anchor: TextAnchor,
  grammar: (typeof TITLE_COMPOSITION_GRAMMAR)[TitleCompositionMode],
  candidateIndex: number,
): TitleLockupBox {
  const safePadding = 24;
  const { widthRatio, heightRatio } = getLockupBoxRatios(planItem.compositionMode, grammar.flowAxis);
  const width = Math.max(24, Math.min(Math.round(anchor.width * widthRatio), Math.round(anchor.width - 2)));
  const height = Math.max(24, Math.min(Math.round(anchor.height * heightRatio), Math.round(anchor.height - 2)));
  const horizontalShift = grammar.flowAxis === "vertical"
    ? (candidateIndex % 2 === 0 ? -0.025 : 0.025) * anchor.width
    : (candidateIndex % 3 - 1) * anchor.width * 0.025;
  const verticalOffsetRatio = grammar.flowAxis === "vertical" ? 0.08 : grammar.flowAxis === "horizontal" ? 0.18 : 0.13;
  const x = Math.round(clamp(
    anchor.x + (anchor.width - width) / 2 + horizontalShift,
    anchor.x + 1,
    anchor.x + anchor.width - width - 1,
  ));
  const y = Math.round(clamp(
    anchor.y + (anchor.height - height) * verticalOffsetRatio,
    anchor.y + 1,
    anchor.y + anchor.height - height - 1,
  ));

  return {
    x,
    y,
    width,
    height,
    safePadding,
    allowedOverflowPx: 0,
  };
}

function getLockupBoxRatios(
  compositionMode: TitleCompositionMode,
  flowAxis: TitleFlowAxis,
): {
  widthRatio: number;
  heightRatio: number;
} {
  if (flowAxis === "vertical") {
    return {
      widthRatio: compositionMode === "staggeredColumn" ? 0.82 : 0.74,
      heightRatio: compositionMode === "stageMonument" ? 0.88 : 0.80,
    };
  }

  if (flowAxis === "horizontal") {
    return { widthRatio: 0.86, heightRatio: 0.52 };
  }

  if (flowAxis === "diagonal") {
    return { widthRatio: 0.84, heightRatio: 0.60 };
  }

  return {
    widthRatio: compositionMode === "badgeHeroLockup" ? 0.74 : 0.82,
    heightRatio: compositionMode === "stageMonument" ? 0.70 : 0.62,
  };
}

function createLockupBox(
  anchor: TextAnchor,
  flowAxis: TitleFlowAxis,
  candidateIndex: number,
): TitleLockupBox {
  const safePadding = 24;
  const widthRatio = flowAxis === "vertical" ? 0.72 : 0.84;
  const heightRatio = flowAxis === "horizontal" ? 0.52 : 0.72;
  const width = Math.round(anchor.width * widthRatio);
  const height = Math.round(anchor.height * heightRatio);
  const horizontalShift = (candidateIndex % 3 - 1) * Math.round(anchor.width * 0.035);
  const verticalShift = Math.floor(candidateIndex / 3) * Math.round(anchor.height * 0.035);
  const x = Math.round(clamp(
    anchor.x + (anchor.width - width) / 2 + horizontalShift,
    anchor.x + 1,
    anchor.x + anchor.width - width - 1,
  ));
  const y = Math.round(clamp(
    anchor.y + anchor.height * 0.08 + verticalShift,
    anchor.y + 1,
    anchor.y + anchor.height - height - 1,
  ));

  return {
    x,
    y,
    width,
    height,
    safePadding,
    allowedOverflowPx: 0,
  };
}

function buildTitleUnitsFromLayoutHints(
  unitLayoutHints: readonly TitleLockupDraftUnitLayoutHint[],
  semanticSplit: TitleSemanticSplitCandidate,
  lockupBox: TitleLockupBox,
  flowAxis: TitleFlowAxis,
  compositionMode: TitleCompositionMode,
  orientationPreference: BlueprintOrientationPreference,
  candidateIndex: number,
): TitleLockupUnit[] {
  return semanticSplit.units.map((semanticUnit, index) => {
    const hint = findUnitLayoutHint(unitLayoutHints, index);
    const ratioFlowAxis = getSystemRatioFlowAxis(
      flowAxis,
      compositionMode,
      orientationPreference,
      semanticSplit.units.length,
    );
    const ratio = shouldUseSystemVerticalOrganization(
      compositionMode,
      orientationPreference,
      semanticSplit.units.length,
    )
      ? createFallbackBoxRatio(ratioFlowAxis, index, semanticSplit.units.length, candidateIndex)
      : hint?.boxRatio ?? createFallbackBoxRatio(
        ratioFlowAxis,
        index,
        semanticSplit.units.length,
        candidateIndex,
      );
    const width = Math.round(clamp(ratio.width * lockupBox.width, 21, lockupBox.width));
    const height = Math.round(clamp(ratio.height * lockupBox.height, 21, lockupBox.height));
    const x = Math.round(clamp(
      lockupBox.x + ratio.x * lockupBox.width,
      lockupBox.x,
      lockupBox.x + lockupBox.width - width,
    ));
    const y = Math.round(clamp(
      lockupBox.y + ratio.y * lockupBox.height,
      lockupBox.y,
      lockupBox.y + lockupBox.height - height,
    ));
    const unitBox = {
      x,
      y,
      width,
      height,
      maxWidth: width,
      maxHeight: height,
      rotationDeg: ratio.rotationDeg,
    };

    return {
      text: semanticUnit.text,
      semanticRole: semanticUnit.semanticRole,
      visualRole: semanticUnit.visualRoleHint,
      unitBox,
      direction: hint?.direction ?? fallbackUnitDirection(flowAxis, semanticSplit.units.length),
      visualWeight: getSystemVisualWeightForRole(semanticUnit.semanticRole),
      alignment: hint?.alignment ?? "center",
      readingOrder: index + 1,
      allowEmphasis: semanticUnit.allowEmphasis,
    };
  });
}

function findUnitLayoutHint(
  unitLayoutHints: readonly TitleLockupDraftUnitLayoutHint[],
  unitIndex: number,
): TitleLockupDraftUnitLayoutHint | undefined {
  return unitLayoutHints.find((hint) => hint.unitIndex === unitIndex);
}

function fallbackUnitDirection(
  flowAxis: TitleFlowAxis,
  unitCount: number,
): TitleUnitDirection {
  return flowAxis === "vertical" && unitCount === 1 ? "vertical" : "horizontal";
}

const VERTICAL_ORGANIZATION_COMPOSITION_MODES: readonly TitleCompositionMode[] = [
  "verticalHeroStack",
  "staggeredColumn",
  "centerStageLockup",
  "badgeHeroLockup",
];

function shouldUseSystemVerticalOrganization(
  compositionMode: TitleCompositionMode,
  orientationPreference: BlueprintOrientationPreference,
  unitCount: number,
): boolean {
  return (
    orientationPreference === "verticalFirst" &&
    unitCount > 1 &&
    VERTICAL_ORGANIZATION_COMPOSITION_MODES.includes(compositionMode)
  );
}

function getSystemRatioFlowAxis(
  flowAxis: TitleFlowAxis,
  compositionMode: TitleCompositionMode,
  orientationPreference: BlueprintOrientationPreference,
  unitCount: number,
): TitleFlowAxis {
  if (!shouldUseSystemVerticalOrganization(compositionMode, orientationPreference, unitCount)) {
    return flowAxis;
  }

  return flowAxis === "centered" ? "centered" : "vertical";
}

function getSystemVisualWeightForRole(
  semanticRole: TitleLockupUnit["semanticRole"],
): number {
  if (semanticRole === "hero") return 6;
  if (semanticRole === "lead") return 3;
  if (semanticRole === "accent") return 2;
  return 1.5;
}

function buildFallbackUnitLayoutHints(
  semanticSplit: TitleSemanticSplitCandidate,
  flowAxis: TitleFlowAxis,
  candidateIndex: number,
): TitleLockupDraftUnitLayoutHint[] {
  return semanticSplit.units.map((_unit, index) => ({
    unitIndex: index,
    direction: fallbackUnitDirection(flowAxis, semanticSplit.units.length),
    alignment: "center",
    boxRatio: createFallbackBoxRatio(flowAxis, index, semanticSplit.units.length, candidateIndex),
  }));
}

function createFallbackBoxRatio(
  flowAxis: TitleFlowAxis,
  unitIndex: number,
  unitCount: number,
  candidateIndex: number,
): TitleLockupDraftBoxRatio {
  if (flowAxis === "horizontal") {
    const segmentWidth = 1 / unitCount;
    const width = segmentWidth * 0.84;

    return {
      x: unitIndex * segmentWidth + (segmentWidth - width) / 2,
      y: 0.22,
      width,
      height: 0.42,
      rotationDeg: 0,
    };
  }

  if (flowAxis === "diagonal") {
    const height = Math.min(0.30, 0.68 / unitCount);
    const width = Math.max(0.52, 0.76 - unitIndex * 0.08);
    const x = Math.min(0.12 + unitIndex * 0.10, 1 - width);
    const y = Math.min(0.12 + unitIndex * (0.72 / unitCount), 1 - height);

    return {
      x,
      y,
      width,
      height,
      rotationDeg: candidateIndex % 2 === 0 ? -6 : 6,
    };
  }

  const segmentHeight = 0.78 / unitCount;
  const height = segmentHeight * 0.72;
  const width = unitCount === 1 ? 0.78 : 0.70;
  const xOffset = flowAxis === "centered" ? 0 : (unitIndex % 2 === 0 ? -0.035 : 0.035);
  const x = clamp((1 - width) / 2 + xOffset, 0, 1 - width);

  return {
    x,
    y: 0.10 + unitIndex * segmentHeight + (segmentHeight - height) / 2,
    width,
    height,
    rotationDeg: flowAxis === "centered" ? 0 : (candidateIndex % 3 === 2 ? -3 : 0),
  };
}

function buildLockupUnits(
  semanticSplit: TitleSemanticSplitCandidate,
  lockupBox: TitleLockupBox,
  flowAxis: TitleFlowAxis,
  candidateIndex: number,
): TitleLockupUnit[] {
  return semanticSplit.units.map((unit, index) => {
    const unitBox = createUnitBox(lockupBox, flowAxis, index, semanticSplit.units.length, candidateIndex);

    return {
      text: unit.text,
      semanticRole: unit.semanticRole,
      visualRole: unit.visualRoleHint,
      unitBox,
      direction: flowAxis === "vertical" ? "horizontal" : "horizontal",
      visualWeight: unit.visualRoleHint === "hero" ? unit.importance + 1 : unit.importance,
      alignment: "center",
      readingOrder: index + 1,
      allowEmphasis: unit.allowEmphasis,
    };
  });
}

function createUnitBox(
  lockupBox: TitleLockupBox,
  flowAxis: TitleFlowAxis,
  unitIndex: number,
  unitCount: number,
  candidateIndex: number,
): TitleUnitBox {
  const padding = lockupBox.safePadding;
  const usableX = lockupBox.x + padding;
  const usableY = lockupBox.y + padding;
  const usableWidth = lockupBox.width - padding * 2;
  const usableHeight = lockupBox.height - padding * 2;

  if (flowAxis === "horizontal") {
    const unitWidth = Math.round(usableWidth / unitCount * 0.88);
    const x = Math.round(usableX + unitIndex * (usableWidth / unitCount) + (usableWidth / unitCount - unitWidth) / 2);
    const height = Math.round(usableHeight * 0.58);

    return {
      x,
      y: Math.round(usableY + usableHeight * 0.16),
      width: unitWidth,
      height,
      maxWidth: unitWidth,
      maxHeight: height,
      rotationDeg: 0,
    };
  }

  if (flowAxis === "diagonal") {
    const unitWidth = Math.round(usableWidth * 0.72);
    const height = Math.round(usableHeight / unitCount * 0.62);
    const x = Math.round(usableX + unitIndex * (usableWidth * 0.12));
    const y = Math.round(usableY + unitIndex * (usableHeight / unitCount));

    return {
      x,
      y,
      width: Math.min(unitWidth, usableWidth - unitIndex * Math.round(usableWidth * 0.12)),
      height,
      maxWidth: unitWidth,
      maxHeight: height,
      rotationDeg: candidateIndex % 2 === 0 ? -6 : 6,
    };
  }

  const unitHeight = Math.round(usableHeight / unitCount * 0.72);
  const width = Math.round(usableWidth * (unitCount === 1 ? 0.86 : 0.78));
  const xOffset = flowAxis === "centered" ? 0 : (unitIndex % 2 === 0 ? -0.04 : 0.04) * usableWidth;
  const x = Math.round(clamp(
    usableX + (usableWidth - width) / 2 + xOffset,
    usableX,
    usableX + usableWidth - width,
  ));
  const y = Math.round(usableY + unitIndex * (usableHeight / unitCount) + (usableHeight / unitCount - unitHeight) / 2);

  return {
    x,
    y,
    width,
    height: unitHeight,
    maxWidth: width,
    maxHeight: unitHeight,
    rotationDeg: flowAxis === "centered" ? 0 : (candidateIndex % 3 === 2 ? -3 : 0),
  };
}

function buildSubtitleLockup(
  subtitle: string | undefined,
  lockupBox: TitleLockupBox,
  anchor: TextAnchor,
  placementPolicy: TitleSubtitlePlacementPolicy,
  titleUnits: readonly TitleLockupUnit[],
  spatialStrategy: SpatialStrategy,
  hierarchyContext?: TitleHierarchyContext,
): TitleLockupBlueprint["subtitleLockup"] {
  if (!subtitle) {
    return hiddenSubtitleLockup();
  }

  const subtitlePlacement = resolveSafeSubtitlePlacement(
    lockupBox,
    anchor,
    placementPolicy,
    titleUnits,
    spatialStrategy,
  );

  if (!subtitlePlacement) {
    return hiddenSubtitleLockup(subtitle);
  }

  return {
    text: subtitle,
    placementPolicy: subtitlePlacement.placementPolicy,
    subtitleBox: subtitlePlacement.subtitleBox,
    visualWeight: subtitleVisualWeight(hierarchyContext),
    readingOrder: 99,
  };
}

function subtitleVisualWeight(context: TitleHierarchyContext | undefined): number {
  if (context?.recommendedSubtitlePriority === "strong") return 1.75;
  if (context?.recommendedSubtitlePriority === "preserveIfSafe") return 1.55;
  return 1.4;
}

function hiddenSubtitleLockup(text = ""): TitleLockupBlueprint["subtitleLockup"] {
  return {
    text,
    placementPolicy: "hidden",
    subtitleBox: null,
    visualWeight: 0,
    readingOrder: 99,
  };
}

function resolveSafeSubtitlePlacement(
  lockupBox: TitleLockupBox,
  anchor: TextAnchor,
  placementPolicy: TitleSubtitlePlacementPolicy,
  titleUnits: readonly TitleLockupUnit[],
  spatialStrategy: SpatialStrategy,
): {
  placementPolicy: TitleSubtitlePlacementPolicy;
  subtitleBox: TitleUnitBox;
} | undefined {
  if (placementPolicy !== "secondaryAnchor") {
    const preferredBox = createSubtitleBox(lockupBox, anchor, placementPolicy);

    if (isSubtitleBoxSafe(preferredBox, titleUnits, placementPolicy)) {
      return { placementPolicy, subtitleBox: preferredBox };
    }
  }

  for (const anchorId of spatialStrategy.secondaryTextAnchorIds) {
    const secondaryAnchor = getTextAnchorById(spatialStrategy, anchorId);

    if (!secondaryAnchor) continue;

    const secondaryBox = createSecondaryAnchorSubtitleBox(secondaryAnchor);

    if (isSubtitleBoxSafe(secondaryBox, titleUnits, "secondaryAnchor")) {
      return { placementPolicy: "secondaryAnchor", subtitleBox: secondaryBox };
    }
  }

  return undefined;
}

function createSubtitleBox(
  lockupBox: TitleLockupBox,
  anchor: TextAnchor,
  placementPolicy: TitleSubtitlePlacementPolicy,
): TitleUnitBox {
  if (placementPolicy === "sideOfMainLockup") {
    const width = Math.round(lockupBox.width * 0.42);
    const height = Math.round(lockupBox.height * 0.14);

    return {
      x: Math.round(clamp(lockupBox.x + lockupBox.width * 0.58, anchor.x, anchor.x + anchor.width - width)),
      y: Math.round(clamp(lockupBox.y + lockupBox.height * 0.5, anchor.y, anchor.y + anchor.height - height)),
      width,
      height,
      maxWidth: width,
      maxHeight: height,
      rotationDeg: 0,
    };
  }

  const width = Math.round(Math.max(24, Math.min(lockupBox.width * 0.72, anchor.width * 0.86, anchor.width - 2)));
  const height = Math.round(Math.max(20, Math.min(44, Math.max(28, anchor.height * 0.12), anchor.height - 2)));
  const belowY = Math.round(lockupBox.y + lockupBox.height + 12);

  return {
    x: Math.round(clamp(lockupBox.x + (lockupBox.width - width) / 2, anchor.x, anchor.x + anchor.width - width)),
    y: Math.round(clamp(belowY, anchor.y, anchor.y + anchor.height - height)),
    width,
    height,
    maxWidth: width,
    maxHeight: height,
    rotationDeg: 0,
  };
}

function createSecondaryAnchorSubtitleBox(anchor: TextAnchor): TitleUnitBox {
  const width = Math.round(Math.max(24, Math.min(anchor.width * 0.76, anchor.width - 2)));
  const height = Math.round(Math.max(20, Math.min(44, anchor.height * 0.28, anchor.height - 2)));

  return {
    x: Math.round(clamp(anchor.x + (anchor.width - width) / 2, anchor.x, anchor.x + anchor.width - width)),
    y: Math.round(clamp(anchor.y + (anchor.height - height) / 2, anchor.y, anchor.y + anchor.height - height)),
    width,
    height,
    maxWidth: width,
    maxHeight: height,
    rotationDeg: 0,
  };
}

function createCollisionPolicy(): TitleLockupBlueprint["collisionPolicy"] {
  return {
    strategy: "reject",
    minGapPx: 16,
    avoidLogo: true,
    avoidMascot: true,
    avoidMainSubject: true,
  };
}

function createForbiddenZonePolicy(
  spatialStrategy: SpatialStrategy,
): TitleLockupBlueprint["forbiddenZonePolicy"] {
  return {
    forbiddenZoneIds: spatialStrategy.backgroundLayout.forbiddenZones.map((zone) => zone.id),
    allowOverlap: false,
    onConflict: "reject",
  };
}

function buildFallbackCandidates(
  input: GenerateTitleCandidatesInput,
  spatialStrategy: SpatialStrategy,
): TitleCandidate[] {
  const patternGroups = getFallbackPatternGroups(spatialStrategy);
  const semanticSplits = getSemanticTitleSplits(input.mainTitle);
  const anchor = getTextAnchorById(spatialStrategy, spatialStrategy.primaryTextAnchorId)
    ?? fallbackTextAnchor(spatialStrategy.primaryTextAnchorId);

  return patternGroups.map((patternKeys, index) => {
    const titleUnits = buildFallbackUnits(
      semanticSplits[index % semanticSplits.length],
      index,
      anchor,
      spatialStrategy.orientationPreference,
    );
    const subtitlePosition = getSubtitlePositionInAnchor(anchor);
    const subtitle = input.subtitle
      ? {
          text: input.subtitle,
          x: subtitlePosition.x,
          y: subtitlePosition.y,
          scale: 0.76,
          placement: "below" as const,
        }
      : undefined;

    return {
      candidateId: `fallback-${index + 1}`,
      spatialAnchorId: spatialStrategy.primaryTextAnchorId,
      strategyMode: spatialStrategy.strategyMode,
      orientationPreference: spatialStrategy.orientationPreference,
      patternKeys,
      hybridStrategy: `基于 ${patternKeys.join(" + ")} 组合生成字组节奏，不做固定模板套用。`,
      titleUnits,
      ...(subtitle ? { subtitle } : {}),
      effectIntent: getFallbackEffectIntent(patternKeys[0]),
      decorationIntents: getFallbackDecorationIntents(patternKeys[0]),
      readabilityPlan: "使用品牌安全字体、实心标题、轻描边或阴影，保证背景上可读。",
      backgroundFitReason: "回退候选按参考语法生成多个重心和字组结构，便于后续预览筛选。",
      whyNotTemplate: "字组数量、比例、位置和参考模式组合会随标题和设计家族变化，不是固定模板 12 选 1。",
    };
  });
}

function getFallbackPatternGroups(spatialStrategy: SpatialStrategy): TitleReferencePatternKey[][] {
  const primary = spatialStrategy.patternPool.primary;
  const secondary = spatialStrategy.patternPool.secondary;
  const exploratory = spatialStrategy.patternPool.exploratory;
  const primaryFallback = primary[0] || "cleanBrandCentered";
  const secondaryFallback = secondary[0] || primaryFallback;
  const exploratoryFallback = exploratory[0] || secondaryFallback;

  return [
    [primaryFallback],
    [primary[1] || primaryFallback],
    [primary[2] || primaryFallback],
    [primaryFallback, primary[1] || primaryFallback],
    [primaryFallback, secondaryFallback],
    [secondaryFallback, exploratoryFallback],
  ];
}

function buildFallbackUnits(
  parts: string[],
  candidateIndex: number,
  anchor: TextAnchor,
  orientationPreference: TitleOrientationPreference,
): TitleCandidateUnit[] {
  return parts.map((text, index) => {
    const position = getUnitPositionInAnchor(anchor, index, parts.length, candidateIndex, orientationPreference);
    const verticalFirst = orientationPreference === "verticalFirst";

    return {
      text,
      role: getFallbackUnitRole(index, parts.length),
      direction: verticalFirst && candidateIndex !== 2 ? "vertical" : "horizontal",
      x: position.x,
      y: position.y,
      scale: Math.min(1.8, 1 + index * 0.18 + (candidateIndex % 2) * 0.08),
      rotationDeg: orientationPreference === "diagonalAllowed" && candidateIndex % 3 === 2 ? -6 : 0,
    };
  });
}

function getUnitPositionInAnchor(
  anchor: TextAnchor,
  unitIndex: number,
  unitCount: number,
  candidateIndex: number,
  orientationPreference: TitleOrientationPreference,
): AnchorPosition {
  if (orientationPreference === "verticalFirst") {
    return {
      x: anchorX(anchor, 0.5 + (unitIndex - (unitCount - 1) / 2) * 0.14),
      y: anchorY(anchor, 0.2 + unitIndex * (0.58 / Math.max(1, unitCount - 1)) + candidateIndex * 0.015),
    };
  }

  if (orientationPreference === "horizontalFirst") {
    return {
      x: anchorX(anchor, 0.2 + unitIndex * (0.6 / Math.max(1, unitCount - 1))),
      y: anchorY(anchor, 0.42 + candidateIndex * 0.04),
    };
  }

  if (orientationPreference === "diagonalAllowed") {
    return {
      x: anchorX(anchor, 0.18 + unitIndex * (0.62 / Math.max(1, unitCount - 1))),
      y: anchorY(anchor, 0.25 + unitIndex * 0.18 + candidateIndex * 0.025),
    };
  }

  return {
    x: anchorX(anchor, 0.5),
    y: anchorY(anchor, 0.22 + unitIndex * (0.5 / Math.max(1, unitCount - 1)) + candidateIndex * 0.02),
  };
}

function getSubtitlePositionInAnchor(anchor: TextAnchor): AnchorPosition {
  return {
    x: anchorX(anchor, 0.5),
    y: anchorY(anchor, 0.86),
  };
}

function getSemanticSplitCandidates(mainTitle: string): TitleSemanticSplitCandidate[] {
  const configured = Object.values(TITLE_SEMANTIC_SPLITS)
    .find((split) => split.mainTitle === mainTitle);

  if (configured) {
    return configured.candidates;
  }

  return createGenericSemanticSplitCandidates(mainTitle);
}

function getSemanticSplitCandidateById(
  mainTitle: string,
  splitId: string,
): TitleSemanticSplitCandidate | undefined {
  return getSemanticSplitCandidates(mainTitle).find((candidate) => candidate.splitId === splitId);
}

function getAllowedCompositionModes(
  semanticSplits: readonly TitleSemanticSplitCandidate[],
  orientationPreference: TitleOrientationPreference,
): TitleCompositionMode[] {
  const preferredModes = semanticSplits.flatMap((split) => split.preferredCompositionModes);
  const uniqueModes = preferredModes.filter((mode, index, modes) => (
    modes.indexOf(mode) === index &&
    mode !== "platformCaption" &&
    TITLE_COMPOSITION_GRAMMAR[mode].anchorUsagePolicy === "mainTitleAllowed"
  ));

  const verticalModes = uniqueModes.filter((mode) => TITLE_COMPOSITION_GRAMMAR[mode].flowAxis === "vertical");
  const horizontalModes = uniqueModes.filter((mode) => TITLE_COMPOSITION_GRAMMAR[mode].flowAxis === "horizontal");
  const diagonalModes = uniqueModes.filter((mode) => TITLE_COMPOSITION_GRAMMAR[mode].flowAxis === "diagonal");
  const centeredModes = uniqueModes.filter((mode) => TITLE_COMPOSITION_GRAMMAR[mode].flowAxis === "centered");

  if (orientationPreference === "verticalFirst" && verticalModes.length > 0) {
    return [...verticalModes, ...centeredModes, ...horizontalModes, ...diagonalModes];
  }

  if (orientationPreference === "horizontalFirst" && horizontalModes.length > 0) {
    return [...horizontalModes, ...centeredModes, ...verticalModes, ...diagonalModes];
  }

  if (orientationPreference === "diagonalAllowed" && diagonalModes.length > 0) {
    return [...diagonalModes, ...verticalModes, ...horizontalModes, ...centeredModes];
  }

  return uniqueModes.length > 0 ? uniqueModes : ["stageMonument", "centerStageLockup"];
}

function anchorX(anchor: TextAnchor, ratio: number): number {
  return Math.round(clamp(anchor.x + anchor.width * ratio, anchor.x + 1, anchor.x + anchor.width - 1));
}

function anchorY(anchor: TextAnchor, ratio: number): number {
  return Math.round(clamp(anchor.y + anchor.height * ratio, anchor.y + 1, anchor.y + anchor.height - 1));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getSemanticTitleSplits(title: string): string[][] {
  if (title === "成长汇报课") {
    return [["成长", "汇报课"], ["成长", "汇报", "课"], ["成长汇报课"]];
  }

  if (title === "国学少年说") {
    return [["国学", "少年说"], ["国学少年说"]];
  }

  if (title === "春季新班招生") {
    return [["春季", "新班", "招生"], ["春季", "新班招生"], ["春季新班招生"]];
  }

  if (title === "暑假文学营") {
    return [["暑假", "文学营"], ["暑假文学营"]];
  }

  if (title === "诗词游园会") {
    return [["诗词", "游园会"], ["诗词游园会"]];
  }

  const suffixes = [
    "新班招生",
    "汇报课",
    "体验课",
    "公开课",
    "读书会",
    "游园会",
    "文学营",
    "少年说",
    "招生",
  ];
  const suffix = suffixes.find((item) => title.endsWith(item) && title.length > item.length);

  if (!suffix) {
    return [[title]];
  }

  const prefix = title.slice(0, title.length - suffix.length);

  return [[prefix, suffix], [title]];
}

function getFallbackUnitRole(index: number, unitCount: number): TitleCandidateUnitRole {
  if (unitCount === 1) return "main";
  if (index === 0) return "lead";
  if (index === unitCount - 1) return "main";
  return "accent";
}

function getFallbackEffectIntent(patternKey: TitleReferencePatternKey): TitleCandidateEffectIntent {
  const family = TITLE_REFERENCE_PATTERNS[patternKey].family;

  if (family === "stage" || family === "business") return "stageDepth";
  if (family === "chinese") return "chineseSeal";
  if (family === "campaign") return "campaignImpact";
  if (family === "literary") return "editorialSoft";
  if (family === "ip") return "playfulBadge";
  return "cleanReadable";
}

function getFallbackDecorationIntents(
  patternKey: TitleReferencePatternKey,
): TitleCandidateDecorationIntent[] {
  const family = TITLE_REFERENCE_PATTERNS[patternKey].family;

  if (family === "stage" || family === "business") return ["stageLight", "smallStars"];
  if (family === "chinese") return ["goldLine", "sealStamp"];
  if (family === "campaign") return ["campaignLabel", "growthArrow", "colorBlock"];
  if (family === "literary") return ["paperTag", "bookMark"];
  if (family === "ip") return ["badge", "playfulDot"];
  return ["none"];
}

function buildImageUrl(base64: string): string {
  const trimmed = base64.trim();
  return trimmed.startsWith("data:") ? trimmed : `data:image/jpeg;base64,${trimmed}`;
}

function stripJsonFence(content: string): string {
  return content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
}

function formatDiagnostic(
  diagnostic: CandidateValidationDiagnostic | LockupBlueprintValidationDiagnostic | LockupDraftValidationDiagnostic,
): string {
  const reason = diagnostic.reason || "unknown validation failure";
  return diagnostic.rawPreview
    ? `${reason}; rawPreview: ${diagnostic.rawPreview}`
    : reason;
}

function rawPreview(content: string): string {
  return sanitizeDiagnosticText(content, 2000);
}

function errorMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error);
  return sanitizeDiagnosticText(rawMessage, 500);
}

function formatUnknownValue(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function sanitizeDiagnosticText(value: string, maxLength: number): string {
  const apiKey = process.env.OPENAI_API_KEY;
  const withoutApiKey = apiKey ? value.replaceAll(apiKey, "[redacted]") : value;
  const withoutDataImage = withoutApiKey.replace(/data:image\/[a-zA-Z+.-]+;base64,[A-Za-z0-9+/=]+/g, "[redacted-image]");
  const withoutLongToken = withoutDataImage.replace(/[A-Za-z0-9+/]{200,}={0,2}/g, "[redacted-long-token]");

  return withoutLongToken.slice(0, maxLength);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isCoordinate(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1000;
}

function isRatioCoordinate(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function isRatioSize(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0 && value <= 1;
}

function isScale(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0.7 && value <= 1.8;
}

function isVisualWeight(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0.5 && value <= 10;
}

function isReadingOrder(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 1 && value <= 99;
}

function isRotation(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -15 && value <= 15;
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
