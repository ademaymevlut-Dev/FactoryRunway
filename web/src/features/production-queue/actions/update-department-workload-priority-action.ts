"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  DepartmentKind,
  Prisma,
  ProductionOrderStatus,
  ProductionPlanStatus,
  RouteProgressStatus,
  ShiftSimulationStatus,
} from "@/generated/prisma/client";
import { getActiveShiftPlayback } from "@/features/game/services/shift-playback-view";
import {
  buildOrderPriorityUpdates,
  mergeDepartmentOrderPriority,
} from "@/features/orders/services/order-priority";
import { USER_ROLES } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";

export type UpdateDepartmentWorkloadPriorityResult =
  | { ok: true }
  | { ok: false; message: string };

const ACTIVE_ORDER_STATUSES = [
  ProductionOrderStatus.PLANNED,
  ProductionOrderStatus.RELEASED,
  ProductionOrderStatus.IN_PROGRESS,
  ProductionOrderStatus.WAITING_INPUT,
  ProductionOrderStatus.WAITING_OUTSOURCE,
] as const;

export async function updateDepartmentWorkloadPriorityAction(
  departmentKey: string,
  routeProgressIds: string[],
): Promise<UpdateDepartmentWorkloadPriorityResult> {
  const auth = await getCurrentUser();

  if (!auth) redirect("/");
  if (auth.role === USER_ROLES.ADMIN || auth.role === USER_ROLES.SUPER_ADMIN) {
    redirect("/admin");
  }

  const normalizedDepartmentKey = departmentKey.trim();
  const orderedRouteProgressIds = Array.from(
    new Set(routeProgressIds.map((id) => id.trim()).filter(Boolean)),
  );

  if (
    !normalizedDepartmentKey ||
    orderedRouteProgressIds.length === 0 ||
    orderedRouteProgressIds.length !== routeProgressIds.length
  ) {
    return { message: "İş yükü sırası doğrulanamadı.", ok: false };
  }

  const prisma = getPrisma();
  const factory = await prisma.factory.findFirst({
    where: { playerProfile: { userId: auth.id } },
    orderBy: { createdAt: "desc" },
    select: { currentDay: true, id: true, sectorId: true },
  });

  if (!factory) return { message: "Fabrika bulunamadı.", ok: false };

  try {
    await prisma.$transaction(
      async (tx) => {
        const department = await tx.department.findFirst({
          where: {
            key: normalizedDepartmentKey,
            kind: DepartmentKind.PRODUCTION,
            sectorId: factory.sectorId,
          },
          select: { id: true },
        });

        if (!department) throw new WorkloadPriorityError("Departman bulunamadı.");

        const [activePlayback, runningShift, lockedPlan, routeProgresses, orders] =
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
            tx.productionOrderRouteProgress.findMany({
              where: {
                departmentId: department.id,
                factoryId: factory.id,
                id: { in: orderedRouteProgressIds },
                status: {
                  in: [
                    RouteProgressStatus.READY,
                    RouteProgressStatus.IN_PROGRESS,
                    RouteProgressStatus.WAITING_OUTSOURCE,
                  ],
                },
              },
              select: { id: true, productionOrderId: true },
            }),
            tx.productionOrder.findMany({
              where: {
                factoryId: factory.id,
                remainingQuantity: { gt: 0 },
                status: { in: [...ACTIVE_ORDER_STATUSES] },
              },
              orderBy: [
                { priority: "asc" },
                { targetDeliveryDay: "asc" },
                { createdAt: "asc" },
                { id: "asc" },
              ],
              select: { id: true },
            }),
          ]);

        if (activePlayback || runningShift || lockedPlan) {
          throw new WorkloadPriorityError(
            "Vardiya aktifken iş yükü önceliği değiştirilemez.",
          );
        }
        if (routeProgresses.length !== orderedRouteProgressIds.length) {
          throw new WorkloadPriorityError(
            "Bazı iş yükleri bu fabrikaya veya departmana ait değil.",
          );
        }

        const orderIdByRouteProgressId = new Map(
          routeProgresses.map((progress) => [
            progress.id,
            progress.productionOrderId,
          ]),
        );
        const orderedDepartmentOrderIds = orderedRouteProgressIds.map(
          (id) => orderIdByRouteProgressId.get(id) ?? "",
        );
        const mergedOrderIds = mergeDepartmentOrderPriority(
          orders.map((order) => order.id),
          orderedDepartmentOrderIds,
        );

        if (!mergedOrderIds) {
          throw new WorkloadPriorityError("Sipariş önceliği birleştirilemedi.");
        }

        await Promise.all(
          buildOrderPriorityUpdates(mergedOrderIds).map(({ id, priority }) =>
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
    return {
      message:
        error instanceof Error ? error.message : "İş yükü sırası kaydedilemedi.",
      ok: false,
    };
  }

  revalidatePath("/game");
  return { ok: true };
}

class WorkloadPriorityError extends Error {}
