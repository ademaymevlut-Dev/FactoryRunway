import assert from "node:assert/strict";
import test from "node:test";

import { Prisma } from "@/generated/prisma/client";

import {
  isSerializableConflict,
  isUniqueConstraintError,
  retrySerializableTransaction,
  ShiftClaimConflictError,
  SHIFT_TRANSACTION_OPTIONS,
} from "./shift-transaction";

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("test error", {
    clientVersion: "test",
    code,
  });
}

test("Neon/Vercel transaction seçenekleri serializable ve sınırlı sürelidir", () => {
  assert.equal(
    SHIFT_TRANSACTION_OPTIONS.isolationLevel,
    Prisma.TransactionIsolationLevel.Serializable,
  );
  assert.equal(SHIFT_TRANSACTION_OPTIONS.maxWait, 5_000);
  assert.equal(SHIFT_TRANSACTION_OPTIONS.timeout, 15_000);
});

test("P2034 serializable conflict sonrası transactionı yeniden dener", async () => {
  let attempts = 0;

  const result = await retrySerializableTransaction(async () => {
    attempts += 1;

    if (attempts < 3) {
      throw prismaError("P2034");
    }

    return "completed";
  });

  assert.equal(result, "completed");
  assert.equal(attempts, 3);
});

test("P2002 unique claim conflict transaction retry döngüsünde tekrar çalıştırılmaz", async () => {
  let attempts = 0;
  const conflict = prismaError("P2002");

  await assert.rejects(
    retrySerializableTransaction(async () => {
      attempts += 1;
      throw conflict;
    }),
    conflict,
  );

  assert.equal(attempts, 1);
  assert.equal(isUniqueConstraintError(conflict), true);
  assert.equal(isSerializableConflict(conflict), false);
});

test("claim conflict fabrika ve simüle edilen günü korur", () => {
  const cause = prismaError("P2002");
  const error = new ShiftClaimConflictError({
    cause,
    factoryId: "factory-1",
    simulatedGameDay: 12,
  });

  assert.equal(error.factoryId, "factory-1");
  assert.equal(error.simulatedGameDay, 12);
  assert.equal(error.cause, cause);
});
