import { createHash } from "node:crypto";
import type { StandardImagePromptContext } from "@/models/standard-background-generation";

export function buildWarnings(context: StandardImagePromptContext): string[] {
  return [
    ...(context.outputIntent.backgroundOnly ? [] : ["outputIntent must remain backgroundOnly."]),
    ...(context.visualHook?.possibleMismatch && context.visualHook.mismatchReason ? [context.visualHook.mismatchReason] : []),
  ];
}

export function consumedFields(context: StandardImagePromptContext): string[] {
  return ["productOutputType", "eventBrief", "styleBrief", "visualDetails", "titleBrief", "avoidNotes", "mainTitle", "subtitle", ...(context.visualHook?.primaryHook ? ["visualHook"] : [])];
}

export function allBriefText(context: StandardImagePromptContext): string {
  return [context.visualHook?.primaryHook, context.form.eventBrief, context.form.styleBrief, context.form.visualDetails, context.form.titleBrief, context.form.avoidNotes].filter(Boolean).join(" ");
}

export function hasAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

export function splitAvoidNotes(value: string): string[] {
  return value.split(/[，,;；、\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 12);
}

export function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

export function formatPalette(colors: Record<string, string>): string {
  return Object.entries(colors).map(([key, value]) => `${key} ${value}`).join(", ");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
