import {
  FinanceCategory,
  FinanceDueStatus,
  FinanceSourceType,
  LeasingContractStatus,
  ProductImageVariant,
  XpReason,
  type Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";

import type {
  ShiftPlayback,
  ShiftPlaybackTimelineEvent,
  ShiftProductResult,
} from "../types";

type ProjectionClient = Prisma.TransactionClient | PrismaClient;

type ProductLineResultRow = {
  departmentId: string;
  producedQuantity: number;
  department: {
    key: string;
    translations: Array<{ name: string }>;
  };
  product: {
    id: string;
    key: string;
    name: string;
    images: Array<{ url: string }>;
  } | null;
  productionOrder: {
    id: string;
    productionNo: string;
    customerOrder: { orderNo: string };
  } | null;
};

type FinanceTransactionRow = {
  amountCents: bigint;
  category: FinanceCategory;
  direction: unknown;
  id: string;
  referenceKey: string | null;
  sourceId: string | null;
  sourceType: FinanceSourceType | null;
  metadata: Prisma.JsonValue;
};

type XpTransactionRow = {
  amountXp: number;
  balanceAfterXp: number;
  id: string;
  sourceId: string | null;
  sourceType: string | null;
};

export async function getShiftProductResults(input: {
  prisma: ProjectionClient;
  shiftId: string;
}): Promise<ShiftProductResult[]> {
  const lineResults = await input.prisma.shiftLineResult.findMany({
    where: {
      producedQuantity: { gt: 0 },
      shiftSimulationId: input.shiftId,
    },
    orderBy: [
      { productionOrder: { priority: "asc" } },
      { productionOrder: { targetDeliveryDay: "asc" } },
      { department: { routeOrder: "asc" } },
      { createdAt: "asc" },
    ],
    select: {
      departmentId: true,
      producedQuantity: true,
      department: {
        select: {
          key: true,
          translations: {
            where: { locale: "tr" },
            select: { name: true },
          },
        },
      },
      product: {
        select: {
          id: true,
          key: true,
          name: true,
          images: {
            where: { variant: ProductImageVariant.CARD },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            take: 1,
            select: { url: true },
          },
        },
      },
      productionOrder: {
        select: {
          id: true,
          productionNo: true,
          customerOrder: {
            select: { orderNo: true },
          },
        },
      },
    },
  });
  const groups = new Map<string, ShiftProductResult>();

  for (const result of lineResults) {
    if (!result.product) continue;

    const orderId = result.productionOrder?.id ?? null;
    const key = `${result.product.id}:${orderId ?? "no-order"}`;
    const product = getOrCreateProductGroup(groups, key, result);
    const departmentName =
      result.department.translations[0]?.name ?? toTitle(result.department.key);
    const department = product.departments.find(
      (item) => item.departmentId === result.departmentId,
    );

    if (department) {
      department.processedQuantity += result.producedQuantity;
    } else {
      product.departments.push({
        departmentId: result.departmentId,
        departmentName,
        processedQuantity: result.producedQuantity,
      });
    }

    product.totalProcessedQuantity += result.producedQuantity;
  }

  return Array.from(groups.values()).sort((first, second) => {
    const firstCode = first.orderCode ?? "";
    const secondCode = second.orderCode ?? "";

    return (
      firstCode.localeCompare(secondCode, "tr") ||
      first.productName.localeCompare(second.productName, "tr")
    );
  });
}

export async function getShiftDepartmentPerformance(input: {
  prisma: ProjectionClient;
  shiftId: string;
}) {
  const lineResults = await input.prisma.shiftLineResult.findMany({
    where: { shiftSimulationId: input.shiftId },
    select: {
      departmentId: true,
      effectivePointCapacity: true,
      inputReadyQuantity: true,
      plannedPointCapacity: true,
      unusedPoints: true,
      usedPoints: true,
      workloadPointsPerUnit: true,
    },
  });
  const performanceByDepartmentId = new Map<
    string,
    ShiftPlayback["departmentResults"][number]["performance"]
  >();

  for (const result of lineResults) {
    const current =
      performanceByDepartmentId.get(result.departmentId) ??
      createEmptyDepartmentPerformance();
    const queueLoadPoints =
      Math.max(0, result.inputReadyQuantity) *
      Math.max(0, result.workloadPointsPerUnit ?? 0);

    current.effectiveCapacityPoints += Math.max(
      0,
      result.effectivePointCapacity,
    );
    current.nominalCapacityPoints += Math.max(0, result.plannedPointCapacity);
    current.queueLoadPoints += queueLoadPoints;
    current.unusedPoints += Math.max(0, result.unusedPoints);
    current.usedPoints += Math.max(0, result.usedPoints);

    performanceByDepartmentId.set(result.departmentId, current);
  }

  for (const performance of performanceByDepartmentId.values()) {
    performance.efficiencyBps =
      performance.effectiveCapacityPoints > 0
        ? Math.min(
            10_000,
            Math.round(
              (performance.usedPoints * 10_000) /
                performance.effectiveCapacityPoints,
            ),
          )
        : 0;
    performance.capacityLossBps =
      performance.nominalCapacityPoints > 0
        ? Math.max(
            0,
            10_000 -
              Math.round(
                (performance.effectiveCapacityPoints * 10_000) /
                  performance.nominalCapacityPoints,
              ),
          )
        : 0;
  }

  return performanceByDepartmentId;
}

export async function getShiftTimelineEvents(input: {
  factoryId: string;
  gameDay: number;
  prisma: ProjectionClient;
  shift: Pick<
    ShiftPlayback,
    "departmentResults" | "shiftId" | "summary" | "simulatedGameDay"
  >;
}): Promise<ShiftPlaybackTimelineEvent[]> {
  const [
    financeTransactions,
    financeDues,
    shippedOrders,
    outsourceJobs,
    completedLeasingContracts,
    xpTransactions,
  ] =
    await Promise.all([
      input.prisma.factoryFinanceTransaction.findMany({
        where: {
          factoryId: input.factoryId,
          gameDay: input.gameDay,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          amountCents: true,
          category: true,
          direction: true,
          id: true,
          referenceKey: true,
          sourceId: true,
          sourceType: true,
          metadata: true,
        },
      }),
      input.prisma.factoryFinanceDue.findMany({
        where: {
          dueDay: { lte: input.gameDay },
          factoryId: input.factoryId,
          status: {
            in: [FinanceDueStatus.PARTIAL, FinanceDueStatus.OVERDUE],
          },
        },
        orderBy: [{ dueDay: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: {
          amountCents: true,
          category: true,
          id: true,
          settledAmountCents: true,
          sourceId: true,
          sourceType: true,
          status: true,
        },
      }),
      input.prisma.customerOrder.findMany({
        where: {
          factoryId: input.factoryId,
          shippedDay: input.gameDay,
        },
        orderBy: [{ shippedDay: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          orderNo: true,
          shippedQuantity: true,
          items: {
            orderBy: { sortOrder: "asc" },
            select: {
              quantity: true,
              product: { select: { name: true } },
            },
          },
        },
      }),
      input.prisma.productionOutsourceJob.findMany({
        where: {
          actualReadyDay: input.gameDay,
          factoryId: input.factoryId,
        },
        orderBy: [{ actualReadyDay: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          quantity: true,
          totalCostCents: true,
          department: {
            select: {
              key: true,
              translations: {
                where: { locale: "tr" },
                select: { name: true },
              },
            },
          },
          productionOrder: {
            select: { productionNo: true },
          },
        },
      }),
      input.prisma.factoryLeasingContract.findMany({
        where: {
          endedDay: input.gameDay,
          factoryId: input.factoryId,
          status: LeasingContractStatus.COMPLETED,
        },
        orderBy: [{ endedDay: "asc" }, { updatedAt: "asc" }],
        select: {
          id: true,
          installmentCount: true,
          productionLineId: true,
          totalCostCents: true,
        },
      }),
      input.prisma.factoryXpTransaction.findMany({
        where: {
          factoryId: input.factoryId,
          gameDay: input.gameDay,
          reason: XpReason.SHIFT_COMPLETED,
          sourceId: input.shift.shiftId,
          sourceType: "shift",
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          amountXp: true,
          balanceAfterXp: true,
          id: true,
          sourceId: true,
          sourceType: true,
        },
      }),
    ]);

  const events: ShiftPlaybackTimelineEvent[] = [];
  let sequence = 0;
  const add = (
    event: Omit<ShiftPlaybackTimelineEvent, "gameDay" | "id" | "sequence"> & {
      id?: string;
    },
  ) => {
    sequence += 1;
    events.push({
      gameDay: input.gameDay,
      id: event.id ?? `${input.shift.shiftId}:${sequence}`,
      sequence,
      ...event,
    });
  };

  add({
    category: "PRODUCTION",
    eventKey: "shift.started",
    minute: 0,
    payload: {
      activeLineCount: input.shift.summary.activeLineCount,
      shiftId: input.shift.shiftId,
    },
    severity: "INFO",
    sourceId: input.shift.shiftId,
    sourceType: "SHIFT_SIMULATION",
  });

  for (const department of input.shift.departmentResults) {
    const sourceId = `${input.shift.shiftId}:${department.departmentId}`;
    if (department.producedQuantity > 0) {
      add({
        category: "PRODUCTION",
        eventKey:
          department.productionEndMinute !== null &&
          department.productionEndMinute < 540
            ? "department.completed_early"
            : "department.production_completed",
        minute: department.productionEndMinute ?? 540,
        payload: {
          departmentName: department.departmentName,
          producedQuantity: department.producedQuantity,
        },
        severity: "SUCCESS",
        sourceId,
        sourceType: "SHIFT_DEPARTMENT_RESULT",
      });
    }

    if (
      department.startingQueueQuantity === 0 &&
      department.queueEnteredQuantity === 0 &&
      department.producedQuantity === 0
    ) {
      add({
        category: "PRODUCTION",
        eventKey: "department.no_wip",
        minute: 120,
        payload: { departmentName: department.departmentName },
        severity: "WARNING",
        sourceId,
        sourceType: "SHIFT_DEPARTMENT_RESULT",
      });
    } else if (
      department.producedQuantity > 0 &&
      department.endingQueueQuantity > 0
    ) {
      add({
        category: "PRODUCTION",
        eventKey: "department.capacity_used",
        minute: Math.min(520, department.productionEndMinute ?? 520),
        payload: {
          departmentName: department.departmentName,
          remainingQuantity: department.endingQueueQuantity,
        },
        severity: "INFO",
        sourceId,
        sourceType: "SHIFT_DEPARTMENT_RESULT",
      });
    }
  }

  for (const order of shippedOrders) {
    add({
      category: "SHIPPING",
      eventKey: "shipping.order_shipped",
      id: `shipping:${order.id}`,
      minute: 500,
      payload: {
        orderCode: order.orderNo,
        productName: order.items[0]?.product.name ?? null,
        shippedQuantity: order.shippedQuantity,
      },
      severity: "SUCCESS",
      sourceId: order.id,
      sourceType: "CUSTOMER_ORDER",
    });
  }

  for (const transaction of financeTransactions) {
    const event = financeTransactionToEvent(transaction);
    if (!event) continue;
    add(event);
  }

  for (const due of financeDues) {
    if (
      due.category !== FinanceCategory.LEASING_PAYMENT ||
      due.sourceType !== FinanceSourceType.LEASING_CONTRACT
    ) {
      continue;
    }
    add({
      category: "FINANCE",
      eventKey:
        due.status === FinanceDueStatus.PARTIAL
          ? "leasing.payment_partial"
          : "leasing.payment_overdue",
      id: `finance-due:${due.id}:${due.status}`,
      minute: 470,
      payload: {
        amountCents: due.amountCents.toString(),
        remainingCents: (due.amountCents - due.settledAmountCents).toString(),
      },
      severity:
        due.status === FinanceDueStatus.PARTIAL ? "WARNING" : "CRITICAL",
      sourceId: due.sourceId ?? due.id,
      sourceType: due.sourceType ?? "FACTORY_FINANCE_DUE",
    });
  }

  for (const contract of completedLeasingContracts) {
    add({
      category: "FINANCE",
      eventKey: "leasing.contract_completed",
      id: `leasing-contract:${contract.id}:completed`,
      minute: 525,
      payload: {
        installmentCount: contract.installmentCount,
        totalCostCents: contract.totalCostCents.toString(),
      },
      severity: "SUCCESS",
      sourceId: contract.id,
      sourceType: "LEASING_CONTRACT",
    });
  }

  for (const job of outsourceJobs) {
    add({
      category: "OUTSOURCING",
      eventKey: "outsource.completed",
      id: `outsource:${job.id}:completed`,
      minute: 450,
      payload: {
        amountCents: job.totalCostCents.toString(),
        departmentName:
          job.department.translations[0]?.name ?? toTitle(job.department.key),
        orderCode: job.productionOrder.productionNo,
        quantity: job.quantity,
      },
      severity: "SUCCESS",
      sourceId: job.id,
      sourceType: "OUTSOURCE_JOB",
    });
  }

  for (const transaction of xpTransactions) {
    add(xpTransactionToEvent(transaction));
  }

  add({
    category: "PRODUCTION",
    eventKey: "shift.completed",
    minute: 540,
    payload: {
      nextGameDay: input.shift.simulatedGameDay + 1,
      simulatedGameDay: input.shift.simulatedGameDay,
      shiftId: input.shift.shiftId,
    },
    severity: "SUCCESS",
    sourceId: input.shift.shiftId,
    sourceType: "SHIFT_SIMULATION",
  });

  return events.sort((first, second) => {
    return first.minute - second.minute || first.sequence - second.sequence;
  });
}

function getOrCreateProductGroup(
  groups: Map<string, ShiftProductResult>,
  key: string,
  result: ProductLineResultRow,
) {
  const existing = groups.get(key);

  if (existing) return existing;
  const product = result.product;
  if (!product) {
    throw new Error("Product result mapper received a line without product.");
  }

  const group: ShiftProductResult = {
    departments: [],
    orderCode:
      result.productionOrder?.customerOrder.orderNo ??
      result.productionOrder?.productionNo ??
      null,
    orderId: result.productionOrder?.id ?? null,
    productId: product.id,
    productImageUrl: product.images[0]?.url ?? null,
    productName: product.name || toTitle(product.key),
    totalProcessedQuantity: 0,
  };

  groups.set(key, group);

  return group;
}

function financeTransactionToEvent(
  transaction: FinanceTransactionRow,
): Omit<ShiftPlaybackTimelineEvent, "gameDay" | "id" | "sequence"> & {
  id: string;
} | null {
  const base = {
    id: `finance:${transaction.id}`,
    minute: 510,
    payload: {
      amountCents: transaction.amountCents.toString(),
      referenceKey: transaction.referenceKey ?? null,
    },
    sourceId: transaction.sourceId ?? transaction.id,
    sourceType: transaction.sourceType ?? "FACTORY_FINANCE_TRANSACTION",
  };

  if (transaction.category === FinanceCategory.ORDER_REVENUE) {
    return {
      ...base,
      category: "PAYMENT",
      eventKey: "payment.customer_received",
      minute: 490,
      severity: "SUCCESS",
    };
  }

  if (transaction.category === FinanceCategory.LEASING_DOWN_PAYMENT) {
    return {
      ...base,
      category: "FINANCE",
      eventKey: "leasing.down_payment_paid",
      severity: "INFO",
    };
  }

  if (transaction.category === FinanceCategory.LEASING_PAYMENT) {
    return {
      ...base,
      category: "FINANCE",
      eventKey: "leasing.payment_paid",
      severity: "SUCCESS",
    };
  }

  if (transaction.category === FinanceCategory.PAYROLL) {
    return {
      ...base,
      category: "FINANCE",
      eventKey: "payroll.paid",
      minute: 430,
      severity: "INFO",
    };
  }

  if (
    transaction.category === FinanceCategory.ELECTRICITY ||
    transaction.category === FinanceCategory.RENT ||
    transaction.category === FinanceCategory.MEAL ||
    transaction.category === FinanceCategory.OVERHEAD
  ) {
    return {
      ...base,
      category: "FINANCE",
      eventKey: "operating_expense.paid",
      minute: 440,
      payload: {
        ...base.payload,
        category: transaction.category,
      },
      severity: "INFO",
    };
  }

  if (transaction.category === FinanceCategory.OUTSOURCE_COST) {
    return {
      ...base,
      category: "OUTSOURCING",
      eventKey: "outsource.payment_paid",
      minute: 455,
      severity: "SUCCESS",
    };
  }

  return null;
}

function xpTransactionToEvent(
  transaction: XpTransactionRow,
): Omit<ShiftPlaybackTimelineEvent, "gameDay" | "id" | "sequence"> & {
  id: string;
} {
  return {
    category: "SYSTEM",
    eventKey: "xp.shift_completed",
    id: `xp:${transaction.id}`,
    minute: 535,
    payload: {
      amountXp: transaction.amountXp,
      balanceAfterXp: transaction.balanceAfterXp,
    },
    severity: "SUCCESS",
    sourceId: transaction.sourceId ?? transaction.id,
    sourceType: transaction.sourceType ?? "FACTORY_XP_TRANSACTION",
  };
}

function createEmptyDepartmentPerformance(): ShiftPlayback["departmentResults"][number]["performance"] {
  return {
    capacityLossBps: 0,
    effectiveCapacityPoints: 0,
    efficiencyBps: 0,
    nominalCapacityPoints: 0,
    queueLoadPoints: 0,
    unusedPoints: 0,
    usedPoints: 0,
  };
}

function toTitle(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
