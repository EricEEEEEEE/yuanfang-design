import type { YuanfangLogoStrategy, YuanfangLogoStrategyKey } from "@/models/yuanfang-visual-rules";

function logoStrategy(input: YuanfangLogoStrategy): YuanfangLogoStrategy {
  return input;
}

export const YUANFANG_LOGO_STRATEGIES: Record<YuanfangLogoStrategyKey, YuanfangLogoStrategy> = {
  colorFullLockup: logoStrategy({
    key: "colorFullLockup",
    label: "彩色完整 Logo",
    logoVariantHint: "future color full lockup on light clean background",
    placementCandidates: ["top-right calm light area", "top band edge", "quiet corner outside motif"],
    protectionPolicy: "no patch by default; reserve clean low-detail light space for the full logo lockup: icon, Chinese, and English wordmark",
    promptGuidance: "Use a light, low-complexity logo-safe area where the future full-color logo can sit naturally without a box.",
    forbiddenSignals: ["default white patch", "only icon protected", "high detail behind wordmark"],
  }),
  whiteLockup: logoStrategy({
    key: "whiteLockup",
    label: "白色完整 Logo",
    logoVariantHint: "future pure white full lockup on deep brand background",
    placementCandidates: ["deep-blue top-right field", "dark color block", "quiet dark stage corner"],
    protectionPolicy: "no patch; keep a dark low-detail zone with enough contrast for the whole white logo lockup",
    promptGuidance: "When using deep blue or dark KV space, leave a clean dark zone suitable for a future pure white logo lockup.",
    forbiddenSignals: ["white label behind logo", "mixed bright detail behind wordmark", "generated logo substitute"],
  }),
  deepBlueLockup: logoStrategy({
    key: "deepBlueLockup",
    label: "深蓝完整 Logo",
    logoVariantHint: "future deep-blue lockup on warm pale background",
    placementCandidates: ["warm paper corner", "pale sky area", "light color block"],
    protectionPolicy: "no patch; reserve warm pale low-detail space for deep-blue full logo lockup clarity",
    promptGuidance: "Use a warm pale or light-blue low-detail zone suitable for a future deep-blue logo lockup.",
    forbiddenSignals: ["busy paper texture behind wordmark", "red-gold detail behind logo", "patch-like blank sticker"],
  }),
  repositionPreferred: logoStrategy({
    key: "repositionPreferred",
    label: "优先换位",
    logoVariantHint: "future logo variant selected after spatial analysis",
    placementCandidates: ["cleanest top corner", "quiet side band", "low-detail color block"],
    protectionPolicy: "prefer moving the future logo to a cleaner position before adding any protection layer",
    promptGuidance: "Do not default to a logo box; create multiple low-detail candidate areas so L4 can place the full logo safely.",
    forbiddenSignals: ["single forced top-right patch", "motif crossing logo lane", "no alternate logo-safe area"],
  }),
  minimalProtectionPatch: logoStrategy({
    key: "minimalProtectionPatch",
    label: "极简保护层兜底",
    logoVariantHint: "future logo may need minimal protection patch",
    placementCandidates: ["small calm patch at edge", "subtle translucent brand-safe capsule"],
    protectionPolicy: "last resort only; patch must protect the full logo lockup, not only the icon",
    promptGuidance: "Use only a subtle integrated protection shape if no clean logo position exists; avoid sticker-like boxes.",
    forbiddenSignals: ["default logo box", "large white label", "icon-only protection"],
  }),
};
