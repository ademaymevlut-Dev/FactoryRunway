import {
  Prisma,
  TokenEntryType,
  TokenTransactionReason,
} from "@/generated/prisma/client";

type TokenClient = Prisma.TransactionClient;

export class InsufficientRunwayTokenBalanceError extends Error {
  constructor() {
    super("Runway Token balance is insufficient.");
    this.name = "InsufficientRunwayTokenBalanceError";
  }
}

export class RunwayTokenConcurrencyError extends Error {
  constructor() {
    super("Runway Token wallet changed concurrently.");
    this.name = "RunwayTokenConcurrencyError";
  }
}

export async function creditRunwayTokens(input: {
  amount: number;
  metadata?: Prisma.InputJsonObject;
  playerProfileId: string;
  reason: TokenTransactionReason;
  referenceKey: string;
  sourceId?: string | null;
  sourceType?: string | null;
  tx: TokenClient;
}) {
  const amount = Math.trunc(input.amount);

  if (amount <= 0) {
    return { alreadyCredited: false, amount: 0, balance: null };
  }

  const existingTransaction = await input.tx.playerTokenTransaction.findUnique({
    where: { referenceKey: input.referenceKey },
    select: { amountDelta: true, balanceAfter: true },
  });

  if (existingTransaction) {
    return {
      alreadyCredited: true,
      amount: existingTransaction.amountDelta,
      balance: existingTransaction.balanceAfter,
    };
  }

  const wallet = await input.tx.playerTokenWallet.upsert({
    where: { playerProfileId: input.playerProfileId },
    create: { playerProfileId: input.playerProfileId },
    update: {},
    select: { balance: true },
  });
  const balanceAfter = wallet.balance + amount;

  await input.tx.playerTokenWallet.update({
    where: { playerProfileId: input.playerProfileId },
    data: {
      balance: { increment: amount },
      version: { increment: 1 },
    },
  });
  await input.tx.playerTokenTransaction.create({
    data: {
      amountDelta: amount,
      balanceAfter,
      balanceBefore: wallet.balance,
      entryType: TokenEntryType.EARN,
      metadata: input.metadata,
      playerProfile: {
        connect: { id: input.playerProfileId },
      },
      reason: input.reason,
      referenceKey: input.referenceKey,
      sourceId: input.sourceId ?? null,
      sourceType: input.sourceType ?? null,
      wallet: {
        connect: { playerProfileId: input.playerProfileId },
      },
    },
  });

  return { alreadyCredited: false, amount, balance: balanceAfter };
}

export async function spendRunwayTokens(input: {
  amount: number;
  metadata?: Prisma.InputJsonObject;
  playerProfileId: string;
  reason: TokenTransactionReason;
  referenceKey: string;
  sourceId?: string | null;
  sourceType?: string | null;
  tx: TokenClient;
}) {
  const amount = Math.trunc(input.amount);

  if (amount <= 0) {
    throw new Error("Runway Token spend amount must be positive.");
  }

  const existingTransaction =
    await input.tx.playerTokenTransaction.findUnique({
      where: { referenceKey: input.referenceKey },
      select: {
        amountDelta: true,
        balanceAfter: true,
        entryType: true,
        playerProfileId: true,
      },
    });

  if (existingTransaction) {
    if (
      existingTransaction.entryType !== TokenEntryType.SPEND ||
      existingTransaction.playerProfileId !== input.playerProfileId ||
      existingTransaction.amountDelta !== -amount
    ) {
      throw new Error(
        "Runway Token reference key belongs to a different ledger entry.",
      );
    }

    return {
      alreadySpent: true,
      amount,
      balance: existingTransaction.balanceAfter,
    };
  }

  const wallet = await input.tx.playerTokenWallet.upsert({
    where: { playerProfileId: input.playerProfileId },
    create: { playerProfileId: input.playerProfileId },
    update: {},
    select: {
      balance: true,
      id: true,
      version: true,
    },
  });

  if (wallet.balance < amount) {
    throw new InsufficientRunwayTokenBalanceError();
  }

  const balanceAfter = wallet.balance - amount;
  const walletUpdate = await input.tx.playerTokenWallet.updateMany({
    where: {
      balance: { gte: amount },
      id: wallet.id,
      version: wallet.version,
    },
    data: {
      balance: { decrement: amount },
      version: { increment: 1 },
    },
  });

  if (walletUpdate.count !== 1) {
    const latestWallet = await input.tx.playerTokenWallet.findUnique({
      where: { id: wallet.id },
      select: { balance: true },
    });

    if (!latestWallet || latestWallet.balance < amount) {
      throw new InsufficientRunwayTokenBalanceError();
    }

    throw new RunwayTokenConcurrencyError();
  }

  await input.tx.playerTokenTransaction.create({
    data: {
      amountDelta: -amount,
      balanceAfter,
      balanceBefore: wallet.balance,
      entryType: TokenEntryType.SPEND,
      metadata: input.metadata,
      playerProfile: {
        connect: { id: input.playerProfileId },
      },
      reason: input.reason,
      referenceKey: input.referenceKey,
      sourceId: input.sourceId ?? null,
      sourceType: input.sourceType ?? null,
      wallet: {
        connect: { id: wallet.id },
      },
    },
  });

  return { alreadySpent: false, amount, balance: balanceAfter };
}
