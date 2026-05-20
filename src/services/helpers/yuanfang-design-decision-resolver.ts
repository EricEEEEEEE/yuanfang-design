import { YUANFANG_VISUAL_RULE_LAYER } from "@/config/yuanfang-design-rules";
import type { YuanfangDesignDecision } from "@/models/yuanfang-design-decision";
import type { StandardImagePromptContext } from "@/models/standard-background-generation";
import { resolveDesignDecisionParts } from "@/services/helpers/yuanfang-design-decision-parts";
import type { ResolvedYuanfangVisualRules } from "@/services/helpers/yuanfang-visual-rule-resolver";
import { splitAvoidNotes } from "@/services/helpers/standard-background-prompt-utils";

export function resolveYuanfangDesignDecision(
  context: StandardImagePromptContext,
  rules: ResolvedYuanfangVisualRules,
): YuanfangDesignDecision {
  const parts = resolveDesignDecisionParts(context, rules);
  const treatment = YUANFANG_VISUAL_RULE_LAYER.styleTreatments[rules.selectedStyleTreatment];
  return {
    decisionSource: "yuanfang-design-decision-v1",
    benchmarkFamily: rules.family.key,
    layoutGrammar: rules.layout.key,
    selectedVisualFamily: parts.visualFamily,
    selectedCompositionFamily: parts.composition,
    selectedStyleTreatment: rules.selectedStyleTreatment,
    selectedCanvasIntent: rules.selectedCanvasIntent,
    selectedLogoStrategy: rules.selectedLogoStrategy,
    backgroundRole: parts.backgroundRole,
    titlePriorityMode: parts.titlePriorityMode,
    visualDominanceBudget: parts.visualDominanceBudget,
    foregroundReadiness: parts.foregroundReadiness,
    selectedTitleSafeDesign: parts.titleSafe,
    selectedVisualSubjectPlan: parts.subjectPlan,
    overlayReserveMode: parts.overlayMode,
    titleSafeGeometry: parts.geometry,
    titleSafeDesignPlan: parts.titleSafeDesignPlan,
    logoSafeDesign: `${rules.logoProtectionPolicy}; protect icon, Chinese wordmark, and English wordmark together.`,
    colorEnergy: treatment.colorEnergy,
    densityPlan: parts.densityPlan,
    motifPlan: parts.motifPlan,
    textPollutionGuard: parts.textPollutionGuard,
    differentiationPlan: parts.differentiationPlan,
    antiPatternWarnings: parts.antiPatterns,
    negativeSignals: splitAvoidNotes(context.form.avoidNotes ?? context.avoidNotes ?? "").slice(0, 6),
    promptDirectives: parts.promptDirectives,
    decisionReason: `Combined ${rules.family.key}, ${rules.layout.key}, ${rules.selectedStyleTreatment}, ${rules.selectedCanvasIntent}, ${rules.selectedLogoStrategy}, backgroundRole, titlePriorityMode, visualDominanceBudget, and foregroundReadiness before prompt assembly.`,
  };
}
