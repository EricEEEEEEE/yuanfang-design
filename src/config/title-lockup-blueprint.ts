import type { TitleCompositionMode } from "@/config/title-composition-grammar";
import type {
  TitleSemanticRole,
  TitleVisualRoleHint,
} from "@/config/title-semantic-splitter";

// Title Lockup Blueprint is a title visual-lockup design blueprint,
// not a legacy titleUnits point-coordinate list.
// It describes how semantic title units grow inside a spatial anchor as a
// designed lockup before vector glyph rendering and final composition.

export type TitleFlowAxis =
  | "vertical"
  | "horizontal"
  | "diagonal"
  | "centered";

export type TitleOrientationPreference =
  | "verticalFirst"
  | "horizontalFirst"
  | "diagonalFirst"
  | "centerFirst"
  | "balanced";

export type TitleUnitDirection = "horizontal" | "vertical" | "mixed";

export type TitleUnitAlignment =
  | "left"
  | "center"
  | "right"
  | "top"
  | "bottom";

export type TitleSubtitlePlacementPolicy =
  | "belowMainLockup"
  | "sideOfMainLockup"
  | "secondaryAnchor"
  | "hidden";

export type TitleBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TitleUnitBox = TitleBox & {
  maxWidth: number;
  maxHeight: number;
  rotationDeg: number;
};

export type TitleLockupBox = TitleBox & {
  safePadding: number;
  allowedOverflowPx: number;
};

export type TitleCollisionPolicy = {
  strategy: "reject" | "moveWithinAnchor" | "shrinkWithinAnchor" | "scorePenalty";
  minGapPx: number;
  avoidLogo: boolean;
  avoidMascot: boolean;
  avoidMainSubject: boolean;
};

export type TitleForbiddenZonePolicy = {
  forbiddenZoneIds: string[];
  allowOverlap: false;
  onConflict: "reject" | "moveWithinAnchor" | "shrinkWithinAnchor";
};

export type TitleSpatialContract = {
  spatialAnchorId: string;
  anchorBox: TitleBox;
  lockupBox: TitleLockupBox;
  flowAxis: TitleFlowAxis;
  secondaryAnchorDefaultUsage: "subtitleOrAuxiliaryOnly";
  collisionPolicy: TitleCollisionPolicy;
  forbiddenZonePolicy: TitleForbiddenZonePolicy;
  notes: string[];
};

export type TitleSubtitleLockup = {
  text: string;
  placementPolicy: TitleSubtitlePlacementPolicy;
  subtitleBox: TitleUnitBox | null;
  visualWeight: number;
  readingOrder: number;
};

export type TitleLockupUnit = {
  text: string;
  semanticRole: TitleSemanticRole;
  visualRole: TitleVisualRoleHint;
  unitBox: TitleUnitBox;
  direction: TitleUnitDirection;
  visualWeight: number;
  alignment: TitleUnitAlignment;
  readingOrder: number;
  allowEmphasis: boolean;
};

export type TitleLockupBlueprint = {
  candidateId: string;
  spatialAnchorId: string;
  semanticSplitId: string;
  mainTitle: string;
  compositionMode: TitleCompositionMode;
  flowAxis: TitleFlowAxis;
  orientationPreference: TitleOrientationPreference;
  patternKeys: string[];
  effectIntent: string;
  decorationIntents: string[];
  spatialContract: TitleSpatialContract;
  lockupBox: TitleLockupBox;
  titleUnits: TitleLockupUnit[];
  subtitleLockup: TitleSubtitleLockup;
  collisionPolicy: TitleCollisionPolicy;
  forbiddenZonePolicy: TitleForbiddenZonePolicy;
  readingOrder: string[];
  isFallbackCandidate: boolean;
  reason: string;
};

export type TitleLockupBlueprintValidationRule = {
  ruleId: string;
  severity: "error" | "warning";
  description: string;
};

export const TITLE_LOCKUP_BLUEPRINT_RULES: TitleLockupBlueprintValidationRule[] =
  [
    {
      ruleId: "lockupBox-inside-spatial-anchor",
      severity: "error",
      description: "lockupBox must stay inside spatial anchor unless allowedOverflowPx explicitly permits minor overflow.",
    },
    {
      ruleId: "titleUnits-inside-lockupBox",
      severity: "error",
      description: "titleUnits must stay inside lockupBox; unitBox values are lockup geometry, not loose point coordinates.",
    },
    {
      ruleId: "spatialContract-lockupBox-match-root",
      severity: "error",
      description: "spatialContract.lockupBox must match TitleLockupBlueprint.lockupBox to avoid duplicated geometry drifting apart.",
    },
    {
      ruleId: "titleUnits-join-mainTitle",
      severity: "error",
      description: "titleUnits joined by readingOrder must equal original mainTitle; no added, missing, rewritten, or reordered Chinese characters.",
    },
    {
      ruleId: "hero-visualWeight-dominates",
      severity: "error",
      description: "hero visualWeight must be greater than lead/accent/support unless candidate is explicitly diagnostic.",
    },
    {
      ruleId: "subtitle-not-insideHeroUnits",
      severity: "error",
      description: "subtitle insideHeroUnits is forbidden; subtitle must use belowMainLockup, sideOfMainLockup, secondaryAnchor, or hidden.",
    },
    {
      ruleId: "subtitle-not-betweenLeadAndHero",
      severity: "error",
      description: "subtitle betweenLeadAndHero is forbidden because it breaks semantic reading order and visual hierarchy.",
    },
    {
      ruleId: "secondary-anchor-not-main-title-default",
      severity: "error",
      description: "secondary anchor default usage is subtitleOrAuxiliaryOnly; it cannot default to carrying the primary main title lockup.",
    },
    {
      ruleId: "platformCaption-not-primary",
      severity: "error",
      description: "platformCaption cannot be primary main title lockup; it is for subtitle or auxiliary usage only.",
    },
    {
      ruleId: "vertical-flow-not-per-character",
      severity: "error",
      description: "vertical flow means the lockup grows along vertical space; it does not mean per-character vertical layout.",
    },
    {
      ruleId: "orientationPreference-not-flowAxis",
      severity: "error",
      description: "orientationPreference such as verticalFirst must not be treated as flowAxis; flowAxis is geometric while orientationPreference is strategic.",
    },
    {
      ruleId: "fallback-diagnostic-only",
      severity: "error",
      description: "fallback candidates are diagnostic only and must not be selected as final product output.",
    },
  ];
