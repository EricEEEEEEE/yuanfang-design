import type { TitleHierarchyContext, TitleHierarchyIntent, TitleSubtitlePriority } from "@/models/title-hierarchy-context";
import type { StandardGenerateV2Request } from "@/models/standard-generation-api-v2";
import { detectVisualHook } from "./diagnostics";

export function buildTitleHierarchyContext(request: StandardGenerateV2Request): TitleHierarchyContext {
  const hook = detectVisualHook(request);
  const mainTitle = request.title.mainTitle.trim();
  const subtitle = request.title.subtitle?.trim();
  const primaryMessage = hook.detectedPrimaryMessage?.trim();
  const inMainTitle = Boolean(primaryMessage && mainTitle.includes(primaryMessage));
  const inSubtitle = Boolean(primaryMessage && subtitle?.includes(primaryMessage));
  const hierarchyIntent = resolveHierarchyIntent(Boolean(primaryMessage), inMainTitle, inSubtitle, hook.source);
  const recommendedSubtitlePriority = resolveSubtitlePriority(hierarchyIntent, Boolean(subtitle), hook.mainTitleMismatch === true);
  const warnings = [
    ...(primaryMessage && !inMainTitle && !inSubtitle
      ? [`primaryMessage "${primaryMessage}" is hierarchy guidance only because it is not visible title text.`]
      : []),
    ...(hook.mismatchReason ? [hook.mismatchReason] : []),
  ];

  return {
    source: "standard-form-v2-primary-message",
    mainTitle,
    ...(subtitle ? { subtitle } : {}),
    ...(primaryMessage ? { primaryMessage } : {}),
    hookSource: hook.hookSource ?? hook.source,
    mainTitleMismatch: hook.mainTitleMismatch === true,
    titleHierarchyRisk: hook.titleHierarchyRisk ?? "none",
    titleBrief: request.form.titleBrief.trim(),
    ...(request.title.titleEmphasisWords?.filter(Boolean).length ? { titleEmphasisWords: request.title.titleEmphasisWords.filter(Boolean) } : {}),
    hierarchyIntent,
    recommendedSubtitlePriority,
    visibleTextPolicy: {
      preserveMainTitle: true,
      noNewTitleText: true,
      allowedVisibleText: [mainTitle, subtitle].filter((item): item is string => Boolean(item)),
    },
    warnings,
  };
}

function resolveHierarchyIntent(
  hasPrimaryMessage: boolean,
  inMainTitle: boolean,
  inSubtitle: boolean,
  source: TitleHierarchyContext["hookSource"],
): TitleHierarchyIntent {
  if (!hasPrimaryMessage || source === "mainTitle") return "mainTitlePrimary";
  if (inMainTitle) return "mainTitleKeywordEmphasis";
  if (inSubtitle) return "subtitleHookSupport";
  return "briefOnlyThemeSupport";
}

function resolveSubtitlePriority(
  intent: TitleHierarchyIntent,
  hasSubtitle: boolean,
  mainTitleMismatch: boolean,
): TitleSubtitlePriority {
  if (!hasSubtitle) return "normal";
  if (intent === "subtitleHookSupport") return "strong";
  if (mainTitleMismatch || intent === "briefOnlyThemeSupport") return "preserveIfSafe";
  return "normal";
}
