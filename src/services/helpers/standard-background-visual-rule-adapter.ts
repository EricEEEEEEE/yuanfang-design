import { YUANFANG_VISUAL_RULE_LAYER } from "@/config/yuanfang-design-rules";
import type { StandardImagePromptContext } from "@/models/standard-background-generation";
import type { YuanfangCanvasIntentKey, YuanfangLayoutGrammarKey, YuanfangLogoStrategyKey, YuanfangStyleTreatmentKey, YuanfangVisualFamilyKey } from "@/models/yuanfang-visual-rules";
import { resolveYuanfangVisualRules, type ResolvedYuanfangVisualRules } from "@/services/helpers/yuanfang-visual-rule-resolver";

export type StandardBackgroundVisualRuleContext = ResolvedYuanfangVisualRules & {
  selectedBenchmarkFamily: YuanfangVisualFamilyKey;
  selectedLayoutGrammar: YuanfangLayoutGrammarKey;
  selectedStyleTreatment: YuanfangStyleTreatmentKey;
  selectedCanvasIntent: YuanfangCanvasIntentKey;
  selectedLogoStrategy: YuanfangLogoStrategyKey;
  negativeRuleKeys: string[];
  promptLines: string[];
  negativePromptPhrases: string[];
};

export function buildStandardBackgroundVisualRuleContext(context: StandardImagePromptContext): StandardBackgroundVisualRuleContext {
  const resolved = resolveYuanfangVisualRules(context);
  const negativeRuleKeys = resolved.negativeRules.map((rule) => rule.key);
  return {
    ...resolved,
    selectedBenchmarkFamily: resolved.family.key,
    selectedLayoutGrammar: resolved.layout.key,
    selectedStyleTreatment: resolved.selectedStyleTreatment,
    selectedCanvasIntent: resolved.selectedCanvasIntent,
    selectedLogoStrategy: resolved.selectedLogoStrategy,
    negativeRuleKeys,
    promptLines: promptLines(resolved),
    negativePromptPhrases: resolved.negativeRules.map((rule) => rule.description),
  };
}

function promptLines(resolved: ResolvedYuanfangVisualRules): string[] {
  const family = resolved.family;
  const layout = resolved.layout;
  const treatment = YUANFANG_VISUAL_RULE_LAYER.styleTreatments[resolved.selectedStyleTreatment];
  const canvas = YUANFANG_VISUAL_RULE_LAYER.canvasIntents[resolved.selectedCanvasIntent];
  const logo = YUANFANG_VISUAL_RULE_LAYER.logoStrategies[resolved.selectedLogoStrategy];
  return [
    "L2 Yuanfang visual rule layer consumption:",
    `- visualRules.source: ${resolved.source}`,
    `- selectedBenchmarkFamily: ${family.key} (${family.label})`,
    `- benchmarkIntent: ${family.benchmarkIntent}`,
    `- selectedLayoutGrammar: ${layout.key} (${layout.label})`,
    `- selectedStyleTreatment: ${treatment.key} (${treatment.label})`,
    `- style treatment guidance: ${treatment.promptGuidance}`,
    `- style color energy: ${treatment.colorEnergy}`,
    `- style motif treatment: ${treatment.motifTreatment}`,
    `- selectedCanvasIntent: ${canvas.key} (${canvas.label}); aspectRatioClass: ${canvas.aspectRatioClass}; futureCanvas: ${canvas.futureCanvas}`,
    `- canvas intent guidance: ${canvas.promptGuidance}`,
    `- selectedLogoStrategy: ${logo.key} (${logo.label}); logoVariantHint: ${logo.logoVariantHint}`,
    `- logo placement candidates: ${logo.placementCandidates.join(" / ")}`,
    `- logo protection policy: ${logo.protectionPolicy}`,
    `- layout title placement: ${layout.titlePlacement}`,
    `- layout visual subject placement: ${layout.visualSubjectPlacement}`,
    `- family visual requirements: ${family.visualRequirements.join(" / ")}`,
    `- family primary motifs: ${family.primaryMotifs.join(" / ")}`,
    `- visualDensityTarget: ${resolved.visualDensityTarget}`,
    `- titleSafePolicy: ${resolved.titleSafePolicy}; this is a designed low-complexity zone, not a blank board.`,
    `- logoSafePolicy: ${resolved.logoSafePolicy}; protect the full future logo group, not only a tiny icon.`,
    "- do not default to a white logo patch; use a patch only when selectedLogoStrategy is minimalProtectionPatch.",
    `- family forbidden signals: ${family.forbiddenSignals.join(" / ")}`,
    `- layout forbidden cases: ${layout.forbiddenWhen.join(" / ")}`,
    "- avoid repetitive center-blank composition unless this selected layout explicitly requires a center hero lockup.",
    "- avoid lower-only decorative elements; distribute theme motifs according to the selected layout grammar.",
  ];
}
