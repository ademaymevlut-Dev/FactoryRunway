"use server";

import { revalidatePath } from "next/cache";

import { Prisma, TaskObjectiveType } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";

import { advanceFactoryTaskProgress } from "../services/task-definition-service";

export async function recordTaskEventAction(input: {
  factoryId: string;
  objectiveType: TaskObjectiveType;
}): Promise<{ ok: boolean }> {
  const auth = await getCurrentUser();
  if (
    !auth ||
    !input.factoryId.trim() ||
    !Object.values(TaskObjectiveType).includes(input.objectiveType)
  ) {
    return { ok: false };
  }

  const prisma = getPrisma();
  const factory = await prisma.factory.findFirst({
    where: {
      id: input.factoryId,
      playerProfile: { userId: auth.id },
    },
    select: { id: true },
  });
  if (!factory) return { ok: false };

  await prisma.$transaction(
    (tx) =>
      advanceFactoryTaskProgress({
        factoryId: factory.id,
        event: { objectiveType: input.objectiveType, metadata: {} as Prisma.InputJsonObject },
        tx,
      }),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  revalidatePath("/game");

  return { ok: true };
}
