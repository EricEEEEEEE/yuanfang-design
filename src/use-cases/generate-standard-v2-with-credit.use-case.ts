import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PRICING } from "@/config/pricing";
import { GenerationMode, GenerationStatus, type Generation } from "@/models/generation";
import type { StandardGenerationResult } from "@/models/standard-generation";
import type {
  StandardGenerateV2Diagnostics,
  StandardGenerateV2ErrorCode,
  StandardGenerateV2GeneratedBackgroundDiagnostics,
  StandardGenerateV2Request,
} from "@/models/standard-generation-api-v2";
import { TransactionType } from "@/models/transaction";
import { createGeneration, updateGenerationStatus } from "@/services/generation.service";
import { createTransaction } from "@/services/transaction.service";
import { getPrisma } from "@/utils/prisma";

export type StandardV2CreditExecution = {
  result: StandardGenerationResult;
  assetWarnings: string[];
  summary: Record<string, unknown>;
  generatedBackground?: StandardGenerateV2GeneratedBackgroundDiagnostics;
};

export type StandardV2CreditExecutionFailure = {
  ok: false;
  status: number;
  code: StandardGenerateV2ErrorCode;
  message: string;
  diagnostics?: StandardGenerateV2Diagnostics;
};

export type StandardV2CreditExecutionResult =
  | ({ ok: true } & StandardV2CreditExecution)
  | StandardV2CreditExecutionFailure;

export type StandardV2CreditReservation = {
  generationId: string;
  userId: string;
  campusId: string;
  cost: number;
  balanceAfter: number;
};

type CreditFailure = { ok: false; status: number; code: StandardGenerateV2ErrorCode; message: string };
type ReserveCredit = (input: { request: StandardGenerateV2Request; requestId: string; cost: number }) => Promise<{ ok: true; reservation: StandardV2CreditReservation } | CreditFailure>;
type CompleteCreditSuccess = (input: { reservation: StandardV2CreditReservation; modelUsed: string }) => Promise<void>;
type RefundCreditFailure = (input: { reservation: StandardV2CreditReservation; reason: string }) => Promise<void>;

export type GenerateStandardV2WithCreditInput = {
  request: StandardGenerateV2Request;
  requestId: string;
  creditRequired: boolean;
  execute: () => Promise<StandardV2CreditExecutionResult>;
  dependencies?: {
    reserveCredit?: ReserveCredit;
    completeSuccess?: CompleteCreditSuccess;
    refundFailure?: RefundCreditFailure;
  };
};

export type GenerateStandardV2WithCreditResult =
  | ({ ok: true; credit?: StandardV2CreditReservation } & StandardV2CreditExecution)
  | StandardV2CreditExecutionFailure;

export async function generateStandardV2WithCredit(input: GenerateStandardV2WithCreditInput): Promise<GenerateStandardV2WithCreditResult> {
  if (!input.creditRequired) return input.execute();
  const cost = PRICING.standard;
  const reserve = await (input.dependencies?.reserveCredit ?? reserveInternalTestCredit)({ request: input.request, requestId: input.requestId, cost });
  if (!reserve.ok) return reserve;
  const reservation = reserve.reservation;

  try {
    const execution = await input.execute();
    if (!execution.ok) {
      await refund(input, reservation, execution.message);
      return execution;
    }
    if (standardGenerationSucceeded(execution.result)) {
      await (input.dependencies?.completeSuccess ?? completeCreditSuccess)({ reservation, modelUsed: modelUsed(execution) });
    } else {
      await refund(input, reservation, execution.result.reason);
    }
    return { ...execution, credit: reservation };
  } catch (error) {
    await refund(input, reservation, errorMessage(error));
    return { ok: false, status: 500, code: "internal_error", message: "Standard v2 generation failed after credit reservation." };
  }
}

async function reserveInternalTestCredit(input: { request: StandardGenerateV2Request; requestId: string; cost: number }): ReturnType<ReserveCredit> {
  const userId = process.env.YUANFANG_INTERNAL_TEST_CREDIT_USER_ID?.trim();
  const campusId = process.env.YUANFANG_INTERNAL_TEST_CREDIT_CAMPUS_ID?.trim();
  if (!userId || !campusId) return creditFailure("credit_gate_unavailable", "Internal test credit principal is not configured.", 500);

  try {
    return await getPrisma().$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, include: { campus: true } });
      if (!user || !user.isActive || user.campusId !== campusId || !user.campus?.isActive) {
        throw new CreditGateError("credit_gate_unavailable", "Internal test credit principal is invalid.", 500);
      }
      const generation = await createGeneration({
        id: randomUUID(),
        userId,
        campusId,
        mode: GenerationMode.STANDARD,
        sceneType: input.request.form.productOutputType,
        inputData: sanitizedInputData(input.request),
        uploadedImages: [],
        cost: input.cost,
        modelUsed: "pending",
        promptVersion: "standard-api-v2",
        templateId: "standard-form-v2",
      }, tx);
      const updated = await tx.campus.updateMany({ where: { id: campusId, isActive: true, balance: { gte: input.cost } }, data: { balance: { decrement: input.cost } } });
      if (updated.count === 0) throw new CreditGateError("insufficient_credit", "Campus balance is insufficient.", 402);
      const campus = await tx.campus.findUniqueOrThrow({ where: { id: campusId } });
      await createTransaction({ campusId, type: TransactionType.CONSUME, amount: input.cost, balanceAfter: campus.balance, referenceId: generation.id, operatorId: userId }, tx);
      return { ok: true, reservation: { generationId: generation.id, userId, campusId, cost: input.cost, balanceAfter: campus.balance } };
    });
  } catch (error) {
    if (error instanceof CreditGateError) return creditFailure(error.code, error.message, error.status);
    return creditFailure("credit_gate_unavailable", "Internal test credit gate failed.", 500);
  }
}

async function completeCreditSuccess(input: { reservation: StandardV2CreditReservation; modelUsed: string }): Promise<void> {
  await updateGenerationStatus({ generationId: input.reservation.generationId, status: GenerationStatus.SUCCESS, cost: input.reservation.cost, modelUsed: input.modelUsed, resultImageUrl: null, errorMessage: null });
}

async function refundCreditFailure(input: { reservation: StandardV2CreditReservation; reason: string }): Promise<void> {
  await getPrisma().$transaction(async (tx) => {
    const campus = await tx.campus.update({ where: { id: input.reservation.campusId }, data: { balance: { increment: input.reservation.cost } } });
    await createTransaction({ campusId: input.reservation.campusId, type: TransactionType.REFUND, amount: input.reservation.cost, balanceAfter: campus.balance, referenceId: input.reservation.generationId, operatorId: input.reservation.userId }, tx);
    await updateGenerationStatus({ generationId: input.reservation.generationId, status: GenerationStatus.FAILED, cost: 0, errorMessage: truncate(input.reason) }, tx);
  });
}

async function refund(input: GenerateStandardV2WithCreditInput, reservation: StandardV2CreditReservation, reason: string): Promise<void> {
  await (input.dependencies?.refundFailure ?? refundCreditFailure)({ reservation, reason });
}

function standardGenerationSucceeded(result: StandardGenerationResult): boolean {
  return Boolean(result.output && result.safety.passed && result.source === "standard-generation-integration-v1");
}

function modelUsed(execution: StandardV2CreditExecution): string {
  return execution.generatedBackground?.modelUsed ?? String(execution.summary.backgroundSource ?? "debugFixture");
}

function sanitizedInputData(request: StandardGenerateV2Request): Prisma.InputJsonObject {
  return {
    source: request.source ?? "standard-form-v2",
    brandKey: request.brandKey ?? "yuanfangDefault",
    canvas: request.canvas ?? { width: 1080, height: 1620 },
    form: request.form,
    title: request.title,
    background: request.background ?? { mode: "debugFixture" },
    options: {
      includeLogo: request.options?.includeLogo !== false,
      includeMascot: request.options?.includeMascot === true,
      includeCampusInfo: false,
      outputMimeType: "image/jpeg",
      jpegQuality: request.options?.jpegQuality ?? 78,
    },
  };
}

function creditFailure(code: StandardGenerateV2ErrorCode, message: string, status: number): CreditFailure {
  return { ok: false, status, code, message };
}

function truncate(value: string): string {
  return value.length > 500 ? `${value.slice(0, 497)}...` : value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

class CreditGateError extends Error {
  constructor(public readonly code: StandardGenerateV2ErrorCode, message: string, public readonly status: number) {
    super(message);
  }
}
