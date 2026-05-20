import type { YuanfangDesignDecision } from "@/models/yuanfang-design-decision";

export function designDecisionPromptLines(decision: YuanfangDesignDecision): string[] {
  return [
    "Yuanfang design decision:",
    `- decisionSource: ${decision.decisionSource}`,
    `- selectedVisualFamily: ${decision.selectedVisualFamily}`,
    `- selectedCompositionFamily: ${decision.selectedCompositionFamily}`,
    `- selectedStyleTreatment: ${decision.selectedStyleTreatment}`,
    `- selectedCanvasIntent: ${decision.selectedCanvasIntent}; horizontalKeyVisual is design intent only unless the API canvas changes later.`,
    `- selectedLogoStrategy: ${decision.selectedLogoStrategy}; reserve space for future logo asset selection, do not generate a logo.`,
    `- backgroundRole: ${decision.backgroundRole}; titlePriorityMode: ${decision.titlePriorityMode}`,
    `- visualDominanceBudget: backgroundPrimarySubject ${decision.visualDominanceBudget.backgroundPrimarySubject}; futureTitleDominanceReserved ${decision.visualDominanceBudget.futureTitleDominanceReserved}; decorativeDetailBudget ${decision.visualDominanceBudget.decorativeDetailBudget}`,
    `- highDetailZones: ${decision.visualDominanceBudget.highDetailZones}; titleRelevantArea: ${decision.visualDominanceBudget.titleRelevantArea}`,
    `- foregroundReadiness: ${decision.foregroundReadiness.hierarchy} ${decision.foregroundReadiness.support} ${decision.foregroundReadiness.avoid}`,
    `- spatial handoff: L4 will locate natural medium-low complexity regions later; do not draw a dedicated text holder in the image.`,
    `- selectedVisualSubjectPlan: ${decision.selectedVisualSubjectPlan}`,
    `- logoSafeDesign: ${decision.logoSafeDesign}`,
    `- colorEnergy: ${decision.colorEnergy}`,
    `- densityPlan: ${decision.densityPlan}`,
    `- motifPlan: ${decision.motifPlan}`,
    `- textPollutionGuard: ${decision.textPollutionGuard}`,
    `- differentiationPlan: ${decision.differentiationPlan}`,
    `- antiPatternWarnings: ${decision.antiPatternWarnings.join(" / ")}`,
    `- negativeSignals from avoidNotes, not positive style signals: ${decision.negativeSignals.join(" / ") || "none"}`,
    `- decisionReason: ${decision.decisionReason}`,
    ...decision.promptDirectives.map((item) => `- directive: ${item}`),
    "- whiteLockup means a future full-white logo asset, not a generated logo and not a white box.",
    "- minimalProtectionPatch is last resort; protect the full logo lockup including Chinese and English text.",
  ];
}
