import { PRICING } from "../src/config/pricing";
import { GenerationStatus } from "../src/models/generation";
import type { StandardGenerationResult } from "../src/models/standard-generation";
import { TransactionType } from "../src/models/transaction";
import { generateStandardV2WithCredit, type StandardV2CreditReservation } from "../src/use-cases/generate-standard-v2-with-credit.use-case";
import { QUALITY_PAYLOAD } from "./helpers/standard-api-v2-fixtures";

type Store = {
  balance: number;
  generation?: { status: GenerationStatus; cost: number; modelUsed?: string; errorMessage?: string };
  transactions: Array<{ type: TransactionType; amount: number; balanceAfter: number }>;
  generateCalls: number;
};

async function main(): Promise<void> {
  const rows = [
    ["CREDIT_GATE_MISSING_ENV_FAIL_CLOSED", await missingEnv()],
    ["CREDIT_GATE_INSUFFICIENT_NO_GENERATE", await insufficient()],
    ["CREDIT_GATE_SUCCESS_CONSUME", await success()],
    ["CREDIT_GATE_FAILURE_REFUND", await failureRefund()],
  ] as const;
  for (const [label, passed] of rows) console.log(label, passed ? "PASS" : "FAIL");
  if (rows.some(([, passed]) => !passed)) process.exitCode = 1;
}

async function missingEnv(): Promise<boolean> {
  const previousUser = process.env.YUANFANG_INTERNAL_TEST_CREDIT_USER_ID;
  const previousCampus = process.env.YUANFANG_INTERNAL_TEST_CREDIT_CAMPUS_ID;
  delete process.env.YUANFANG_INTERNAL_TEST_CREDIT_USER_ID;
  delete process.env.YUANFANG_INTERNAL_TEST_CREDIT_CAMPUS_ID;
  let called = false;
  const result = await generateStandardV2WithCredit({
    request: QUALITY_PAYLOAD,
    requestId: "credit-missing-env",
    creditRequired: true,
    execute: async () => { called = true; return execution(successResult()); },
  });
  restoreEnv(previousUser, previousCampus);
  return !called && !result.ok && result.code === "credit_gate_unavailable" && result.status === 500;
}

async function insufficient(): Promise<boolean> {
  const store = createStore(PRICING.standard - 1);
  const result = await generateStandardV2WithCredit({
    request: QUALITY_PAYLOAD,
    requestId: "credit-insufficient",
    creditRequired: true,
    execute: async () => { store.generateCalls += 1; return execution(successResult()); },
    dependencies: fakeDeps(store),
  });
  return !result.ok && result.status === 402 && result.code === "insufficient_credit" && store.generateCalls === 0 && store.transactions.length === 0 && !store.generation;
}

async function success(): Promise<boolean> {
  const store = createStore(500);
  const result = await generateStandardV2WithCredit({
    request: QUALITY_PAYLOAD,
    requestId: "credit-success",
    creditRequired: true,
    execute: async () => { store.generateCalls += 1; return execution(successResult()); },
    dependencies: fakeDeps(store),
  });
  return result.ok &&
    store.balance === 300 &&
    store.generateCalls === 1 &&
    store.generation?.status === GenerationStatus.SUCCESS &&
    store.generation.cost === PRICING.standard &&
    store.generation.modelUsed === "gpt-image-2" &&
    store.transactions.length === 1 &&
    store.transactions[0]?.type === TransactionType.CONSUME;
}

async function failureRefund(): Promise<boolean> {
  const store = createStore(500);
  const result = await generateStandardV2WithCredit({
    request: QUALITY_PAYLOAD,
    requestId: "credit-failure",
    creditRequired: true,
    execute: async () => { store.generateCalls += 1; return execution(failedResult()); },
    dependencies: fakeDeps(store),
  });
  return result.ok &&
    store.balance === 500 &&
    store.generateCalls === 1 &&
    store.generation?.status === GenerationStatus.FAILED &&
    store.generation.cost === 0 &&
    store.transactions.map((item) => item.type).join("|") === "CONSUME|REFUND";
}

function fakeDeps(store: Store) {
  return {
    reserveCredit: async ({ cost }: { cost: number }) => {
      if (store.balance < cost) return { ok: false as const, status: 402, code: "insufficient_credit" as const, message: "insufficient" };
      store.balance -= cost;
      store.generation = { status: GenerationStatus.PENDING, cost };
      store.transactions.push({ type: TransactionType.CONSUME, amount: cost, balanceAfter: store.balance });
      return { ok: true as const, reservation: reservation(cost, store.balance) };
    },
    completeSuccess: async ({ modelUsed }: { reservation: StandardV2CreditReservation; modelUsed: string }) => {
      if (store.generation) Object.assign(store.generation, { status: GenerationStatus.SUCCESS, modelUsed });
    },
    refundFailure: async ({ reservation, reason }: { reservation: StandardV2CreditReservation; reason: string }) => {
      store.balance += reservation.cost;
      if (store.generation) Object.assign(store.generation, { status: GenerationStatus.FAILED, cost: 0, errorMessage: reason });
      store.transactions.push({ type: TransactionType.REFUND, amount: reservation.cost, balanceAfter: store.balance });
    },
  };
}

function execution(result: StandardGenerationResult) {
  return {
    ok: true as const,
    result,
    assetWarnings: [],
    summary: { backgroundSource: "generatedBackground" },
    generatedBackground: { source: "standard-background-generation-v1" as const, modelUsed: "gpt-image-2" },
  };
}

function successResult(): StandardGenerationResult {
  return { ...baseResult(), source: "standard-generation-integration-v1", output: { input: Buffer.from([255, 216, 255]), width: 1080, height: 1620, mimeType: "image/jpeg", quality: 78, sha256: "ok", byteLength: 3 }, safety: { passed: true, checks: [] }, reason: "ok" };
}

function failedResult(): StandardGenerationResult {
  return { ...baseResult(), safety: { passed: false, checks: [{ code: "no_output", passed: false, severity: "error", reason: "fixture failure" }] }, reason: "fixture generation failed" };
}

function baseResult(): StandardGenerationResult {
  return { source: "diagnostic-only", diagnostics: { finalCandidatePoolIds: [], recommendedCandidateIds: [], attemptedCandidateIds: [], titleAssetFailureReasons: [], warnings: [] }, safety: { passed: false, checks: [] }, warnings: [], reason: "fixture" };
}

function createStore(balance: number): Store {
  return { balance, transactions: [], generateCalls: 0 };
}

function reservation(cost: number, balanceAfter: number): StandardV2CreditReservation {
  return { generationId: "gen-credit-test", userId: "user-credit-test", campusId: "campus-credit-test", cost, balanceAfter };
}

function restoreEnv(userId: string | undefined, campusId: string | undefined): void {
  if (userId === undefined) delete process.env.YUANFANG_INTERNAL_TEST_CREDIT_USER_ID;
  else process.env.YUANFANG_INTERNAL_TEST_CREDIT_USER_ID = userId;
  if (campusId === undefined) delete process.env.YUANFANG_INTERNAL_TEST_CREDIT_CAMPUS_ID;
  else process.env.YUANFANG_INTERNAL_TEST_CREDIT_CAMPUS_ID = campusId;
}

main().catch((error: unknown) => {
  console.error("STANDARD_V2_CREDIT_GATE_TEST_FAILED", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
