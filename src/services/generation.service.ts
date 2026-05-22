import { Prisma } from "@prisma/client";
import { getPrisma } from "@/utils/prisma";
import type { CreateGenerationInput, Generation, UpdateGenerationStatusInput } from "@/models/generation";

type GenerationServiceErrorCode = "GENERATION_NOT_FOUND" | "GENERATION_SERVICE_ERROR";
type PrismaLike = Pick<ReturnType<typeof getPrisma>, "generation">;
type GenerationRecord = Omit<Generation, "createdAt" | "mode" | "status" | "inputData" | "uploadedImages"> & {
  mode: string;
  status: string;
  inputData: Prisma.JsonValue;
  uploadedImages: Prisma.JsonValue;
  createdAt: Date | string;
};

function toGeneration(record: GenerationRecord): Generation {
  return {
    ...record,
    mode: record.mode as Generation["mode"],
    status: record.status as Generation["status"],
    inputData: isRecord(record.inputData) ? record.inputData : {},
    uploadedImages: Array.isArray(record.uploadedImages) ? record.uploadedImages.filter((item): item is string => typeof item === "string") : [],
    createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
  };
}

function fail(code: GenerationServiceErrorCode): never {
  throw new Error(code);
}

function normalizeError(error: unknown): never {
  if (error instanceof Error && ["GENERATION_NOT_FOUND", "GENERATION_SERVICE_ERROR"].includes(error.message)) throw error;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") fail("GENERATION_NOT_FOUND");
  }
  fail("GENERATION_SERVICE_ERROR");
}

export async function createGeneration(input: CreateGenerationInput, client: PrismaLike = getPrisma()): Promise<Generation> {
  try {
    const generation = await client.generation.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        userId: input.userId,
        campusId: input.campusId,
        mode: input.mode,
        sceneType: input.sceneType,
        inputData: input.inputData,
        uploadedImages: input.uploadedImages,
        resultImageUrl: null,
        cost: input.cost,
        modelUsed: input.modelUsed,
        status: "PENDING",
        errorMessage: null,
        promptVersion: input.promptVersion,
        templateId: input.templateId,
      },
    });
    return toGeneration(generation);
  } catch (error) {
    normalizeError(error);
  }
}

export async function updateGenerationStatus(input: UpdateGenerationStatusInput, client: PrismaLike = getPrisma()): Promise<Generation> {
  try {
    const generation = await client.generation.update({
      where: { id: input.generationId },
      data: {
        status: input.status,
        ...(input.cost !== undefined ? { cost: input.cost } : {}),
        ...(input.modelUsed ? { modelUsed: input.modelUsed } : {}),
        ...(input.resultImageUrl !== undefined ? { resultImageUrl: input.resultImageUrl } : {}),
        ...(input.errorMessage !== undefined ? { errorMessage: input.errorMessage } : {}),
      },
    });
    return toGeneration(generation);
  } catch (error) {
    normalizeError(error);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
