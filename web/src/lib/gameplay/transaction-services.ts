import { Prisma, StaffType } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

const gameplayTransactionBrand: unique symbol = Symbol("gameplayTransaction");

export type GameplayTransaction = Prisma.TransactionClient & {
  readonly [gameplayTransactionBrand]: true;
};

export const FACTORY_STAFF_SCOPE_KEY = "FACTORY";

export function getFactoryStaffScopeKey(factoryProductionLineId: string | null | undefined) {
  return factoryProductionLineId ?? FACTORY_STAFF_SCOPE_KEY;
}

export async function runGameplayTransaction<T>(
  operation: (transaction: GameplayTransaction) => Promise<T>,
) {
  return getPrisma().$transaction(
    (transaction) => operation(transaction as GameplayTransaction),
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

type UpsertFactoryStaffAssignmentInput = {
  factoryId: string;
  staffRoleId: string;
  factoryProductionLineId?: string | null;
  quantity: number;
};

export async function upsertFactoryStaffAssignment(
  input: UpsertFactoryStaffAssignmentInput,
) {
  if (!Number.isInteger(input.quantity) || input.quantity < 0) {
    throw new Error("Personel adedi negatif olmayan bir tam sayı olmalı.");
  }

  return runGameplayTransaction(async (transaction) => {
    const [factory, staffRole] = await Promise.all([
      transaction.factory.findUniqueOrThrow({
        where: { id: input.factoryId },
        select: { sectorId: true },
      }),
      transaction.staffRole.findUniqueOrThrow({
        where: { id: input.staffRoleId },
        select: {
          sectorId: true,
          departmentId: true,
          staffType: true,
        },
      }),
    ]);

    if (factory.sectorId !== staffRole.sectorId) {
      throw new Error("Personel rolü ve fabrika aynı sektöre ait olmalı.");
    }

    const factoryProductionLineId = input.factoryProductionLineId ?? null;

    if (staffRole.staffType === StaffType.DIRECT_PRODUCTION && !factoryProductionLineId) {
      throw new Error("Direkt üretim personeli bir üretim hattına atanmalı.");
    }

    if (staffRole.staffType !== StaffType.DIRECT_PRODUCTION && factoryProductionLineId) {
      throw new Error("Support ve management personeli fabrika kapsamına atanmalı.");
    }

    if (factoryProductionLineId) {
      const productionLine = await transaction.factoryProductionLine.findFirstOrThrow({
        where: {
          id: factoryProductionLineId,
          factoryId: input.factoryId,
        },
        select: { departmentId: true },
      });

      if (
        staffRole.departmentId &&
        staffRole.departmentId !== productionLine.departmentId
      ) {
        throw new Error("Personel rolü ve üretim hattı aynı departmana ait olmalı.");
      }
    }

    const scopeKey = getFactoryStaffScopeKey(factoryProductionLineId);

    return transaction.factoryStaffAssignment.upsert({
      where: {
        factoryId_staffRoleId_scopeKey: {
          factoryId: input.factoryId,
          staffRoleId: input.staffRoleId,
          scopeKey,
        },
      },
      create: {
        factoryId: input.factoryId,
        staffRoleId: input.staffRoleId,
        factoryProductionLineId,
        scopeKey,
        quantity: input.quantity,
      },
      update: {
        factoryProductionLineId,
        quantity: input.quantity,
      },
    });
  });
}

export async function syncMarketOrderOfferAggregates(
  transaction: GameplayTransaction,
  marketOrderOfferId: string,
  departmentLoadSnapshot?: Prisma.InputJsonValue,
) {
  const totals = await transaction.marketOrderOfferItem.aggregate({
    where: { marketOrderOfferId },
    _sum: {
      quantity: true,
      totalPriceCents: true,
      estimatedProfitCents: true,
      requiredTotalPoints: true,
    },
  });

  return transaction.marketOrderOffer.update({
    where: { id: marketOrderOfferId },
    data: {
      totalQuantity: totals._sum.quantity ?? 0,
      totalRevenueCents: totals._sum.totalPriceCents ?? BigInt(0),
      estimatedProfitCents: totals._sum.estimatedProfitCents,
      requiredTotalPoints: totals._sum.requiredTotalPoints ?? 0,
      ...(departmentLoadSnapshot === undefined
        ? {}
        : { departmentLoadSnapshot }),
    },
  });
}

export async function syncCustomerOrderAggregates(
  transaction: GameplayTransaction,
  customerOrderId: string,
) {
  const totals = await transaction.customerOrderItem.aggregate({
    where: { customerOrderId },
    _sum: {
      quantity: true,
      totalPriceCents: true,
      completedQuantity: true,
      shippedQuantity: true,
    },
  });

  return transaction.customerOrder.update({
    where: { id: customerOrderId },
    data: {
      totalQuantity: totals._sum.quantity ?? 0,
      totalRevenueCents: totals._sum.totalPriceCents ?? BigInt(0),
      completedQuantity: totals._sum.completedQuantity ?? 0,
      shippedQuantity: totals._sum.shippedQuantity ?? 0,
    },
  });
}

type CustomerOrderItemProgressInput = {
  customerOrderItemId: string;
  completedQuantity: number;
  shippedQuantity: number;
};

export async function setCustomerOrderItemProgress(
  input: CustomerOrderItemProgressInput,
) {
  return runGameplayTransaction(async (transaction) => {
    const item = await transaction.customerOrderItem.findUniqueOrThrow({
      where: { id: input.customerOrderItemId },
      select: {
        customerOrderId: true,
        quantity: true,
      },
    });

    assertQuantityRange(input.completedQuantity, item.quantity, "Tamamlanan adet");
    assertQuantityRange(input.shippedQuantity, input.completedQuantity, "Sevk edilen adet");

    await transaction.customerOrderItem.update({
      where: { id: input.customerOrderItemId },
      data: {
        completedQuantity: input.completedQuantity,
        shippedQuantity: input.shippedQuantity,
      },
    });

    return syncCustomerOrderAggregates(transaction, item.customerOrderId);
  });
}

type ProductionRouteProgressInput = {
  productionOrderRouteProgressId: string;
  inputReadyQuantity: number;
  completedQuantity: number;
  inOutsourceQuantity: number;
};

export async function setProductionRouteProgress(
  input: ProductionRouteProgressInput,
) {
  return runGameplayTransaction(async (transaction) => {
    const progress = await transaction.productionOrderRouteProgress.findUniqueOrThrow({
      where: { id: input.productionOrderRouteProgressId },
      select: {
        productionOrderId: true,
        plannedQuantity: true,
      },
    });

    assertQuantityRange(input.inputReadyQuantity, progress.plannedQuantity, "Hazır girdi");
    assertQuantityRange(input.completedQuantity, input.inputReadyQuantity, "Tamamlanan adet");
    assertQuantityRange(
      input.inOutsourceQuantity,
      input.inputReadyQuantity - input.completedQuantity,
      "Fasondaki adet",
    );

    await transaction.productionOrderRouteProgress.update({
      where: { id: input.productionOrderRouteProgressId },
      data: {
        inputReadyQuantity: input.inputReadyQuantity,
        completedQuantity: input.completedQuantity,
        remainingQuantity: progress.plannedQuantity - input.completedQuantity,
        inOutsourceQuantity: input.inOutsourceQuantity,
      },
    });

    const productionOrder = await transaction.productionOrder.findUniqueOrThrow({
      where: { id: progress.productionOrderId },
      select: {
        plannedQuantity: true,
        customerOrderItemId: true,
        customerOrderItem: {
          select: { customerOrderId: true },
        },
        routeProgress: {
          where: { isRequired: true },
          orderBy: { sequence: "desc" },
          take: 1,
          select: { completedQuantity: true },
        },
      },
    });

    const finalCompletedQuantity =
      productionOrder.routeProgress[0]?.completedQuantity ?? 0;

    await Promise.all([
      transaction.productionOrder.update({
        where: { id: progress.productionOrderId },
        data: {
          completedQuantity: finalCompletedQuantity,
          remainingQuantity:
            productionOrder.plannedQuantity - finalCompletedQuantity,
        },
      }),
      transaction.customerOrderItem.update({
        where: { id: productionOrder.customerOrderItemId },
        data: { completedQuantity: finalCompletedQuantity },
      }),
    ]);

    return syncCustomerOrderAggregates(
      transaction,
      productionOrder.customerOrderItem.customerOrderId,
    );
  });
}

function assertQuantityRange(value: number, maximum: number, label: string) {
  if (!Number.isInteger(value) || value < 0 || value > maximum) {
    throw new Error(`${label} 0 ile ${maximum} arasında bir tam sayı olmalı.`);
  }
}
