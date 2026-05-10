import { Prisma } from "@prisma/client";
import { getPrisma } from "@/utils/prisma";
import type {
  CreateTransactionInput,
  Transaction,
} from "@/models/transaction";

type TransactionServiceErrorCode =
  | "TRANSACTION_NOT_FOUND"
  | "TRANSACTION_SERVICE_ERROR";

type TransactionRecord = Omit<Transaction, "createdAt" | "type"> & {
  type: string;
  createdAt: Date | string;
};

function toTransaction(record: TransactionRecord): Transaction {
  return {
    id: record.id,
    campusId: record.campusId,
    type: record.type as Transaction["type"],
    amount: record.amount,
    balanceAfter: record.balanceAfter,
    referenceId: record.referenceId,
    operatorId: record.operatorId,
    createdAt:
      record.createdAt instanceof Date
        ? record.createdAt.toISOString()
        : record.createdAt,
  };
}

function fail(code: TransactionServiceErrorCode): never {
  throw new Error(code);
}

function isBusinessError(error: unknown): boolean {
  return (
    error instanceof Error &&
    ["TRANSACTION_NOT_FOUND", "TRANSACTION_SERVICE_ERROR"].includes(
      error.message,
    )
  );
}

function normalizeError(error: unknown): never {
  if (isBusinessError(error)) throw error;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") fail("TRANSACTION_NOT_FOUND");
    fail("TRANSACTION_SERVICE_ERROR");
  }

  fail("TRANSACTION_SERVICE_ERROR");
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<Transaction> {
  try {
    const prisma = getPrisma();
    const transaction = await prisma.transaction.create({
      data: {
        campusId: input.campusId,
        type: input.type,
        amount: input.amount,
        balanceAfter: input.balanceAfter,
        referenceId: input.referenceId,
        operatorId: input.operatorId,
      },
    });

    return toTransaction(transaction);
  } catch (error) {
    normalizeError(error);
  }
}

export async function getTransactionById(
  transactionId: string,
): Promise<Transaction> {
  try {
    const prisma = getPrisma();
    const transaction = await prisma.transaction.findUnique({
      where: {
        id: transactionId,
      },
    });

    if (!transaction) {
      fail("TRANSACTION_NOT_FOUND");
    }

    return toTransaction(transaction);
  } catch (error) {
    normalizeError(error);
  }
}

export async function listTransactionsByCampus(
  campusId: string,
): Promise<Transaction[]> {
  try {
    const prisma = getPrisma();
    const transactions = await prisma.transaction.findMany({
      where: {
        campusId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return transactions.map(toTransaction);
  } catch (error) {
    normalizeError(error);
  }
}
