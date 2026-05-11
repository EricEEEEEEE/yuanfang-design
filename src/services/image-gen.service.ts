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

    throw new Error(IMAGE_GENERATION_FAILED);
  }
}
