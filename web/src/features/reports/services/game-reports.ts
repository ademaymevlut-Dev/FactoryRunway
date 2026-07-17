import {
  CustomerOrderStatus,
  StaffAssignmentStatus,
  type Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";

import type {
  CustomersReport,
  GameReport,
  GameReportTab,
  StaffReport,
} from "../types";

const locale = "tr";
const reportableOrderStatuses = [
  CustomerOrderStatus.ACTIVE,
  CustomerOrderStatus.IN_PRODUCTION,
  CustomerOrderStatus.READY_TO_SHIP,
  CustomerOrderStatus.PARTIALLY_SHIPPED,
  CustomerOrderStatus.SHIPPED,
  CustomerOrderStatus.DELIVERED,
  CustomerOrderStatus.LATE,
] as const;

type ReportClient = PrismaClient | Prisma.TransactionClient;
type TranslationRecord = { name: string };

export async function getGameReport(input: {
  factoryId: string;
  prisma: ReportClient;
  tab: GameReportTab;
}): Promise<GameReport | null> {
  const factory = await input.prisma.factory.findUnique({
    where: { id: input.factoryId },
    select: { currencyCode: true, id: true },
  });

  if (!factory) return null;

  if (input.tab === "staff") {
    return buildStaffReport({
      currencyCode: factory.currencyCode,
      factoryId: factory.id,
      prisma: input.prisma,
    });
  }

  return buildCustomersReport({
    currencyCode: factory.currencyCode,
    factoryId: factory.id,
    prisma: input.prisma,
  });
}

async function buildCustomersReport(input: {
  currencyCode: CustomersReport["currencyCode"];
  factoryId: string;
  prisma: ReportClient;
}): Promise<CustomersReport> {
  const orders = await input.prisma.customerOrder.findMany({
    where: {
      factoryId: input.factoryId,
      status: { in: [...reportableOrderStatuses] },
    },
    orderBy: [{ acceptedDay: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      totalQuantity: true,
      totalRevenueCents: true,
      virtualCustomer: {
        select: {
          id: true,
          name: true,
        },
      },
      items: {
        select: {
          productId: true,
        },
      },
    },
  });
  const customerRows = new Map<
    string,
    {
      customerId: string;
      customerName: string;
      orderCount: number;
      productIds: Set<string>;
      totalQuantity: number;
      totalRevenueCents: bigint;
    }
  >();

  for (const order of orders) {
    const customerId = order.virtualCustomer?.id ?? "unknown-customer";
    const current = customerRows.get(customerId) ?? {
      customerId,
      customerName: order.virtualCustomer?.name ?? "Müşteri",
      orderCount: 0,
      productIds: new Set<string>(),
      totalQuantity: 0,
      totalRevenueCents: BigInt(0),
    };

    current.orderCount += 1;
    current.totalQuantity += order.totalQuantity;
    current.totalRevenueCents += order.totalRevenueCents;

    for (const item of order.items) {
      current.productIds.add(item.productId);
    }

    customerRows.set(customerId, current);
  }

  const rows = Array.from(customerRows.values())
    .map((row) => ({
      averageUnitPriceCents: calculateAverageUnitPriceCents(
        row.totalRevenueCents,
        row.totalQuantity,
      ),
      customerId: row.customerId,
      customerName: row.customerName,
      orderCount: row.orderCount,
      productCount: row.productIds.size,
      totalQuantity: row.totalQuantity,
      totalRevenueCents: row.totalRevenueCents.toString(),
    }))
    .sort((first, second) => {
      if (second.orderCount !== first.orderCount) {
        return second.orderCount - first.orderCount;
      }
      if (second.totalQuantity !== first.totalQuantity) {
        return second.totalQuantity - first.totalQuantity;
      }

      return first.customerName.localeCompare(second.customerName, "tr");
    });

  return {
    currencyCode: input.currencyCode,
    rows,
    summary: {
      customerCount: rows.length,
      orderCount: rows.reduce((total, row) => total + row.orderCount, 0),
      totalQuantity: rows.reduce((total, row) => total + row.totalQuantity, 0),
      totalRevenueCents: rows
        .reduce(
          (total, row) => total + BigInt(row.totalRevenueCents),
          BigInt(0),
        )
        .toString(),
    },
    tab: "customers",
  };
}

async function buildStaffReport(input: {
  currencyCode: StaffReport["currencyCode"];
  factoryId: string;
  prisma: ReportClient;
}): Promise<StaffReport> {
  const assignments = await input.prisma.factoryStaffAssignment.findMany({
    where: {
      factoryId: input.factoryId,
      quantity: { gt: 0 },
      status: StaffAssignmentStatus.ACTIVE,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      quantity: true,
      factoryProductionLine: {
        select: {
          department: {
            select: {
              key: true,
              routeOrder: true,
              translations: {
                where: { locale },
                select: { name: true },
              },
            },
          },
        },
      },
      staffRole: {
        select: {
          key: true,
          monthlySalaryCents: true,
          staffType: true,
          department: {
            select: {
              key: true,
              routeOrder: true,
              translations: {
                where: { locale },
                select: { name: true },
              },
            },
          },
          translations: {
            where: { locale },
            select: { name: true },
          },
        },
      },
    },
  });
  const groupedRows = new Map<
    string,
    {
      departmentKey: string;
      departmentName: string;
      monthlySalaryCents: number;
      quantity: number;
      roleKey: string;
      roleName: string;
      sortOrder: number;
      staffType: string;
    }
  >();

  for (const assignment of assignments) {
    const department =
      assignment.staffRole.department ??
      assignment.factoryProductionLine?.department ??
      null;
    const departmentKey = department?.key ?? "factory_support";
    const roleKey = assignment.staffRole.key;
    const rowKey = `${departmentKey}:${roleKey}`;
    const current = groupedRows.get(rowKey) ?? {
      departmentKey,
      departmentName: department
        ? pickTranslation(department.translations, department.key)
        : "Genel / Destek",
      monthlySalaryCents: assignment.staffRole.monthlySalaryCents,
      quantity: 0,
      roleKey,
      roleName: pickTranslation(
        assignment.staffRole.translations,
        assignment.staffRole.key,
      ),
      sortOrder: department?.routeOrder ?? 999,
      staffType: assignment.staffRole.staffType,
    };

    current.quantity += assignment.quantity;
    groupedRows.set(rowKey, current);
  }

  const rows = Array.from(groupedRows.values())
    .sort((first, second) => {
      if (first.sortOrder !== second.sortOrder) {
        return first.sortOrder - second.sortOrder;
      }

      return (
        first.departmentName.localeCompare(second.departmentName, "tr") ||
        first.roleName.localeCompare(second.roleName, "tr")
      );
    })
    .map(({ sortOrder, ...row }) => {
      void sortOrder;

      return {
        ...row,
        monthlySalaryCents: row.monthlySalaryCents.toString(),
        totalMonthlySalaryCents: (
          BigInt(row.monthlySalaryCents) * BigInt(row.quantity)
        ).toString(),
      };
    });

  return {
    currencyCode: input.currencyCode,
    rows,
    summary: {
      departmentCount: new Set(rows.map((row) => row.departmentKey)).size,
      roleCount: rows.length,
      totalMonthlySalaryCents: rows
        .reduce(
          (total, row) => total + BigInt(row.totalMonthlySalaryCents),
          BigInt(0),
        )
        .toString(),
      totalStaff: rows.reduce((total, row) => total + row.quantity, 0),
    },
    tab: "staff",
  };
}

function pickTranslation(translations: TranslationRecord[], fallbackKey: string) {
  return translations[0]?.name ?? toTitle(fallbackKey);
}

function calculateAverageUnitPriceCents(
  totalRevenueCents: bigint,
  totalQuantity: number,
) {
  if (totalQuantity <= 0) return "0";

  return (
    (totalRevenueCents + BigInt(Math.floor(totalQuantity / 2))) /
    BigInt(totalQuantity)
  ).toString();
}

function toTitle(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
