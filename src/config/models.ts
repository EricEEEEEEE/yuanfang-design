export type ImageQuality = "low" | "medium" | "high";

export type ModelConfig = {
  imageGeneration: string;
  imageEditing: string;
  recommendation: string;
  defaultQuality: ImageQuality;
  defaultSize: string;
};

export const MODELS: ModelConfig = {
  imageGeneration: "gpt-image-2",
  imageEditing: "gpt-image-1",
  recommendation: "gpt-4.1-mini",
  defaultQuality: "medium",
  defaultSize: "1024x1536",
};
