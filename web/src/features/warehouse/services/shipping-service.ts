import {
  CustomerOrderItemStatus,
  CustomerOrderStatus,
  FinanceCategory,
  FinanceDirection,
  FinanceDueStatus,
  FinanceSourceType,
  Prisma,
  ProductionOrderStatus,
  type PrismaClient,
} from "@/generated/prisma/client"

import {
  calculateDueSettlement,
  calculateEffectiveShippingDay,
  calculateReceivableDueDay,
  calculateShippingState,
} from "./shipping-math"

type ShippingClient = Prisma.TransactionClient | PrismaClient

export async function processShippingAndReceivables(input: {
  factoryDay: number
  factoryId: string
  prisma: ShippingClient
}) {
  const lateOrderIds = await markLateOrders(input)
  const shippedOrderIds = await dispatchReadyOrders(input)
  const settledDueIds = await settleDueReceivables(input)

  return {
    lateOrderIds,
    settledDueIds,
    shippedOrderIds,
  }
}

async function markLateOrders(input: {
  factoryDay: number
  factoryId: string
  prisma: ShippingClient
}) {
  const orders = await input.prisma.customerOrder.findMany({
    where: {
      factoryId: input.factoryId,
      status: {
        in: [
          CustomerOrderStatus.ACTIVE,
          CustomerOrderStatus.IN_PRODUCTION,
          CustomerOrderStatus.READY_TO_SHIP,
          CustomerOrderStatus.PARTIALLY_SHIPPED,
          CustomerOrderStatus.LATE,
        ],
      },
      targetDeliveryDay: { lt: input.factoryDay },
    },
    orderBy: [{ targetDeliveryDay: "asc" }, { createdAt: "asc" }],
    select: {
      completedQuantity: true,
      id: true,
      lateDays: true,
      targetDeliveryDay: true,
      totalQuantity: true,
    },
  })
  const lateOrderIds: string[] = []

  for (const order of orders) {
    if (order.completedQuantity >= order.totalQuantity) continue

    const lateDays = Math.max(0, input.factoryDay - order.targetDeliveryDay)

    if (
      order.lateDays === lateDays &&
      lateDays > 0
    ) {
      lateOrderIds.push(order.id)
      continue
    }

    await input.prisma.customerOrder.update({
      where: { id: order.id },
      data: {
        lateDays,
        status: CustomerOrderStatus.LATE,
      },
    })
    lateOrderIds.push(order.id)
  }

  return lateOrderIds
}

async function dispatchReadyOrders(input: {
  factoryDay: number
  factoryId: string
  prisma: ShippingClient
}) {
  const orders = await input.prisma.customerOrder.findMany({
    where: {
      factoryId: input.factoryId,
      status: {
        in: [
          CustomerOrderStatus.IN_PRODUCTION,
          CustomerOrderStatus.READY_TO_SHIP,
          CustomerOrderStatus.PARTIALLY_SHIPPED,
          CustomerOrderStatus.LATE,
        ],
      },
      targetDeliveryDay: { lte: input.factoryDay },
    },
    orderBy: [{ targetDeliveryDay: "asc" }, { createdAt: "asc" }],
    select: {
      completedDay: true,
      id: true,
      orderNo: true,
      paymentTermDays: true,
      shippedQuantity: true,
      targetDeliveryDay: true,
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          completedQuantity: true,
          id: true,
          quantity: true,
          shippedQuantity: true,
          totalPriceCents: true,
        },
      },
    },
  })
  const shippedOrderIds: string[] = []

  for (const order of orders) {
    const totalQuantity = order.items.reduce(
      (total, item) => total + item.quantity,
      0,
    )
    const completedQuantity = order.items.reduce(
      (total, item) => total + item.completedQuantity,
      0,
    )
    const shippedQuantity = order.items.reduce(
      (total, item) => total + item.shippedQuantity,
      0,
    )
    const shipping = calculateShippingState({
      completedQuantity,
      currentDay: input.factoryDay,
      shippedQuantity,
      targetDeliveryDay: order.targetDeliveryDay,
      totalQuantity,
    })

    if (shipping.quantityToShip <= 0) continue

    const shippedDay = calculateEffectiveShippingDay({
      completedDay: order.completedDay,
      currentDay: input.factoryDay,
      targetDeliveryDay: order.targetDeliveryDay,
    })

    for (const item of order.items) {
      await input.prisma.customerOrderItem.update({
        where: { id: item.id },
        data: {
          shippedQuantity: item.quantity,
          status: CustomerOrderItemStatus.SHIPPED,
        },
      })
    }

    await input.prisma.productionOrder.updateMany({
      where: { customerOrderId: order.id },
      data: { status: ProductionOrderStatus.COMPLETED },
    })
    await input.prisma.customerOrder.update({
      where: { id: order.id },
      data: {
        completedQuantity: totalQuantity,
        lateDays: Math.max(0, shippedDay - order.targetDeliveryDay),
        shippedDay,
        shippedQuantity: totalQuantity,
        status: CustomerOrderStatus.SHIPPED,
      },
    })

    const existingRevenueDue = await input.prisma.factoryFinanceDue.findFirst({
      where: {
        category: FinanceCategory.ORDER_REVENUE,
        factoryId: input.factoryId,
        sourceId: order.id,
        sourceType: FinanceSourceType.CUSTOMER_ORDER,
        status: { not: FinanceDueStatus.CANCELLED },
      },
      select: { id: true },
    })

    if (!existingRevenueDue) {
      const factory = await input.prisma.factory.findUniqueOrThrow({
        where: { id: input.factoryId },
        select: { currentFinancePeriod: true },
      })
      const revenueCents = order.items.reduce(
        (total, item) => total + item.totalPriceCents,
        BigInt(0),
      )

      if (revenueCents > 0) {
        await input.prisma.factoryFinanceDue.create({
          data: {
            amountCents: revenueCents,
            category: FinanceCategory.ORDER_REVENUE,
            createdDay: shippedDay,
            description: `${order.orderNo} sipariş satışı`,
            direction: FinanceDirection.INCOME,
            dueDay: calculateReceivableDueDay({
              paymentTermDays: order.paymentTermDays,
              shippedDay,
            }),
            factoryId: input.factoryId,
            metadata: {
              orderNo: order.orderNo,
              shippedDay,
              shippedQuantity: totalQuantity,
            },
            periodIndex: factory.currentFinancePeriod,
            sourceId: order.id,
            sourceType: FinanceSourceType.CUSTOMER_ORDER,
          },
        })
      }
    }

    shippedOrderIds.push(order.id)
  }

  return shippedOrderIds
}

async function settleDueReceivables(input: {
  factoryDay: number
  factoryId: string
  prisma: ShippingClient
}) {
  const dues = await input.prisma.factoryFinanceDue.findMany({
    where: {
      direction: FinanceDirection.INCOME,
      dueDay: { lte: input.factoryDay },
      factoryId: input.factoryId,
      status: {
        in: [
          FinanceDueStatus.PENDING,
          FinanceDueStatus.PARTIAL,
          FinanceDueStatus.OVERDUE,
        ],
      },
    },
    orderBy: [{ dueDay: "asc" }, { createdAt: "asc" }],
  })
  const factory = await input.prisma.factory.findUniqueOrThrow({
    where: { id: input.factoryId },
    select: {
      cashBalanceCents: true,
      currentFinancePeriod: true,
    },
  })
  const settledDueIds: string[] = []
  let balanceCents = factory.cashBalanceCents

  for (const due of dues) {
    const settlement = calculateDueSettlement({
      amountCents: due.amountCents,
      balanceCents,
      settledAmountCents: due.settledAmountCents,
    })

    if (settlement.remainingAmountCents <= 0) {
      await input.prisma.factoryFinanceDue.update({
        where: { id: due.id },
        data: { status: FinanceDueStatus.PAID },
      })
      continue
    }

    const claimedDue = await input.prisma.factoryFinanceDue.updateMany({
      where: {
        id: due.id,
        status: {
          in: [
            FinanceDueStatus.PENDING,
            FinanceDueStatus.PARTIAL,
            FinanceDueStatus.OVERDUE,
          ],
        },
      },
      data: {
        settledAmountCents: due.amountCents,
        status: FinanceDueStatus.PAID,
      },
    })

    if (claimedDue.count !== 1) continue

    await input.prisma.factory.update({
      where: { id: input.factoryId },
      data: { cashBalanceCents: settlement.balanceAfterCents },
    })
    await input.prisma.factoryFinanceTransaction.create({
      data: {
        amountCents: settlement.remainingAmountCents,
        balanceAfterCents: settlement.balanceAfterCents,
        balanceBeforeCents: balanceCents,
        category: due.category,
        description: due.description ?? "Sipariş geliri tahsilatı",
        direction: FinanceDirection.INCOME,
        factoryId: input.factoryId,
        financeDueId: due.id,
        gameDay: input.factoryDay,
        metadata: {
          dueDay: due.dueDay,
          source: "automatic-receivable-settlement",
        },
        periodIndex: factory.currentFinancePeriod,
        sourceId: due.sourceId,
        sourceType: due.sourceType,
      },
    })

    balanceCents = settlement.balanceAfterCents
    settledDueIds.push(due.id)
  }

  return settledDueIds
}
