"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";
import {
  retrySerializableTransaction,
  SHIFT_TRANSACTION_OPTIONS,
} from "@/features/game/services/shift-transaction";

import {
  claimTaskReward,
  type ClaimTaskRewardResult,
} from "../services/task-reward-service";

export type ClaimTaskRewardActionResult =
  | { ok: true; reward: ClaimTaskRewardResult }
  | {
      ok: false;
      code: "UNAUTHORIZED" | "INVALID_REQUEST" | "NOT_FOUND" | "NOT_COMPLETED" | "UNKNOWN_ERROR";
      message: string;
    };

export async function claimTaskRewardAction(
  taskProgressId: string,
): Promise<ClaimTaskRewardActionResult> {
  const auth = await getCurrentUser();

  if (!auth) {
    return { code: "UNAUTHORIZED", message: "Oturum bulunamadı.", ok: false };
  }

  const normalizedId = taskProgressId.trim();
  if (!normalizedId || normalizedId.length > 200) {
    return {
      code: "INVALID_REQUEST",
      message: "Görev kaydı doğrulanamadı.",
      ok: false,
    };
  }

  const prisma = getPrisma();
  const factory = await prisma.factory.findFirst({
    where: { playerProfile: { userId: auth.id } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!factory) {
    return { code: "NOT_FOUND", message: "Fabrika bulunamadı.", ok: false };
  }

  try {
    const reward = await retrySerializableTransaction(() =>
      prisma.$transaction(
        (tx) =>
          claimTaskReward({
            factoryId: factory.id,
            taskProgressId: normalizedId,
            tx,
          }),
        SHIFT_TRANSACTION_OPTIONS,
      ),
    );

    revalidatePath("/game");
    return { ok: true, reward };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Görev ödülü alınamadı.";

    if (message === "Görev henüz tamamlanmadı.") {
      return { code: "NOT_COMPLETED", message, ok: false };
    }
    if (message.includes("No FactoryTaskProgress found")) {
      return { code: "NOT_FOUND", message: "Görev bulunamadı.", ok: false };
    }

    console.error("Task reward claim failed.", error);
    return { code: "UNKNOWN_ERROR", message: "Görev ödülü alınamadı.", ok: false };
  }
}
