import assert from "node:assert/strict";
import test from "node:test";

import {
  TokenEntryType,
  TokenTransactionReason,
} from "@/generated/prisma/client";

import {
  InsufficientRunwayTokenBalanceError,
  spendRunwayTokens,
} from "./runway-token-service";

test("RT harcaması bakiyeyi atomik düşürür ve SPEND ledger kaydı oluşturur", async () => {
  const createdEntries: Array<Record<string, unknown>> = [];
  const tx = {
    playerTokenTransaction: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdEntries.push(data);
        return data;
      },
      findUnique: async () => null,
    },
    playerTokenWallet: {
      findUnique: async () => ({ balance: 7 }),
      updateMany: async () => ({ count: 1 }),
      upsert: async () => ({ balance: 12, id: "wallet-1", version: 3 }),
    },
  } as never;
  const result = await spendRunwayTokens({
    amount: 5,
    playerProfileId: "player-1",
    reason: TokenTransactionReason.INSTALLATION_ACCELERATION,
    referenceKey: "acceleration-1",
    tx,
  });

  assert.deepEqual(result, {
    alreadySpent: false,
    amount: 5,
    balance: 7,
  });
  const createdEntry = createdEntries[0];
  assert.ok(createdEntry);
  assert.equal(createdEntry?.amountDelta, -5);
  assert.equal(createdEntry?.balanceBefore, 12);
  assert.equal(createdEntry?.balanceAfter, 7);
  assert.equal(createdEntry?.entryType, TokenEntryType.SPEND);
});

test("aynı RT reference key aynı harcamayı idempotent döndürür", async () => {
  const tx = {
    playerTokenTransaction: {
      findUnique: async () => ({
        amountDelta: -5,
        balanceAfter: 7,
        entryType: TokenEntryType.SPEND,
        playerProfileId: "player-1",
      }),
    },
  } as never;

  assert.deepEqual(
    await spendRunwayTokens({
      amount: 5,
      playerProfileId: "player-1",
      reason: TokenTransactionReason.INSTALLATION_ACCELERATION,
      referenceKey: "acceleration-1",
      tx,
    }),
    { alreadySpent: true, amount: 5, balance: 7 },
  );
});

test("yetersiz RT bakiyesi wallet mutasyonu yapmadan reddedilir", async () => {
  let updated = false;
  const tx = {
    playerTokenTransaction: { findUnique: async () => null },
    playerTokenWallet: {
      updateMany: async () => {
        updated = true;
        return { count: 0 };
      },
      upsert: async () => ({ balance: 2, id: "wallet-1", version: 1 }),
    },
  } as never;

  await assert.rejects(
    spendRunwayTokens({
      amount: 5,
      playerProfileId: "player-1",
      reason: TokenTransactionReason.INSTALLATION_ACCELERATION,
      referenceKey: "acceleration-1",
      tx,
    }),
    InsufficientRunwayTokenBalanceError,
  );
  assert.equal(updated, false);
});
