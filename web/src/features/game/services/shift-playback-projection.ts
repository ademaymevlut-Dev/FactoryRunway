import {
  ChaosEventType,
  ChaosScope,
  ChaosSeverity,
  FinanceCategory,
  FinanceDueStatus,
  FinanceSourceType,
  LeasingContractStatus,
  ProductImageVariant,
  ProductImageView,
  XpReason,
  type Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";
import { readCustomerRelationshipImpactFromMetadata } from "@/lib/customer-relationship";

import type {
  ShiftPlayback,
  ShiftPlaybackTimelineEvent,
  ShiftProductResult,
} from "../types";

type ProjectionClient = Prisma.TransactionClient | PrismaClient;

type TimelineEventDraft = Omit<
  ShiftPlaybackTimelineEvent,
  "gameDay" | "id" | "sequence"
> & {
  id?: string;
};

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
    images: Array<{
      url: string;
      variant: ProductImageVariant;
      view: ProductImageView;
    }>;
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
  metadata?: Prisma.JsonValue;
  reason: XpReason;
  sourceId: string | null;
  sourceType: string | null;
};

type ChaosEventRow = {
  affectedStaffCount: number | null;
  department: {
    key: string;
    translations: Array<{ name: string }>;
  } | null;
  eventType: ChaosEventType;
  factoryProductionLine: {
    lineNumber: number;
    department: {
      key: string;
      translations: Array<{ name: string }>;
    };
  } | null;
  id: string;
  messageKey: string | null;
  metadata: Prisma.JsonValue | null;
  penaltyBps: number;
  scope: ChaosScope;
  severity: ChaosSeverity;
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
            where: {
              variant: {
                in: [ProductImageVariant.THUMBNAIL, ProductImageVariant.CARD],
              },
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            take: 4,
            select: { url: true, variant: true, view: true },
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
      factoryProductionLineId: true,
      inputReadyQuantity: true,
      templateDailyPointCapacity: true,
      unusedPoints: true,
      usedPoints: true,
      workloadPointsPerUnit: true,
    },
  });
  const performanceByDepartmentId = new Map<
    string,
    ShiftPlayback["departmentResults"][number]["performance"]
  >();
  const nominalLineIdsByDepartmentId = new Map<string, Set<string>>();

  for (const result of lineResults) {
    const current =
      performanceByDepartmentId.get(result.departmentId) ??
      createEmptyDepartmentPerformance();
    const nominalLineIds =
      nominalLineIdsByDepartmentId.get(result.departmentId) ?? new Set<string>();
    const queueLoadPoints =
      Math.max(0, result.inputReadyQuantity) *
      Math.max(0, result.workloadPointsPerUnit ?? 0);

    current.effectiveCapacityPoints += Math.max(
      0,
      result.effectivePointCapacity,
    );
    if (!nominalLineIds.has(result.factoryProductionLineId)) {
      current.nominalCapacityPoints += Math.max(
        0,
        result.templateDailyPointCapacity,
      );
      nominalLineIds.add(result.factoryProductionLineId);
    }
    current.queueLoadPoints += queueLoadPoints;
    current.unusedPoints += Math.max(0, result.unusedPoints);
    current.usedPoints += Math.max(0, result.usedPoints);

    performanceByDepartmentId.set(result.departmentId, current);
    nominalLineIdsByDepartmentId.set(result.departmentId, nominalLineIds);
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
    chaosEvents,
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
          metadata: true,
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
          metadata: true,
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
      input.prisma.factoryChaosEvent.findMany({
        where: {
          factoryId: input.factoryId,
          gameDay: input.gameDay,
          shiftSimulationId: input.shift.shiftId,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          affectedStaffCount: true,
          department: {
            select: {
              key: true,
              translations: {
                where: { locale: "tr" },
                select: { name: true },
              },
            },
          },
          eventType: true,
          factoryProductionLine: {
            select: {
              lineNumber: true,
              department: {
                select: {
                  key: true,
                  translations: {
                    where: { locale: "tr" },
                    select: { name: true },
                  },
                },
              },
            },
          },
          id: true,
          messageKey: true,
          metadata: true,
          penaltyBps: true,
          scope: true,
          severity: true,
        },
      }),
      input.prisma.factoryXpTransaction.findMany({
        where: {
          factoryId: input.factoryId,
          gameDay: input.gameDay,
          OR: [
            {
              reason: XpReason.SHIFT_COMPLETED,
              sourceId: input.shift.shiftId,
              sourceType: "shift",
            },
            {
              reason: {
                in: [
                  XpReason.ORDER_COMPLETED,
                  XpReason.ON_TIME_DELIVERY,
                  XpReason.PREMIUM_ORDER,
                  XpReason.LUXURY_ORDER,
                ],
              },
              sourceType: "customer_order",
            },
          ],
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          amountXp: true,
          balanceAfterXp: true,
          id: true,
          metadata: true,
          reason: true,
          sourceId: true,
          sourceType: true,
        },
      }),
    ]);

  const events: ShiftPlaybackTimelineEvent[] = [];
  let sequence = 0;
  const add = (event: TimelineEventDraft) => {
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

  for (const chaosEvent of chaosEvents) {
    add(chaosEventToTimelineEvent(chaosEvent));
  }

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
    const customerRelationshipImpact =
      readCustomerRelationshipImpactFromMetadata(order.metadata);

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

    if (customerRelationshipImpact) {
      add({
        category: "SYSTEM",
        eventKey:
          customerRelationshipImpact.trustChangeBps >= 0
            ? "customer.relationship_gained"
            : "customer.relationship_lost",
        id: `customer-relationship:${order.id}`,
        minute: 503,
        payload: {
          orderCode: order.orderNo,
          trustChangeBps: customerRelationshipImpact.trustChangeBps,
        },
        severity:
          customerRelationshipImpact.trustChangeBps >= 0
            ? "SUCCESS"
            : "WARNING",
        sourceId: order.id,
        sourceType: "CUSTOMER_ORDER",
      });
    }
  }

  for (const transaction of financeTransactions) {
    const event = financeTransactionToEvent(transaction);
    if (!event) continue;
    add(event);
  }

  for (const due of financeDues) {
    if (
      due.category === FinanceCategory.PENALTY &&
      due.sourceType === FinanceSourceType.CUSTOMER_ORDER
    ) {
      const metadata = isJsonRecord(due.metadata) ? due.metadata : {};
      const orderNo =
        typeof metadata.orderNo === "string" ? metadata.orderNo : null;

      add({
        category: "FINANCE",
        eventKey:
          due.status === FinanceDueStatus.PARTIAL
            ? "penalty.order_late_partial"
            : "penalty.order_late_overdue",
        id: `finance-due:${due.id}:${due.status}`,
        minute: 507,
        payload: {
          amountCents: due.amountCents.toString(),
          ...(orderNo ? { orderNo } : {}),
          remainingCents: (due.amountCents - due.settledAmountCents).toString(),
        },
        severity:
          due.status === FinanceDueStatus.PARTIAL ? "WARNING" : "CRITICAL",
        sourceId: due.sourceId ?? due.id,
        sourceType: due.sourceType,
      });
      continue;
    }

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
    productImageUrl: getProductImageUrl(product.images),
    productName: product.name || toTitle(product.key),
    totalProcessedQuantity: 0,
  };

  groups.set(key, group);

  return group;
}

function getProductImageUrl(
  images: NonNullable<ProductLineResultRow["product"]>["images"],
) {
  const frontThumbnail = images.find(
    (image) =>
      image.view === ProductImageView.FRONT &&
      image.variant === ProductImageVariant.THUMBNAIL,
  );
  const frontCard = images.find(
    (image) =>
      image.view === ProductImageView.FRONT &&
      image.variant === ProductImageVariant.CARD,
  );
  const thumbnail = images.find(
    (image) => image.variant === ProductImageVariant.THUMBNAIL,
  );
  const card = images.find((image) => image.variant === ProductImageVariant.CARD);

  return frontThumbnail?.url ?? frontCard?.url ?? thumbnail?.url ?? card?.url ?? null;
}

function chaosEventToTimelineEvent(chaosEvent: ChaosEventRow): TimelineEventDraft & {
  id: string;
} {
  const departmentName = getChaosDepartmentName(chaosEvent);
  const lineLabel = chaosEvent.factoryProductionLine
    ? `Hat ${chaosEvent.factoryProductionLine.lineNumber}`
    : null;

  return {
    category: chaosEventTypeToTimelineCategory(chaosEvent.eventType),
    eventKey: chaosEvent.messageKey ?? chaosEventTypeToEventKey(chaosEvent.eventType),
    id: `chaos:${chaosEvent.id}`,
    minute: getChaosEventMinute(chaosEvent),
    payload: {
      affectedStaffCount: chaosEvent.affectedStaffCount,
      capacityLossBps: Math.max(0, 10_000 - chaosEvent.penaltyBps),
      departmentName,
      eventType: chaosEvent.eventType,
      lineLabel,
      penaltyBps: chaosEvent.penaltyBps,
      scope: chaosEvent.scope,
    },
    severity: chaosSeverityToTimelineSeverity(chaosEvent.severity),
    sourceId: chaosEvent.id,
    sourceType: "FACTORY_CHAOS_EVENT",
  };
}

function getChaosDepartmentName(chaosEvent: ChaosEventRow) {
  const department =
    chaosEvent.department ?? chaosEvent.factoryProductionLine?.department ?? null;

  if (!department) return null;

  return department.translations[0]?.name ?? toTitle(department.key);
}

function getChaosEventMinute(chaosEvent: ChaosEventRow) {
  const metadata = isJsonRecord(chaosEvent.metadata) ? chaosEvent.metadata : {};
  const targetMinute =
    typeof metadata.targetMinute === "number" && Number.isFinite(metadata.targetMinute)
      ? Math.round(metadata.targetMinute)
      : chaosEventTypeToDefaultMinute(chaosEvent.eventType);

  return Math.min(520, Math.max(5, targetMinute));
}

function chaosEventTypeToTimelineCategory(
  eventType: ChaosEventType,
): ShiftPlaybackTimelineEvent["category"] {
  switch (eventType) {
    case ChaosEventType.MACHINE_BREAKDOWN:
      return "MACHINE";
    case ChaosEventType.POWER_ISSUE:
    case ChaosEventType.MATERIAL_DELAY:
      return "SYSTEM";
    case ChaosEventType.STAFF_ABSENCE:
    case ChaosEventType.FLU_WAVE:
    case ChaosEventType.BAD_WEATHER:
    default:
      return "STAFF";
  }
}

function chaosSeverityToTimelineSeverity(
  severity: ChaosSeverity,
): ShiftPlaybackTimelineEvent["severity"] {
  switch (severity) {
    case ChaosSeverity.MAJOR:
      return "CRITICAL";
    case ChaosSeverity.MINOR:
    case ChaosSeverity.MODERATE:
    default:
      return "WARNING";
  }
}

function chaosEventTypeToDefaultMinute(eventType: ChaosEventType) {
  switch (eventType) {
    case ChaosEventType.BAD_WEATHER:
      return 35;
    case ChaosEventType.FLU_WAVE:
      return 55;
    case ChaosEventType.STAFF_ABSENCE:
      return 70;
    case ChaosEventType.MATERIAL_DELAY:
      return 110;
    case ChaosEventType.MACHINE_BREAKDOWN:
      return 150;
    case ChaosEventType.POWER_ISSUE:
      return 210;
    default:
      return 90;
  }
}

function chaosEventTypeToEventKey(eventType: ChaosEventType) {
  switch (eventType) {
    case ChaosEventType.STAFF_ABSENCE:
      return "chaos.staff_absence";
    case ChaosEventType.MACHINE_BREAKDOWN:
      return "chaos.machine_breakdown";
    case ChaosEventType.FLU_WAVE:
      return "chaos.flu_wave";
    case ChaosEventType.BAD_WEATHER:
      return "chaos.bad_weather";
    case ChaosEventType.POWER_ISSUE:
      return "chaos.power_issue";
    case ChaosEventType.MATERIAL_DELAY:
      return "chaos.material_delay";
    default:
      return "chaos.event";
  }
}

function financeTransactionToEvent(
  transaction: FinanceTransactionRow,
): TimelineEventDraft & {
  id: string;
} | null {
  const metadata = isJsonRecord(transaction.metadata) ? transaction.metadata : {};
  const orderNo = typeof metadata.orderNo === "string" ? metadata.orderNo : null;
  const base = {
    id: `finance:${transaction.id}`,
    minute: 510,
    payload: {
      amountCents: transaction.amountCents.toString(),
      ...(orderNo ? { orderNo } : {}),
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

  if (transaction.category === FinanceCategory.PENALTY) {
    return {
      ...base,
      category: "FINANCE",
      eventKey: "penalty.order_late_paid",
      minute: 506,
      severity: "WARNING",
    };
  }

  return null;
}

function xpTransactionToEvent(
  transaction: XpTransactionRow,
): TimelineEventDraft & {
  id: string;
} {
  const metadata = isJsonRecord(transaction.metadata) ? transaction.metadata : {};
  const currentLevel =
    typeof metadata.currentLevel === "number" ? metadata.currentLevel : null;
  const leveledUp = metadata.leveledUp === true && currentLevel !== null;
  const orderNo = typeof metadata.orderNo === "string" ? metadata.orderNo : null;
  const rewardPart =
    typeof metadata.rewardPart === "string" ? metadata.rewardPart : null;

  return {
    category: "SYSTEM",
    eventKey: xpReasonToEventKey(transaction.reason),
    id: `xp:${transaction.id}`,
    minute: xpReasonToMinute(transaction.reason),
    payload: {
      amountXp: transaction.amountXp,
      balanceAfterXp: transaction.balanceAfterXp,
      ...(orderNo ? { orderNo } : {}),
      ...(rewardPart ? { rewardPart } : {}),
      ...(leveledUp ? { currentLevel, leveledUp } : {}),
    },
    severity: "SUCCESS",
    sourceId: transaction.sourceId ?? transaction.id,
    sourceType: transaction.sourceType ?? "FACTORY_XP_TRANSACTION",
  };
}

function xpReasonToEventKey(reason: XpReason) {
  switch (reason) {
    case XpReason.ORDER_COMPLETED:
      return "xp.order_completed";
    case XpReason.ON_TIME_DELIVERY:
      return "xp.on_time_delivery";
    case XpReason.PREMIUM_ORDER:
      return "xp.premium_order";
    case XpReason.LUXURY_ORDER:
      return "xp.luxury_order";
    case XpReason.SHIFT_COMPLETED:
    default:
      return "xp.shift_completed";
  }
}

function xpReasonToMinute(reason: XpReason) {
  switch (reason) {
    case XpReason.ORDER_COMPLETED:
      return 505;
    case XpReason.ON_TIME_DELIVERY:
      return 508;
    case XpReason.PREMIUM_ORDER:
    case XpReason.LUXURY_ORDER:
      return 511;
    case XpReason.SHIFT_COMPLETED:
    default:
      return 535;
  }
}

function isJsonRecord(value: Prisma.JsonValue | undefined): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
