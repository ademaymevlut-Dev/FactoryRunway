import { Prisma } from "@/generated/prisma/client";

export const SHIFT_TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5_000,
  timeout: 15_000,
} as const;

const MAX_SERIALIZABLE_ATTEMPTS = 3;

export class ShiftClaimConflictError extends Error {
  readonly factoryId: string;
  readonly simulatedGameDay: number;

  constructor(input: {
    factoryId: string;
    simulatedGameDay: number;
    cause: unknown;
  }) {
    super("Factory shift was already claimed for this game day.", {
      cause: input.cause,
    });
    this.name = "ShiftClaimConflictError";
    this.factoryId = input.factoryId;
    this.simulatedGameDay = input.simulatedGameDay;
  }
}

export function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export function isSerializableConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export async function retrySerializableTransaction<T>(
  runTransaction: () => Promise<T>,
  maxAttempts: number = MAX_SERIALIZABLE_ATTEMPTS,
): Promise<T> {
  const attempts = Math.max(1, maxAttempts);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await runTransaction();
    } catch (error) {
      if (!isSerializableConflict(error) || attempt === attempts) {
        throw error;
      }
    }
  }

  throw new Error("Serializable transaction retry loop exited unexpectedly.");
}
