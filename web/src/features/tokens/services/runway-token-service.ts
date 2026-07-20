import {
  Prisma,
  TokenEntryType,
  TokenTransactionReason,
} from "@/generated/prisma/client";

type TokenClient = Prisma.TransactionClient;

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
