import {
  ContentStatus,
  DepartmentKind,
  FactoryProductionLineStatus,
  OutsourceJobStatus,
  ProductImageVariant,
  RouteProcessingMode,
  RouteProgressStatus,
} from "@/generated/prisma/enums"
import type { CurrencyCode } from "@/generated/prisma/enums"
import { getPrisma } from "@/lib/db"

import { calculateOutsourceUnitCostCents } from "./outsource-cost"
import { calculateQueueQuantities } from "./queue-quantity"

import type {
  GameDepartmentQueueView,
  GameProductionQueuesView,
  ProductionOutsourceJobView,
  ProductionOutsourceOptionView,
  ProductionQueueItem,
  ProductionQueueTone,
} from "../types"

const locale = "tr"

type TranslationRecord = {
  locale: string
  name: string
}

type DepartmentRecord = {
  id: string
  key: string
  operationCostPerPointCents: number
  routeOrder: number
  supportsOutsource: boolean
  translations: TranslationRecord[]
}

type CapacityRecord = {
  departmentId: string
  dailyPointCapacity: number
  effectiveDailyPointCapacity: number
  activeLineCount: number
}

export async function getProductionQueuesView(input: {
  currentDay: number
  factoryId: string
  sectorId: string
}): Promise<GameProductionQueuesView> {
  const prisma = getPrisma()
  const [
    factory,
    departments,
    productionLines,
    routeProgress,
    outsourceConfigs,
    outsourceJobs,
    productionLineTemplates,
  ] = await Promise.all([
    prisma.factory.findUniqueOrThrow({
      where: { id: input.factoryId },
      select: { currencyCode: true },
    }),
    prisma.department.findMany({
      where: {
        kind: DepartmentKind.PRODUCTION,
        sectorId: input.sectorId,
        status: ContentStatus.ACTIVE,
      },
      orderBy: [{ routeOrder: "asc" }, { key: "asc" }],
      select: {
        id: true,
        key: true,
        operationCostPerPointCents: true,
        routeOrder: true,
        supportsOutsource: true,
        translations: {
          where: { locale },
          select: { locale: true, name: true },
        },
      },
    }),
    prisma.factoryProductionLine.findMany({
      where: {
        factoryId: input.factoryId,
        status: {
          in: [
            FactoryProductionLineStatus.IDLE,
            FactoryProductionLineStatus.RUNNING,
          ],
        },
      },
      select: {
        conditionBps: true,
        departmentId: true,
        productionLineTemplate: {
          select: {
            dailyPointCapacity: true,
          },
        },
      },
    }),
    prisma.productionOrderRouteProgress.findMany({
      where: {
        department: {
          kind: DepartmentKind.PRODUCTION,
          sectorId: input.sectorId,
        },
        factoryId: input.factoryId,
        remainingQuantity: { gt: 0 },
        status: {
          in: [
            RouteProgressStatus.BLOCKED,
            RouteProgressStatus.READY,
            RouteProgressStatus.IN_PROGRESS,
            RouteProgressStatus.WAITING_INPUT,
            RouteProgressStatus.WAITING_OUTSOURCE,
          ],
        },
      },
      orderBy: [
        { department: { routeOrder: "asc" } },
        { productionOrder: { priority: "asc" } },
        { productionOrder: { targetDeliveryDay: "asc" } },
        { productionOrder: { createdAt: "asc" } },
        { createdAt: "asc" },
        { id: "asc" },
      ],
      select: {
        canOutsource: true,
        completedQuantity: true,
        departmentId: true,
        id: true,
        inOutsourceQuantity: true,
        inputReadyQuantity: true,
        manualPriorityOverride: true,
        plannedQuantity: true,
        processingMode: true,
        queuePriority: true,
        remainingQuantity: true,
        sequence: true,
        setupPoints: true,
        status: true,
        workloadPointsPerUnit: true,
        department: {
          select: {
            id: true,
            key: true,
            operationCostPerPointCents: true,
            routeOrder: true,
            supportsOutsource: true,
            translations: {
              where: { locale },
              select: { locale: true, name: true },
            },
          },
        },
        productionOrder: {
          select: {
            id: true,
            plannedQuantity: true,
            productionNo: true,
            routeProgress: {
              where: { isRequired: true },
              orderBy: { sequence: "asc" },
              select: {
                completedQuantity: true,
                sequence: true,
              },
            },
            targetDeliveryDay: true,
            customerOrder: {
              select: {
                orderNo: true,
                virtualCustomer: {
                  select: { name: true },
                },
              },
            },
            customerOrderItem: {
              select: {
                productSnapshot: true,
                quantity: true,
                product: {
                  select: {
                    code: true,
                    images: {
                      orderBy: { sortOrder: "asc" },
                      select: {
                        pathname: true,
                        url: true,
                        variant: true,
                      },
                      where: {
                        variant: {
                          in: [
                            ProductImageVariant.CARD,
                            ProductImageVariant.THUMBNAIL,
                          ],
                        },
                      },
                    },
                    name: true,
                    tier: true,
                  },
                },
              },
            },
          },
        },
      },
      take: 500,
    }),
    prisma.outsourceOptionConfig.findMany({
      where: {
        sectorId: input.sectorId,
        status: ContentStatus.ACTIVE,
      },
      orderBy: [{ departmentId: "asc" }, { leadTimeDays: "asc" }],
      select: {
        costMultiplierBps: true,
        delayRiskBps: true,
        departmentId: true,
        id: true,
        leadTimeDays: true,
        optionType: true,
        qualityRiskBps: true,
      },
    }),
    prisma.productionOutsourceJob.findMany({
      where: {
        factoryId: input.factoryId,
        status: {
          in: [OutsourceJobStatus.IN_PROGRESS, OutsourceJobStatus.DELAYED],
        },
      },
      orderBy: [{ readyDay: "asc" }, { createdAt: "asc" }],
      select: {
        departmentId: true,
        id: true,
        optionType: true,
        productionOrderRouteProgressId: true,
        quantity: true,
        readyDay: true,
        sentDay: true,
        status: true,
        totalCostCents: true,
        department: {
          select: { key: true },
        },
        productionOrder: {
          select: {
            productionNo: true,
            customerOrder: {
              select: { orderNo: true },
            },
            customerOrderItem: {
              select: {
                productSnapshot: true,
                product: {
                  select: {
                    images: {
                      orderBy: { sortOrder: "asc" },
                      select: {
                        pathname: true,
                        url: true,
                        variant: true,
                      },
                      where: {
                        variant: {
                          in: [
                            ProductImageVariant.CARD,
                            ProductImageVariant.THUMBNAIL,
                          ],
                        },
                      },
                    },
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.productionLineTemplate.findMany({
      where: {
        directCostPer1000PointsCents: { gt: 0 },
        sectorId: input.sectorId,
        status: ContentStatus.ACTIVE,
      },
      orderBy: { directCostPer1000PointsCents: "asc" },
      select: {
        departmentId: true,
        directCostPer1000PointsCents: true,
      },
    }),
  ])
  const capacities = buildCapacityByDepartment(productionLines)
  const costPer1000PointsByDepartmentId = new Map<string, number>()
  const configsByDepartmentId = new Map<string, typeof outsourceConfigs>()
  const jobsByDepartmentId = new Map<string, ProductionOutsourceJobView[]>()
  const progressByDepartmentId = new Map<string, typeof routeProgress>()

  for (const template of productionLineTemplates) {
    if (!costPer1000PointsByDepartmentId.has(template.departmentId)) {
      costPer1000PointsByDepartmentId.set(
        template.departmentId,
        template.directCostPer1000PointsCents,
      )
    }
  }

  for (const config of outsourceConfigs) {
    const current = configsByDepartmentId.get(config.departmentId) ?? []
    current.push(config)
    configsByDepartmentId.set(config.departmentId, current)
  }

  for (const job of outsourceJobs) {
    const current = jobsByDepartmentId.get(job.departmentId) ?? []
    current.push(toOutsourceJobView(job, input.currentDay, factory.currencyCode))
    jobsByDepartmentId.set(job.departmentId, current)
  }

  for (const progress of routeProgress) {
    const reconciledProgress = {
      ...progress,
      inputReadyQuantity: getReconciledInputReadyQuantity(progress),
    }

    if (getAvailableQuantity(reconciledProgress) <= 0) continue

    const current = progressByDepartmentId.get(reconciledProgress.departmentId) ?? []
    current.push(reconciledProgress)
    progressByDepartmentId.set(reconciledProgress.departmentId, current)
  }

  return {
    currentDay: input.currentDay,
    queues: departments.map((department) =>
      toDepartmentQueue({
        capacity: capacities.get(department.id) ?? emptyCapacity(department.id),
        configs: configsByDepartmentId.get(department.id) ?? [],
        costPer1000Points:
          costPer1000PointsByDepartmentId.get(department.id) ??
          department.operationCostPerPointCents * 1000,
        currencyCode: factory.currencyCode,
        currentDay: input.currentDay,
        department,
        outsourceJobs: jobsByDepartmentId.get(department.id) ?? [],
        routeProgress: progressByDepartmentId.get(department.id) ?? [],
      }),
    ),
  }
}

function buildCapacityByDepartment(
  productionLines: Array<{
    conditionBps: number
    departmentId: string
    productionLineTemplate: { dailyPointCapacity: number }
  }>,
) {
  const capacities = new Map<string, CapacityRecord>()

  for (const line of productionLines) {
    const current = capacities.get(line.departmentId) ?? emptyCapacity(line.departmentId)
    const dailyPointCapacity = Math.max(0, line.productionLineTemplate.dailyPointCapacity)

    current.activeLineCount += 1
    current.dailyPointCapacity += dailyPointCapacity
    current.effectiveDailyPointCapacity += Math.floor(
      (dailyPointCapacity * Math.max(0, line.conditionBps)) / 10_000,
    )
    capacities.set(line.departmentId, current)
  }

  return capacities
}

function emptyCapacity(departmentId: string): CapacityRecord {
  return {
    activeLineCount: 0,
    dailyPointCapacity: 0,
    departmentId,
    effectiveDailyPointCapacity: 0,
  }
}

function toDepartmentQueue(input: {
  capacity: CapacityRecord
  configs: Array<{
    costMultiplierBps: number
    delayRiskBps: number
    departmentId: string
    id: string
    leadTimeDays: number
    optionType: ProductionOutsourceOptionView["optionType"]
    qualityRiskBps: number
  }>
  costPer1000Points: number
  currencyCode: CurrencyCode
  currentDay: number
  department: DepartmentRecord
  outsourceJobs: ProductionOutsourceJobView[]
  routeProgress: Array<{
    canOutsource: boolean
    completedQuantity: number
    departmentId: string
    id: string
    inOutsourceQuantity: number
    inputReadyQuantity: number
    manualPriorityOverride: boolean
    plannedQuantity: number
    processingMode: RouteProcessingMode
    queuePriority: number
    remainingQuantity: number
    sequence: number
    setupPoints: number
    status: RouteProgressStatus
    workloadPointsPerUnit: number
    department: DepartmentRecord
    productionOrder: {
      id: string
      plannedQuantity: number
      productionNo: string
      routeProgress: Array<{
        completedQuantity: number
        sequence: number
      }>
      targetDeliveryDay: number
      customerOrder: {
        orderNo: string
        virtualCustomer: { name: string } | null
      }
      customerOrderItem: {
        productSnapshot: unknown
        quantity: number
        product: {
          code: string | null
          images: Array<{
            pathname: string | null
            url: string
            variant: ProductImageVariant
          }>
          name: string
          tier: ProductionQueueItem["productTier"]
        }
      }
    }
  }>
}): GameDepartmentQueueView {
  const label = pickTranslation(input.department.translations, input.department.key)
  const completedColumnLabel = getCompletedColumnLabel(input.department.key)
  let workPointsBefore = 0
  const allItems = input.routeProgress.map((progress) => {
    const item = toQueueItem({
      completedColumnLabel,
      configs: input.configs,
      costPer1000Points: input.costPer1000Points,
      currencyCode: input.currencyCode,
      currentDay: input.currentDay,
      effectiveDailyPointCapacity: input.capacity.effectiveDailyPointCapacity,
      progress,
      workPointsBefore,
    })

    workPointsBefore += item.remainingWorkPoints

    return item
  })
  const items =
    input.capacity.activeLineCount > 0
      ? allItems.filter(
          (item) => item.processingMode === RouteProcessingMode.INTERNAL,
        )
      : []
  const outsourceCandidates = allItems.filter(
    (item) => item.canOutsource && item.outsourceOptions.length > 0,
  )
  const totalOrderQuantity = allItems.reduce(
    (total, item) => total + item.orderQuantity,
    0,
  )
  const totalCompletedQuantity = allItems.reduce(
    (total, item) => total + item.completedQuantity,
    0,
  )
  const totalInputReadyQuantity = allItems.reduce(
    (total, item) => total + item.inputReadyQuantity,
    0,
  )
  const totalRemainingQuantity = allItems.reduce(
    (total, item) => total + item.queueRemainingQuantity,
    0,
  )

  return {
    actionLabel: getActionLabel(input.department.key),
    activeLineCount: input.capacity.activeLineCount,
    completedColumnLabel,
    currentDay: input.currentDay,
    dailyPointCapacity: input.capacity.dailyPointCapacity,
    departmentId: input.department.id,
    departmentKey: input.department.key,
    effectiveDailyPointCapacity: input.capacity.effectiveDailyPointCapacity,
    items,
    label,
    outsourceCandidates,
    outsourceJobs: input.outsourceJobs,
    summary: {
      dailyCapacityLabel: `${formatNumber(input.capacity.effectiveDailyPointCapacity)} puan/gün`,
      firstStartLabel:
        items[0]?.queueStartLabel ??
        (outsourceCandidates.length > 0 ? "Fason seçimi bekliyor" : "-"),
      nextDeliveryLabel: allItems[0]?.deliveryLabel ?? "-",
      queueCount:
        new Set(allItems.map((item) => item.routeProgressId)).size +
        input.outsourceJobs.length,
      totalCompletedQuantityLabel: `${formatNumber(totalCompletedQuantity)} adet`,
      totalInputReadyQuantityLabel: `${formatNumber(totalInputReadyQuantity)} adet`,
      totalOrderQuantityLabel: `${formatNumber(totalOrderQuantity)} adet`,
      totalRemainingQuantityLabel: `${formatNumber(totalRemainingQuantity)} adet`,
    },
  }
}

function toQueueItem(input: {
  completedColumnLabel: string
  configs: Parameters<typeof toDepartmentQueue>[0]["configs"]
  costPer1000Points: number
  currencyCode: CurrencyCode
  currentDay: number
  effectiveDailyPointCapacity: number
  progress: Parameters<typeof toDepartmentQueue>[0]["routeProgress"][number]
  workPointsBefore: number
}): ProductionQueueItem {
  const item = input.progress.productionOrder.customerOrderItem
  const orderQuantity = input.progress.productionOrder.plannedQuantity
  const {
    completedQuantity,
    inputReadyQuantity,
    queueRemainingQuantity,
    remainingQuantity,
  } = calculateQueueQuantities(input.progress)
  const availableQuantity = queueRemainingQuantity
  const remainingWorkPoints =
    availableQuantity * Math.max(1, input.progress.workloadPointsPerUnit) +
    (completedQuantity <= 0 ? Math.max(0, input.progress.setupPoints) : 0)
  const daysUntilDelivery = input.progress.productionOrder.targetDeliveryDay - input.currentDay
  const deliveryTone = getDeliveryTone(daysUntilDelivery, remainingQuantity)
  const queueStartOffsetDays =
    input.effectiveDailyPointCapacity > 0
      ? Math.floor(input.workPointsBefore / input.effectiveDailyPointCapacity)
      : null
  const queueStartTone = getQueueStartTone(queueStartOffsetDays, daysUntilDelivery)
  const status =
    completedQuantity > 0
      ? RouteProgressStatus.IN_PROGRESS
      : input.effectiveDailyPointCapacity > 0
        ? RouteProgressStatus.READY
        : input.progress.canOutsource
          ? RouteProgressStatus.WAITING_OUTSOURCE
          : RouteProgressStatus.BLOCKED
  const outsourceOptions = input.progress.canOutsource
    ? input.configs.map((config) =>
        toOutsourceOptionView({
          availableQuantity,
          config,
          costPer1000Points: input.costPer1000Points,
          currencyCode: input.currencyCode,
          currentDay: input.currentDay,
          workloadPointsPerUnit: input.progress.workloadPointsPerUnit,
        }),
      )
    : []

  return {
    availableQuantity,
    availableQuantityLabel: `${formatNumber(availableQuantity)} adet`,
    canOutsource: input.progress.canOutsource,
    completedQuantity,
    completedQuantityLabel: `${formatNumber(completedQuantity)} adet`,
    customerName:
      input.progress.productionOrder.customerOrder.virtualCustomer?.name ?? "Müşteri",
    daysUntilDelivery,
    deliveryLabel: formatDeliveryLabel(daysUntilDelivery),
    deliveryTone,
    departmentId: input.progress.departmentId,
    departmentKey: input.progress.department.key,
    id: input.progress.id,
    inputReadyQuantity,
    inputReadyQuantityLabel: `${formatNumber(inputReadyQuantity)} adet`,
    manualPriorityOverride: input.progress.manualPriorityOverride,
    orderNo: input.progress.productionOrder.customerOrder.orderNo,
    orderQuantity,
    orderQuantityLabel: `${formatNumber(orderQuantity)} adet`,
    outsourceOptions,
    productCode: getProductCode(item),
    productImageUrl: getProductImageUrl(item),
    productName: getProductName(item),
    productTier: item.product.tier,
    processingMode: input.progress.processingMode,
    productionNo: input.progress.productionOrder.productionNo,
    productionOrderId: input.progress.productionOrder.id,
    queuePriority: input.progress.queuePriority,
    queueRemainingQuantity,
    queueRemainingQuantityLabel: `${formatNumber(queueRemainingQuantity)} adet`,
    queueStartLabel: formatQueueStartLabel({
      actionLabel: getActionLabel(input.progress.department.key),
      offsetDays: queueStartOffsetDays,
    }),
    queueStartOffsetDays,
    queueStartTone,
    remainingQuantity,
    remainingQuantityLabel: `${formatNumber(remainingQuantity)} adet`,
    remainingWorkPoints,
    routeProgressId: input.progress.id,
    status,
    statusLabel: getStatusLabel(status),
    targetDeliveryDay: input.progress.productionOrder.targetDeliveryDay,
    workPointsBefore: input.workPointsBefore,
    workloadLabel: `${formatNumber(input.progress.workloadPointsPerUnit)} puan/adet`,
  }
}

function toOutsourceOptionView(input: {
  availableQuantity: number
  config: Parameters<typeof toDepartmentQueue>[0]["configs"][number]
  costPer1000Points: number
  currencyCode: CurrencyCode
  currentDay: number
  workloadPointsPerUnit: number
}): ProductionOutsourceOptionView {
  const costPerUnitCents = calculateOutsourceUnitCostCents({
    costMultiplierBps: input.config.costMultiplierBps,
    costPer1000Points: input.costPer1000Points,
    workloadPointsPerUnit: input.workloadPointsPerUnit,
  })
  const totalCostCents = BigInt(costPerUnitCents) * BigInt(input.availableQuantity)
  const presentation = getOutsourceOptionPresentation(input.config.optionType)
  const returnDay = input.currentDay + input.config.leadTimeDays

  return {
    costMultiplierBps: input.config.costMultiplierBps,
    costPerUnitCents,
    costPerUnitLabel: `${formatMoney(costPerUnitCents, input.currencyCode)} / adet`,
    delayRiskBps: input.config.delayRiskBps,
    description: presentation.description,
    id: input.config.id,
    label: presentation.label,
    leadTimeDays: input.config.leadTimeDays,
    leadTimeLabel: `${input.config.leadTimeDays} gün`,
    optionType: input.config.optionType,
    qualityRiskBps: input.config.qualityRiskBps,
    returnDay,
    returnDayLabel: `${returnDay}. gün kapanışı`,
    tone: presentation.tone,
    totalCostCents: totalCostCents.toString(),
    totalCostLabel: formatMoney(totalCostCents, input.currencyCode),
  }
}

function toOutsourceJobView(
  job: {
    departmentId: string
    id: string
    optionType: ProductionOutsourceJobView["optionType"]
    productionOrderRouteProgressId: string
    quantity: number
    readyDay: number
    sentDay: number
    status: ProductionOutsourceJobView["status"]
    totalCostCents: bigint
    department: { key: string }
    productionOrder: {
      productionNo: string
      customerOrder: { orderNo: string }
      customerOrderItem: {
        productSnapshot: unknown
        product: {
          images: Array<{
            pathname: string | null
            url: string
            variant: ProductImageVariant
          }>
          name: string
        }
      }
    }
  },
  currentDay: number,
  currencyCode: CurrencyCode,
): ProductionOutsourceJobView {
  const remainingDays = Math.max(0, job.readyDay - currentDay)
  const item = job.productionOrder.customerOrderItem
  const presentation = getOutsourceOptionPresentation(job.optionType)
  const isDelayed = job.status === OutsourceJobStatus.DELAYED

  return {
    departmentId: job.departmentId,
    departmentKey: job.department.key,
    id: job.id,
    optionLabel: presentation.label,
    optionType: job.optionType,
    orderNo: job.productionOrder.customerOrder.orderNo,
    productImageUrl: getProductImageUrl(item),
    productName: getProductName(item),
    productionNo: job.productionOrder.productionNo,
    quantity: job.quantity,
    quantityLabel: `${formatNumber(job.quantity)} adet`,
    readyDay: job.readyDay,
    remainingDays,
    remainingDaysLabel:
      remainingDays === 0
        ? "Bugün kapanışta döner"
        : `${remainingDays} gün sonra döner`,
    routeProgressId: job.productionOrderRouteProgressId,
    sentDay: job.sentDay,
    status: job.status,
    statusLabel: isDelayed ? "Gecikmeli" : "Fasonda",
    tone: isDelayed ? "danger" : presentation.tone,
    totalCostCents: job.totalCostCents.toString(),
    totalCostLabel: formatMoney(job.totalCostCents, currencyCode),
  }
}

function getOutsourceOptionPresentation(
  optionType: ProductionOutsourceOptionView["optionType"],
) {
  const presentations = {
    FAST: {
      description: "Hızlı teslim, daha yüksek fiyat",
      label: "FAST",
      tone: "warning",
    },
    SAFE: {
      description: "Uzun teslim, daha uygun fiyat",
      label: "SAFE",
      tone: "success",
    },
    STANDARD: {
      description: "Dengeli süre ve standart fiyat",
      label: "STANDARD",
      tone: "info",
    },
  } satisfies Record<
    ProductionOutsourceOptionView["optionType"],
    { description: string; label: string; tone: ProductionQueueTone }
  >

  return presentations[optionType]
}

function getReconciledInputReadyQuantity(
  progress: Parameters<typeof toDepartmentQueue>[0]["routeProgress"][number],
) {
  let previousCompletedQuantity: number | null = null

  for (const routeProgress of progress.productionOrder.routeProgress) {
    if (routeProgress.sequence >= progress.sequence) break

    previousCompletedQuantity = routeProgress.completedQuantity
  }

  const upstreamCompletedQuantity =
    previousCompletedQuantity ?? progress.plannedQuantity

  return Math.max(
    progress.completedQuantity,
    progress.inputReadyQuantity,
    Math.min(progress.plannedQuantity, upstreamCompletedQuantity),
  )
}

function getAvailableQuantity(input: {
  completedQuantity: number
  inOutsourceQuantity: number
  inputReadyQuantity: number
  plannedQuantity: number
}) {
  return Math.max(
    0,
    Math.min(
      input.plannedQuantity - input.completedQuantity,
      input.inputReadyQuantity - input.completedQuantity - input.inOutsourceQuantity,
    ),
  )
}

function getProductName(item: {
  product: { name: string }
  productSnapshot: unknown
}) {
  return readString(readRecord(item.productSnapshot).name) ?? item.product.name
}

function getProductCode(item: {
  product: { code: string | null }
  productSnapshot: unknown
}) {
  return readString(readRecord(item.productSnapshot).code) ?? item.product.code ?? "-"
}

function getProductImageUrl(item: {
  product: {
    images: Array<{
      pathname: string | null
      url: string
      variant: ProductImageVariant
    }>
  }
}) {
  const cardImage = item.product.images.find(
    (image) => image.variant === ProductImageVariant.CARD,
  )
  const thumbnailImage = item.product.images.find(
    (image) => image.variant === ProductImageVariant.THUMBNAIL,
  )
  const image = cardImage ?? thumbnailImage ?? item.product.images[0]

  return image?.url ?? image?.pathname ?? null
}

function getStatusLabel(status: RouteProgressStatus) {
  const labels = {
    BLOCKED: "Blokeli",
    COMPLETED: "Tamamlandı",
    IN_PROGRESS: "İşlemde",
    READY: "Hazır",
    SKIPPED: "Atlandı",
    WAITING_INPUT: "Girdi bekliyor",
    WAITING_OUTSOURCE: "Fason bekliyor",
  } satisfies Record<RouteProgressStatus, string>

  return labels[status]
}

function getDeliveryTone(
  daysUntilDelivery: number,
  remainingQuantity: number,
): ProductionQueueTone {
  if (remainingQuantity <= 0) return "success"
  if (daysUntilDelivery < 0) return "danger"
  if (daysUntilDelivery <= 2) return "warning"

  return "info"
}

function getQueueStartTone(
  offsetDays: number | null,
  daysUntilDelivery: number,
): ProductionQueueTone {
  if (offsetDays === null) return "danger"
  if (offsetDays > daysUntilDelivery) return "danger"
  if (offsetDays >= Math.max(0, daysUntilDelivery - 1)) return "warning"
  if (offsetDays === 0) return "success"

  return "info"
}

function formatDeliveryLabel(daysUntilDelivery: number) {
  if (daysUntilDelivery < 0) {
    return `${Math.abs(daysUntilDelivery)} gün gecikti`
  }

  if (daysUntilDelivery === 0) {
    return "Bugün teslim"
  }

  return `${daysUntilDelivery} gün kaldı`
}

function formatQueueStartLabel({
  actionLabel,
  offsetDays,
}: {
  actionLabel: string
  offsetDays: number | null
}) {
  if (offsetDays === null) return "Hat yok"
  if (offsetDays === 0) return `${actionLabel} bugün`

  return `${actionLabel} ${offsetDays} gün sonra`
}

function getActionLabel(departmentKey: string) {
  const labels: Record<string, string> = {
    cutting: "Kesime",
    dyeing: "Boyamaya",
    embroidery: "Nakışa",
    ironing_packing: "Ütü-pakete",
    printing: "Baskıya",
    sewing: "Dikime",
    washing: "Yıkamaya",
  }

  return labels[departmentKey] ?? "Üretime"
}

function getCompletedColumnLabel(departmentKey: string) {
  const labels: Record<string, string> = {
    cutting: "Kesilen",
    dyeing: "Boyanan",
    embroidery: "Nakış",
    ironing_packing: "Paketlenen",
    printing: "Baskı",
    sewing: "Dikilen",
    washing: "Yıkanan",
  }

  return labels[departmentKey] ?? "İşlenen"
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value)
}

function formatMoney(valueCents: bigint | number, currencyCode: CurrencyCode) {
  return new Intl.NumberFormat("tr-TR", {
    currency: currencyCode,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Number(valueCents) / 100)
}

function pickTranslation(translations: TranslationRecord[], fallbackKey: string) {
  return translations.find((translation) => translation.locale === locale)?.name
    ?? translations[0]?.name
    ?? toTitle(fallbackKey)
}

function toTitle(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null
}
