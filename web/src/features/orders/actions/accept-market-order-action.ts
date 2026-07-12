"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  CustomerOrderStatus,
  MarketOrderOfferStatus,
  Prisma,
  ProductionOrderStatus,
  RouteProgressStatus,
} from "@/generated/prisma/client";
import { USER_ROLES } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";

export async function acceptMarketOrderAction(formData: FormData) {
  const auth = await getCurrentUser();

  if (!auth) redirect("/");
  if (auth.role === USER_ROLES.ADMIN || auth.role === USER_ROLES.SUPER_ADMIN) {
    redirect("/admin");
  }

  const offerId = readOfferId(formData);
  const prisma = getPrisma();
  const playerProfile = await prisma.playerProfile.findUnique({
    where: { userId: auth.id },
    select: {
      factories: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          currentDay: true,
          sectorId: true,
        },
      },
    },
  });
  const factory = playerProfile?.factories[0];

  if (!factory) {
    redirect("/onboarding");
  }

  await prisma.$transaction(async (tx) => {
    const offer = await tx.marketOrderOffer.findFirst({
      where: {
        factoryId: factory.id,
        id: offerId,
        status: MarketOrderOfferStatus.AVAILABLE,
        expiresDay: { gte: factory.currentDay },
      },
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }],
          include: {
            colors: {
              orderBy: [{ sortOrder: "asc" }],
            },
            product: {
              include: {
                routeSteps: {
                  orderBy: { sequence: "asc" },
                  include: {
                    department: {
                      select: { key: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!offer) {
      throw new Error("Kabul edilebilir sipariş teklifi bulunamadı.");
    }

    if (offer.items.length === 0) {
      throw new Error("Bu teklif için ürün kalemi bulunamadı.");
    }

    const nextOrderNumber = (await tx.customerOrder.count({
      where: { factoryId: factory.id },
    })) + 1;
    const orderNo = `SO-${String(nextOrderNumber).padStart(4, "0")}`;
    const materialReadyDay = factory.currentDay + 1;
    const customerOrder = await tx.customerOrder.create({
      data: {
        acceptedDay: factory.currentDay,
        customerSegmentId: offer.customerSegmentId,
        customerVolumeClassId: offer.customerVolumeClassId,
        offerType: offer.offerType,
        factoryId: factory.id,
        marketOrderOfferId: offer.id,
        metadata: {
          accessoryReadyDay: materialReadyDay,
          fabricReadyDay: materialReadyDay,
          materialReadyDay,
          source: "market-order-offer",
          offerNo: offer.offerNo,
          offerType: offer.offerType,
        },
        orderNo,
        paymentTermDays: 7,
        priority: 100,
        sectorId: offer.sectorId,
        status: CustomerOrderStatus.ACTIVE,
        targetDeliveryDay: offer.targetDeliveryDay,
        totalQuantity: offer.totalQuantity,
        totalRevenueCents: offer.totalRevenueCents,
        virtualCustomerId: offer.virtualCustomerId,
      },
      select: { id: true },
    });
    const productionOrderCount = await tx.productionOrder.count({
      where: { factoryId: factory.id },
    });

    for (const [index, item] of offer.items.entries()) {
      const customerOrderItem = await tx.customerOrderItem.create({
        data: {
          customerOrderId: customerOrder.id,
          estimatedProfitCents: item.estimatedProfitCents,
          estimatedUnitCostCents: item.estimatedUnitCostCents,
          factoryId: factory.id,
          metadata: {
            marketOrderOfferItemId: item.id,
          },
          ...(item.pricingSnapshot
            ? { pricingSnapshot: item.pricingSnapshot as Prisma.InputJsonValue }
            : {}),
          productId: item.productId,
          productSnapshot: {
            code: item.product.code,
            id: item.product.id,
            name: item.product.name,
            tier: item.product.tier,
          },
          quantity: item.quantity,
          sortOrder: index,
          totalPriceCents: item.totalPriceCents,
          unitPriceCents: item.unitPriceCents,
        },
        select: { id: true },
      });

      if (item.colors.length > 0) {
        await tx.customerOrderItemColor.createMany({
          data: item.colors.map((color) => ({
            colorVariantId: color.colorVariantId,
            customerOrderItemId: customerOrderItem.id,
            quantity: color.quantity,
            sortOrder: color.sortOrder,
          })),
        });
      }

      const productionNo = `PRD-${String(productionOrderCount + index + 1).padStart(4, "0")}`;
      const productionOrder = await tx.productionOrder.create({
        data: {
          acceptedDay: factory.currentDay,
          customerOrderId: customerOrder.id,
          customerOrderItemId: customerOrderItem.id,
          factoryId: factory.id,
          metadata: {
            accessoryReadyDay: materialReadyDay,
            fabricReadyDay: materialReadyDay,
            marketOrderOfferId: offer.id,
            marketOrderOfferItemId: item.id,
            materialReadyDay,
            source: "market-order-offer",
          },
          plannedQuantity: item.quantity,
          priority: 100,
          productId: item.productId,
          productionNo,
          remainingQuantity: item.quantity,
          sectorId: offer.sectorId,
          status: ProductionOrderStatus.PLANNED,
          targetDeliveryDay: offer.targetDeliveryDay,
        },
        select: { id: true },
      });

      await tx.productionOrderRouteProgress.createMany({
        data: item.product.routeSteps.map((step, stepIndex) => ({
          canOutsource: step.canOutsource,
          completedQuantity: 0,
          departmentId: step.departmentId,
          factoryId: factory.id,
          inputReadyQuantity: stepIndex === 0 ? item.quantity : 0,
          isRequired: step.isRequired,
          metadata: {
            departmentKey: step.department.key,
            source: "market-order-offer",
          },
          plannedQuantity: item.quantity,
          productRouteStepId: step.id,
          productionOrderId: productionOrder.id,
          remainingQuantity: item.quantity,
          sequence: step.sequence,
          setupPoints: step.setupPoints,
          status:
            stepIndex === 0
              ? RouteProgressStatus.READY
              : RouteProgressStatus.WAITING_INPUT,
          workloadPointsPerUnit: step.workloadPointsPerUnit,
        })),
      });
    }

    await tx.marketOrderOffer.update({
      where: { id: offer.id },
      data: {
        status: MarketOrderOfferStatus.ACCEPTED,
      },
    });
  });

  revalidatePath("/game");
  redirect("/game");
}

function readOfferId(formData: FormData) {
  const value = formData.get("offerId");

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Sipariş teklifi seçilemedi.");
  }

  return value.trim();
}
