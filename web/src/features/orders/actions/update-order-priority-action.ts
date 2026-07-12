"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  Prisma,
  ProductionOrderStatus,
  ProductionPlanStatus,
  ShiftSimulationStatus,
} from "@/generated/prisma/client";
import { getActiveShiftPlayback } from "@/features/game/services/shift-playback-view";
import { USER_ROLES } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";
import {
  buildOrderPriorityUpdates,
  hasExactOrderOwnership,
} from "../services/order-priority";

export type UpdateOrderPriorityResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "FACTORY_NOT_FOUND"
        | "INVALID_ORDER_LIST"
        | "ORDER_NOT_FOUND"
        | "SHIFT_LOCKED"
        | "UNKNOWN_ERROR";
      message: string;
    };

const ACTIVE_ORDER_STATUSES = [
  ProductionOrderStatus.PLANNED,
  ProductionOrderStatus.RELEASED,
  ProductionOrderStatus.IN_PROGRESS,
  ProductionOrderStatus.WAITING_INPUT,
  ProductionOrderStatus.WAITING_OUTSOURCE,
] as const;

export async function updateOrderPriorityAction(
  productionOrderIds: string[],
): Promise<UpdateOrderPriorityResult> {
  const auth = await getCurrentUser();

  if (!auth) redirect("/");
  if (auth.role === USER_ROLES.ADMIN || auth.role === USER_ROLES.SUPER_ADMIN) {
    redirect("/admin");
  }

  const orderedIds = Array.from(
    new Set(productionOrderIds.map((id) => id.trim()).filter(Boolean)),
  );

  if (
    orderedIds.length === 0 ||
    orderedIds.length !== productionOrderIds.length
  ) {
    return failure(
      "INVALID_ORDER_LIST",
      "Sipariş öncelik listesi doğrulanamadı.",
    );
  }

  const prisma = getPrisma();
  const factory = await prisma.factory.findFirst({
    where: { playerProfile: { userId: auth.id } },
    orderBy: { createdAt: "desc" },
    select: { currentDay: true, id: true },
  });

  if (!factory) {
    return failure("FACTORY_NOT_FOUND", "Fabrika kaydı bulunamadı.");
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const [activePlayback, runningShift, lockedPlan, orders] =
          await Promise.all([
            getActiveShiftPlayback({ factoryId: factory.id, prisma: tx }),
            tx.shiftSimulation.findFirst({
              where: {
                factoryId: factory.id,
                status: ShiftSimulationStatus.RUNNING,
              },
              select: { id: true },
            }),
            tx.productionPlan.findFirst({
              where: {
                factoryId: factory.id,
                gameDay: factory.currentDay,
                status: ProductionPlanStatus.LOCKED,
              },
              select: { id: true },
            }),
            tx.productionOrder.findMany({
              where: {
                factoryId: factory.id,
                remainingQuantity: { gt: 0 },
                status: { in: [...ACTIVE_ORDER_STATUSES] },
              },
              select: { id: true },
            }),
          ]);

        if (activePlayback || runningShift || lockedPlan) {
          throw new OrderPriorityError(
            "SHIFT_LOCKED",
            "Vardiya aktifken sipariş önceliği değiştirilemez.",
          );
        }
        if (
          !hasExactOrderOwnership(
            orderedIds,
            orders.map((order) => order.id),
          )
        ) {
          throw new OrderPriorityError(
            "ORDER_NOT_FOUND",
            "Bazı siparişler bu fabrikaya ait değil veya artık üretilebilir değil.",
          );
        }

        await Promise.all(
          buildOrderPriorityUpdates(orderedIds).map(({ id, priority }) =>
            tx.productionOrder.update({
              where: { id },
              data: { priority },
            }),
          ),
        );
        await tx.productionPlan.updateMany({
          where: {
            factoryId: factory.id,
            gameDay: factory.currentDay,
            status: ProductionPlanStatus.DRAFT,
          },
          data: { status: ProductionPlanStatus.DIRTY },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 10_000,
      },
    );
  } catch (error) {
    if (error instanceof OrderPriorityError) {
      return failure(error.code, error.message);
    }

    return failure("UNKNOWN_ERROR", "Sipariş önceliği kaydedilemedi.");
  }

  revalidatePath("/game");
  return { ok: true };
}

class OrderPriorityError extends Error {
  constructor(
    readonly code: Extract<UpdateOrderPriorityResult, { ok: false }>["code"],
    message: string,
  ) {
    super(message);
  }
}

function failure(
  code: Extract<UpdateOrderPriorityResult, { ok: false }>["code"],
  message: string,
): UpdateOrderPriorityResult {
  return { code, message, ok: false };
}
