"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  ContentStatus,
  FactoryProductionLineStatus,
  OutsourceOptionType,
  ProductionOrderStatus,
  RouteProcessingMode,
  RouteProgressStatus,
} from "@/generated/prisma/client"
import { USER_ROLES } from "@/lib/auth/roles"
import { getCurrentUser } from "@/lib/auth/session"
import { getPrisma } from "@/lib/db"

import { calculateOutsourceUnitCostCents } from "../services/outsource-cost"

export type StartOutsourceJobResult =
  | {
      ok: true
      message: string
    }
  | {
      ok: false
      message: string
    }

export async function startOutsourceJobAction(
  routeProgressId: string,
  optionType: OutsourceOptionType,
): Promise<StartOutsourceJobResult> {
  const auth = await getCurrentUser()

  if (!auth) redirect("/")
  if (auth.role === USER_ROLES.ADMIN || auth.role === USER_ROLES.SUPER_ADMIN) {
    redirect("/admin")
  }

  const normalizedRouteProgressId = routeProgressId.trim()

  if (!normalizedRouteProgressId) {
    return { message: "Fasona gönderilecek üretim kaydı bulunamadı.", ok: false }
  }

  const prisma = getPrisma()
  const playerProfile = await prisma.playerProfile.findUnique({
    where: { userId: auth.id },
    select: {
      factories: {
        orderBy: { createdAt: "desc" },
        select: { id: true },
        take: 1,
      },
    },
  })
  const factoryId = playerProfile?.factories[0]?.id

  if (!factoryId) redirect("/onboarding")

  try {
    const result = await prisma.$transaction(async (tx) => {
      const factory = await tx.factory.findUniqueOrThrow({
        where: { id: factoryId },
        select: {
          currentDay: true,
          sectorId: true,
        },
      })
      const progress = await tx.productionOrderRouteProgress.findFirst({
        where: {
          factoryId,
          id: normalizedRouteProgressId,
          isRequired: true,
          remainingQuantity: { gt: 0 },
        },
        select: {
          canOutsource: true,
          completedQuantity: true,
          departmentId: true,
          inOutsourceQuantity: true,
          inputReadyQuantity: true,
          outsourceReadyDay: true,
          plannedQuantity: true,
          processingMode: true,
          productionOrderId: true,
          status: true,
          workloadPointsPerUnit: true,
          department: {
            select: {
              operationCostPerPointCents: true,
              supportsOutsource: true,
            },
          },
          productionOrder: {
            select: {
              productId: true,
              productionNo: true,
            },
          },
        },
      })

      if (!progress || !progress.canOutsource || !progress.department.supportsOutsource) {
        throw new Error("Bu üretim aşaması fasona gönderilemez.")
      }

      const availableQuantity = Math.max(
        0,
        Math.min(
          progress.plannedQuantity - progress.completedQuantity,
          progress.inputReadyQuantity -
            progress.completedQuantity -
            progress.inOutsourceQuantity,
        ),
      )

      if (availableQuantity <= 0) {
        throw new Error("Fasona gönderilmeye hazır adet bulunmuyor.")
      }

      const [config, activeLineCount, costTemplate] = await Promise.all([
        tx.outsourceOptionConfig.findFirst({
          where: {
            departmentId: progress.departmentId,
            optionType,
            sectorId: factory.sectorId,
            status: ContentStatus.ACTIVE,
          },
          select: {
            costMultiplierBps: true,
            delayRiskBps: true,
            leadTimeDays: true,
            qualityRiskBps: true,
          },
        }),
        tx.factoryProductionLine.count({
          where: {
            departmentId: progress.departmentId,
            factoryId,
            status: {
              in: [
                FactoryProductionLineStatus.IDLE,
                FactoryProductionLineStatus.RUNNING,
              ],
            },
          },
        }),
        tx.productionLineTemplate.findFirst({
          where: {
            departmentId: progress.departmentId,
            directCostPer1000PointsCents: { gt: 0 },
            sectorId: factory.sectorId,
            status: ContentStatus.ACTIVE,
          },
          orderBy: { directCostPer1000PointsCents: "asc" },
          select: { directCostPer1000PointsCents: true },
        }),
      ])

      if (!config) {
        throw new Error("Seçilen fason teklifi artık kullanılamıyor.")
      }

      const costPer1000Points =
        costTemplate?.directCostPer1000PointsCents ??
        progress.department.operationCostPerPointCents * 1000
      const costPerUnitCents = calculateOutsourceUnitCostCents({
        costMultiplierBps: config.costMultiplierBps,
        costPer1000Points,
        workloadPointsPerUnit: progress.workloadPointsPerUnit,
      })
      const totalCostCents =
        BigInt(costPerUnitCents) * BigInt(availableQuantity)

      const readyDay = factory.currentDay + config.leadTimeDays
      const progressUpdate = await tx.productionOrderRouteProgress.updateMany({
        where: {
          completedQuantity: progress.completedQuantity,
          id: normalizedRouteProgressId,
          inOutsourceQuantity: progress.inOutsourceQuantity,
          inputReadyQuantity: progress.inputReadyQuantity,
        },
        data: {
          inOutsourceQuantity: { increment: availableQuantity },
          outsourceReadyDay:
            progress.outsourceReadyDay === null
              ? readyDay
              : Math.min(progress.outsourceReadyDay, readyDay),
          processingMode:
            activeLineCount === 0
              ? RouteProcessingMode.OUTSOURCE
              : progress.processingMode,
          status: RouteProgressStatus.WAITING_OUTSOURCE,
        },
      })

      if (progressUpdate.count !== 1) {
        throw new Error("Üretim kaydı değişti; fason teklifini yeniden seçin.")
      }

      await tx.productionOutsourceJob.create({
        data: {
          costPerUnitCents,
          delayRiskBps: config.delayRiskBps,
          departmentId: progress.departmentId,
          factoryId,
          optionType,
          productId: progress.productionOrder.productId,
          productionOrderId: progress.productionOrderId,
          productionOrderRouteProgressId: normalizedRouteProgressId,
          qualityRiskBps: config.qualityRiskBps,
          quantity: availableQuantity,
          readyDay,
          sentDay: factory.currentDay,
          totalCostCents,
          metadata: {
            costMultiplierBps: config.costMultiplierBps,
            costPer1000Points,
            source: "department-queue",
            workloadPointsPerUnit: progress.workloadPointsPerUnit,
          },
        },
      })
      await tx.productionOrder.update({
        where: { id: progress.productionOrderId },
        data: {
          status:
            activeLineCount === 0
              ? ProductionOrderStatus.WAITING_OUTSOURCE
              : ProductionOrderStatus.IN_PROGRESS,
        },
      })

      return { availableQuantity, readyDay }
    })

    revalidatePath("/game")

    return {
      message: `${result.availableQuantity.toLocaleString("tr-TR")} adet fasona gönderildi. ${result.readyDay}. gün kapanışında dönecek.`,
      ok: true,
    }
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Fason üretim başlatılamadı.",
      ok: false,
    }
  }
}
