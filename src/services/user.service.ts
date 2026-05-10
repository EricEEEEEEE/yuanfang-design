import { Prisma } from "@prisma/client";
import { prisma } from "@/utils/prisma";
import type { CreateUserInput, UpdateUserInput, User } from "@/models/user";

type UserServiceErrorCode =
  | "USER_NOT_FOUND"
  | "PHONE_ALREADY_EXISTS"
  | "USER_SERVICE_ERROR";

type UserRecord = Omit<User, "createdAt" | "role"> & {
  role: string;
  createdAt: Date | string;
};

function toUser(record: UserRecord): User {
  return {
    id: record.id,
    phone: record.phone,
    name: record.name,
    role: record.role as User["role"],
    campusId: record.campusId,
    isActive: record.isActive,
    createdAt:
      record.createdAt instanceof Date
        ? record.createdAt.toISOString()
        : record.createdAt,
  };
}

function fail(code: UserServiceErrorCode): never {
  throw new Error(code);
}

function isBusinessError(error: unknown): boolean {
  return (
    error instanceof Error &&
    ["USER_NOT_FOUND", "PHONE_ALREADY_EXISTS", "USER_SERVICE_ERROR"].includes(
      error.message,
    )
  );
}

function normalizeError(error: unknown): never {
  if (isBusinessError(error)) throw error;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") fail("USER_NOT_FOUND");
    if (error.code === "P2002") fail("PHONE_ALREADY_EXISTS");
  }

  fail("USER_SERVICE_ERROR");
}

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    const user = await prisma.user.create({
      data: {
        phone: input.phone,
        name: input.name,
        role: input.role,
        campusId: input.campusId,
        isActive: true,
      },
    });

    return toUser(user);
  } catch (error) {
    normalizeError(error);
  }
}

export async function getUserById(userId: string): Promise<User> {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) fail("USER_NOT_FOUND");
    return toUser(user);
  } catch (error) {
    normalizeError(error);
  }
}

export async function getUserByPhone(phone: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: {
        phone,
      },
    });

    return user ? toUser(user) : null;
  } catch (error) {
    normalizeError(error);
  }
}

export async function listUsersByCampus(campusId: string): Promise<User[]> {
  try {
    const users = await prisma.user.findMany({
      where: {
        campusId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return users.map(toUser);
  } catch (error) {
    normalizeError(error);
  }
}

export async function updateUser(
  userId: string,
  input: UpdateUserInput,
): Promise<User> {
  try {
    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: input,
    });

    return toUser(user);
  } catch (error) {
    normalizeError(error);
  }
}

export async function activateUser(userId: string): Promise<User> {
  return updateUser(userId, {
    isActive: true,
  });
}

export async function deactivateUser(userId: string): Promise<User> {
  return updateUser(userId, {
    isActive: false,
  });
}

export async function changeUserRole(
  userId: string,
  role: User["role"],
): Promise<User> {
  return updateUser(userId, { role });
}
