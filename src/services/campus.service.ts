import { PrismaClient } from "@prisma/client";
import type { Campus, CampusBalanceOperation, CreateCampusInput, UpdateCampusInput } from "@/models/campus";

type CampusServiceErrorCode =
  | "CAMPUS_NOT_FOUND"
  | "INVALID_AMOUNT"
  | "INSUFFICIENT_BALANCE"
  | "CAMPUS_SERVICE_ERROR";

type CampusRecord = Omit<Campus, "createdAt"> & { createdAt: Date | string };

const prisma = new PrismaClient();

function toCampus(record: CampusRecord): Campus {
  return {
    ...record,
    createdAt:
      record.createdAt instanceof Date
        ? record.createdAt.toISOString()
        : record.createdAt,
  };
}

function fail(code: CampusServiceErrorCode): never {
  throw new Error(code);
}

function isBusinessError(error: unknown): boolean {
  return (
    error instanceof Error &&
    [
      "CAMPUS_NOT_FOUND",
      "INVALID_AMOUNT",
      "INSUFFICIENT_BALANCE",
      "CAMPUS_SERVICE_ERROR",
    ].includes(error.message)
  );
}

function normalizeError(error: unknown): never {
  if (isBusinessError(error)) throw error;
  fail("CAMPUS_SERVICE_ERROR");
}

function assertPositiveAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0) fail("INVALID_AMOUNT");
}

export async function createCampus(input: CreateCampusInput): Promise<Campus> {
  try {
    const campus = await prisma.campus.create({
      data: {
        name: input.name,
        address: input.address,
        phone: input.phone,
        balance: 0,
        isActive: true,
      },
    });

    return toCampus(campus);
  } catch (error) {
    normalizeError(error);
  }
}

export async function getCampusById(campusId: string): Promise<Campus> {
  try {
    const campus = await prisma.campus.findUnique({ where: { id: campusId } });

    if (!campus) fail("CAMPUS_NOT_FOUND");
    return toCampus(campus);
  } catch (error) {
    normalizeError(error);
  }
}

export async function listCampuses(): Promise<Campus[]> {
  try {
    const campuses = await prisma.campus.findMany({
      orderBy: { createdAt: "desc" },
    });

    return campuses.map(toCampus);
  } catch (error) {
    normalizeError(error);
  }
}

export async function updateCampus(
  campusId: string,
  input: UpdateCampusInput,
): Promise<Campus> {
  await getCampusById(campusId);

  try {
    const campus = await prisma.campus.update({
      where: { id: campusId },
      data: input,
    });

    return toCampus(campus);
  } catch (error) {
    normalizeError(error);
  }
}

export async function addBalance(
  operation: CampusBalanceOperation,
): Promise<Campus> {
  assertPositiveAmount(operation.amount);
  await getCampusById(operation.campusId);

  try {
    const campus = await prisma.campus.update({
      where: { id: operation.campusId },
      data: { balance: { increment: operation.amount } },
    });

    return toCampus(campus);
  } catch (error) {
    normalizeError(error);
  }
}

export async function deductBalance(
  operation: CampusBalanceOperation,
): Promise<Campus> {
  assertPositiveAmount(operation.amount);

  try {
    const updated = await prisma.campus.updateMany({
      where: {
        id: operation.campusId,
        balance: { gte: operation.amount },
      },
      data: { balance: { decrement: operation.amount } },
    });

    if (updated.count === 0) {
      const campus = await prisma.campus.findUnique({
        where: { id: operation.campusId },
      });
      fail(campus ? "INSUFFICIENT_BALANCE" : "CAMPUS_NOT_FOUND");
    }

    return getCampusById(operation.campusId);
  } catch (error) {
    normalizeError(error);
  }
}

export async function hasEnoughBalance(
  campusId: string,
  amount: number,
): Promise<boolean> {
  assertPositiveAmount(amount);
  const campus = await getCampusById(campusId);

  return campus.balance >= amount;
}
