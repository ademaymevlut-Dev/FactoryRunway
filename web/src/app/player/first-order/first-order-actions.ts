"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  ContentStatus,
  CustomerOrderStatus,
  Prisma,
  ProductionOrderStatus,
  RouteProgressStatus,
  TutorialKey,
  TutorialStatus,
  TutorialStep,
} from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { USER_ROLES } from "@/lib/auth/roles";
import { getPrisma } from "@/lib/db";

export type FirstOrderAcceptState = {
  status: "idle" | "error";
  message: string;
};

type FirstOrderMetadata = {
  offerPriceCents?: number;
  offerPrice?: number;
  unitPriceCents?: number;
  unitPrice?: number;
};

export async function acceptFirstOrderAction(
  _previousState: FirstOrderAcceptState,
  formData: FormData,
): Promise<FirstOrderAcceptState> {
  const optionId = readText(formData, "optionId");

  try {
    await createFirstOrder(optionId);
  } catch (cause) {
    return {
      status: "error",
      message:
        cause instanceof Error
          ? cause.message
          : "İlk sipariş kabul edilirken bir sorun oluştu.",
    };
  }

  revalidatePath("/player");
  revalidatePath("/player/first-order");
  revalidatePath("/player/first-order/simulation");
  redirect("/player/first-order/simulation");
}

async function createFirstOrder(optionId: string) {
  const auth = await getCurrentUser();

  if (!auth) redirect("/");
  if (auth.role === USER_ROLES.ADMIN || auth.role === USER_ROLES.SUPER_ADMIN) {
    redirect("/admin");
  }

  const prisma = getPrisma();

  return prisma.$transaction(
    async (tx) => {
      const playerProfile = await tx.playerProfile.findUnique({
        where: { userId: auth.id },
        include: {
          factories: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              sectorId: true,
              currentDay: true,
              currencyCode: true,
            },
          },
        },
      });

      const factory = playerProfile?.factories[0];
      if (!playerProfile || !factory) {
        throw new Error("Fabrika bulunamadı. Önce onboarding akışını tamamla.");
      }

      const existingTutorial = await tx.tutorialProgress.findUnique({
        where: {
          factoryId_tutorialKey: {
            factoryId: factory.id,
            tutorialKey: TutorialKey.FIRST_ORDER,
          },
        },
        select: { customerOrderId: true, productionOrderId: true },
      });

      if (existingTutorial?.customerOrderId || existingTutorial?.productionOrderId) {
        return;
      }

      const option = await tx.firstOrderProductOption.findFirst({
        where: {
          id: optionId,
          sectorId: factory.sectorId,
          tutorialKey: TutorialKey.FIRST_ORDER,
          status: ContentStatus.ACTIVE,
        },
        include: {
          product: {
            include: {
              category: true,
              productType: true,
              routeSteps: {
                orderBy: { sequence: "asc" },
                include: { department: true },
              },
            },
          },
        },
      });

      if (!option) {
        throw new Error("Seçilen ilk sipariş ürünü artık kullanılamıyor.");
      }

      if (!option.product.routeSteps.length) {
        throw new Error("Bu ürünün üretim rotası tanımlanmamış.");
      }

      const activeOrderCount = await tx.customerOrder.count({
        where: {
          factoryId: factory.id,
          status: {
            in: [
              CustomerOrderStatus.ACTIVE,
              CustomerOrderStatus.IN_PRODUCTION,
              CustomerOrderStatus.READY_TO_SHIP,
            ],
          },
        },
      });

      if (activeOrderCount > 0) {
        return;
      }

      const metadata = readMetadata(option.metadata);
      const quantity = option.defaultQuantity;
      const totalPriceCents =
        moneyCents(metadata.offerPriceCents, metadata.offerPrice) ??
        (moneyCents(metadata.unitPriceCents, metadata.unitPrice) ??
          option.product.baseUnitPriceCents) *
          quantity;
      const unitPriceCents = Math.max(
        0,
        Math.round(totalPriceCents / quantity),
      );
      const acceptedDay = factory.currentDay;
      const materialReadyDay = acceptedDay + 1;
      const targetDeliveryDay = acceptedDay + option.targetDeliveryDays;
      const nextNumber = (await tx.customerOrder.count({
        where: { factoryId: factory.id },
      })) + 1;
      const orderNo = `FO-${String(nextNumber).padStart(3, "0")}`;
      const productionNo = `PRD-${String(nextNumber).padStart(3, "0")}`;

      const customerOrder = await tx.customerOrder.create({
        data: {
          factoryId: factory.id,
          sectorId: factory.sectorId,
          orderNo,
          acceptedDay,
          targetDeliveryDay,
          paymentTermDays: 7,
          priority: 100,
          totalQuantity: quantity,
          totalRevenueCents: BigInt(totalPriceCents),
          metadata: {
            accessoryReadyDay: materialReadyDay,
            source: "first-order",
            firstOrderOptionId: option.id,
            currencyCode: factory.currencyCode,
            fabricReadyDay: materialReadyDay,
            materialReadyDay,
          },
        },
        select: { id: true },
      });

      const customerOrderItem = await tx.customerOrderItem.create({
        data: {
          customerOrderId: customerOrder.id,
          factoryId: factory.id,
          productId: option.productId,
          quantity,
          unitPriceCents,
          totalPriceCents: BigInt(totalPriceCents),
          sortOrder: 0,
          productSnapshot: {
            id: option.product.id,
            code: option.product.code,
            name: option.product.name,
            tier: option.product.tier,
            categoryId: option.product.categoryId,
            productTypeId: option.product.productTypeId,
          },
          pricingSnapshot: {
            source: "first-order-option",
            baseUnitPriceCents: option.product.baseUnitPriceCents,
            unitPriceCents,
            totalPriceCents,
          },
          metadata: {
            firstOrderOptionId: option.id,
          },
        },
        select: { id: true },
      });

      const productionOrder = await tx.productionOrder.create({
        data: {
          factoryId: factory.id,
          sectorId: factory.sectorId,
          customerOrderId: customerOrder.id,
          customerOrderItemId: customerOrderItem.id,
          productId: option.productId,
          productionNo,
          plannedQuantity: quantity,
          remainingQuantity: quantity,
          priority: 100,
          acceptedDay,
          targetDeliveryDay,
          status: ProductionOrderStatus.PLANNED,
          metadata: {
            accessoryReadyDay: materialReadyDay,
            source: "first-order",
            firstOrderOptionId: option.id,
            fabricReadyDay: materialReadyDay,
            materialReadyDay,
          },
        },
        select: { id: true },
      });

      await tx.productionOrderRouteProgress.createMany({
        data: option.product.routeSteps.map((step, index) => ({
          factoryId: factory.id,
          productionOrderId: productionOrder.id,
          productRouteStepId: step.id,
          departmentId: step.departmentId,
          sequence: step.sequence,
          isRequired: step.isRequired,
          canOutsource: step.canOutsource,
          plannedQuantity: quantity,
          inputReadyQuantity: index === 0 ? quantity : 0,
          remainingQuantity: quantity,
          workloadPointsPerUnit: step.workloadPointsPerUnit,
          setupPoints: step.setupPoints,
          status:
            index === 0
              ? RouteProgressStatus.READY
              : RouteProgressStatus.WAITING_INPUT,
          metadata: {
            departmentKey: step.department.key,
            source: "first-order",
          },
        })),
      });

      await tx.tutorialProgress.upsert({
        where: {
          factoryId_tutorialKey: {
            factoryId: factory.id,
            tutorialKey: TutorialKey.FIRST_ORDER,
          },
        },
        update: {
          status: TutorialStatus.IN_PROGRESS,
          step: TutorialStep.PRODUCTION_ORDER_CREATED,
          selectedProductId: option.productId,
          customerOrderId: customerOrder.id,
          productionOrderId: productionOrder.id,
          currentDay: acceptedDay,
          metadata: {
            firstOrderOptionId: option.id,
            orderNo,
            productionNo,
          },
        },
        create: {
          factoryId: factory.id,
          tutorialKey: TutorialKey.FIRST_ORDER,
          status: TutorialStatus.IN_PROGRESS,
          step: TutorialStep.PRODUCTION_ORDER_CREATED,
          selectedProductId: option.productId,
          customerOrderId: customerOrder.id,
          productionOrderId: productionOrder.id,
          currentDay: acceptedDay,
          metadata: {
            firstOrderOptionId: option.id,
            orderNo,
            productionNo,
          },
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) throw new Error(`${key} zorunlu.`);
  return result;
}

function readMetadata(value: unknown): FirstOrderMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;

  return {
    offerPriceCents: positiveInteger(source.offerPriceCents),
    offerPrice: positiveNumber(source.offerPrice),
    unitPriceCents: positiveInteger(source.unitPriceCents),
    unitPrice: positiveNumber(source.unitPrice),
  };
}

function moneyCents(centsValue: unknown, currencyValue: unknown) {
  return positiveInteger(centsValue) ?? currencyToCents(currencyValue);
}

function positiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}

function positiveNumber(value: unknown) {
  const parsed =
    typeof value === "string"
      ? Number(value.replace(",", "."))
      : value;

  return typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : undefined;
}

function currencyToCents(value: unknown) {
  const amount = positiveNumber(value);
  return amount === undefined ? undefined : Math.round(amount * 100);
}
