import OpenAI from "openai";
import { MODELS } from "@/config/models";

export type GenerateImageInput = {
  prompt: string;
};

export type GenerateImageResult = {
  imageBase64: string;
  modelUsed: string;
};

const OPENAI_API_KEY_MISSING = "OPENAI_API_KEY_MISSING";
const IMAGE_GENERATION_FAILED = "IMAGE_GENERATION_FAILED";
const IMAGE_RESULT_EMPTY = "IMAGE_RESULT_EMPTY";

export async function generateImage(
  input: GenerateImageInput,
): Promise<GenerateImageResult> {
  const prompt = input.prompt.trim();

  if (!prompt) {
    throw new Error(IMAGE_GENERATION_FAILED);
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(OPENAI_API_KEY_MISSING);
  }

  const client = new OpenAI({ apiKey });
  const modelUsed = MODELS.imageGeneration;

  try {
    const response = await client.images.generate({
      model: modelUsed,
      prompt,
      n: 1,
      size: MODELS.defaultSize,
      quality: MODELS.defaultQuality,
    });
    const imageBase64 = response.data?.[0]?.b64_json;

    if (!imageBase64) {
      throw new Error(IMAGE_RESULT_EMPTY);
    }

    return {
      imageBase64,
      modelUsed,
    };
  } catch (error) {
    if (error instanceof Error && error.message === IMAGE_RESULT_EMPTY) {
      throw error;
    }

    logImageGenerationError(error);
    throw new Error(IMAGE_GENERATION_FAILED);
  }
}

function logImageGenerationError(error: unknown): void {
  if (error instanceof Error) {
    console.error("Image generation error", {
      name: error.name,
      message: error.message,
      ...extractOpenAIErrorFields(error),
    });
    return;
  }

  if (isRecord(error)) {
    console.error("Image generation error", extractOpenAIErrorFields(error));
  }
}

function extractOpenAIErrorFields(
  error: object,
): Record<string, unknown> {
  return Object.fromEntries(
    ["status", "code", "type", "request_id"]
      .map((field) => [field, Reflect.get(error, field)])
      .filter(([, value]) => value !== undefined),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
