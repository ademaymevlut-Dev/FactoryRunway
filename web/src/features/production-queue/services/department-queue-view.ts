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
import {
  calculateEffectiveLinePointCapacity,
  getLineStaffCoverageBps,
} from "@/features/game/services/production-capacity"
import { calculateRouteProgressQuantities } from "@/features/game/services/route-progress-availability"
import type { AutomaticAllocationLine } from "@/features/game/services/production-allocation-math"
import { getPrisma } from "@/lib/db"
import {
  localizedMetadataString,
  normalizeLocale,
  numberLocale,
  preferredTranslation,
  type SupportedLocale,
} from "@/lib/i18n/locales"

import { productionQueueCopy } from "../production-queue-copy"
import { calculateOutsourceUnitCostCents } from "./outsource-cost"
import { calculateQueueQuantities } from "./queue-quantity"
import {
  getProductionQueueUpstreamWaitKind,
  isWaitingForUpstreamInput,
} from "./queue-upstream-wait"

import type {
  GameDepartmentQueueView,
  GameProductionQueuesView,
  ProductionOutsourceJobView,
  ProductionOutsourceOptionView,
  ProductionQueueItem,
  ProductionQueueTone,
} from "../types"

type TranslationRecord = {
  locale: string
  name: string
}

type DepartmentRecord = {
  id: string
  key: string
  routeOrder: number
  supportsOutsource: boolean
  translations: TranslationRecord[]
}

type CapacityRecord = {
  departmentId: string
  dailyPointCapacity: number
  effectiveDailyPointCapacity: number
  activeLineCount: number
  planningLines: AutomaticAllocationLine[]
}

export async function getProductionQueuesView(input: {
  currentDay: number
  factoryId: string
  locale?: SupportedLocale | string
  sectorId: string
}): Promise<GameProductionQueuesView> {
  const locale = normalizeLocale(input.locale)
  const translationLocaleFilter = { in: getTranslationLocaleFallbacks(locale) }
  const prisma = getPrisma()
  const [
    factory,
    departments,
    productionLines,
    routeProgress,
    outsourceConfigs,
    outsourceJobs,
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
        routeOrder: true,
        supportsOutsource: true,
        translations: {
          where: { locale: translationLocaleFilter },
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
      orderBy: [{ sortOrder: "asc" }, { lineNumber: "asc" }],
      select: {
        conditionBps: true,
        departmentId: true,
        id: true,
        lineNumber: true,
        productionLineTemplateId: true,
        sortOrder: true,
        productionLineTemplate: {
          select: {
            dailyPointCapacity: true,
            staffRequirements: {
              select: { requiredQuantity: true },
            },
          },
        },
        staffAssignments: {
          where: { status: "ACTIVE" },
          select: { quantity: true },
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
            routeOrder: true,
            supportsOutsource: true,
            translations: {
              where: { locale: translationLocaleFilter },
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
        baseCostPer1000PointsCents: { gt: 0 },
        sectorId: input.sectorId,
        status: ContentStatus.ACTIVE,
      },
      orderBy: [{ departmentId: "asc" }, { leadTimeDays: "asc" }],
      select: {
        baseCostPer1000PointsCents: true,
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
  ])
  const capacities = buildCapacityByDepartment(productionLines)
  const configsByDepartmentId = new Map<string, typeof outsourceConfigs>()
  const jobsByDepartmentId = new Map<string, ProductionOutsourceJobView[]>()
  const progressByDepartmentId = new Map<string, typeof routeProgress>()
  const upstreamWaitingCountByDepartmentId = new Map<string, number>()

  for (const config of outsourceConfigs) {
    const current = configsByDepartmentId.get(config.departmentId) ?? []
    current.push(config)
    configsByDepartmentId.set(config.departmentId, current)
  }

  for (const job of outsourceJobs) {
    const current = jobsByDepartmentId.get(job.departmentId) ?? []
    current.push(
      toOutsourceJobView(job, input.currentDay, factory.currencyCode, locale),
    )
    jobsByDepartmentId.set(job.departmentId, current)
  }

  for (const progress of routeProgress) {
    const reconciledProgress = {
      ...progress,
      inputReadyQuantity: getReconciledInputReadyQuantity(progress),
    }
    const quantities = calculateRouteProgressQuantities(reconciledProgress)

    if (quantities.internalAvailableQuantity <= 0) {
      if (isWaitingForUpstreamInput(quantities)) {
        upstreamWaitingCountByDepartmentId.set(
          reconciledProgress.departmentId,
          (upstreamWaitingCountByDepartmentId.get(
            reconciledProgress.departmentId,
          ) ?? 0) + 1,
        )
      }

      continue
    }

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
        currencyCode: factory.currencyCode,
        currentDay: input.currentDay,
        department,
        locale,
        outsourceJobs: jobsByDepartmentId.get(department.id) ?? [],
        routeProgress: progressByDepartmentId.get(department.id) ?? [],
        upstreamWaitingCount:
          upstreamWaitingCountByDepartmentId.get(department.id) ?? 0,
      }),
    ),
  }
}

function getTranslationLocaleFallbacks(locale: SupportedLocale) {
  return locale === "tr" ? ["tr", "en"] : ["en", "tr"]
}

function buildCapacityByDepartment(
  productionLines: Array<{
    conditionBps: number
    departmentId: string
    id: string
    lineNumber: number
    productionLineTemplateId: string
    sortOrder: number
    productionLineTemplate: {
      dailyPointCapacity: number
      staffRequirements: Array<{ requiredQuantity: number }>
    }
    staffAssignments: Array<{ quantity: number }>
  }>,
) {
  const capacities = new Map<string, CapacityRecord>()

  for (const line of productionLines) {
    const current = capacities.get(line.departmentId) ?? emptyCapacity(line.departmentId)
    const dailyPointCapacity = Math.max(0, line.productionLineTemplate.dailyPointCapacity)
    const staffCoverageBps = getLineStaffCoverageBps({
      assignedStaffQuantity: line.staffAssignments.reduce(
        (total, assignment) => total + assignment.quantity,
        0,
      ),
      requiredStaffQuantity: line.productionLineTemplate.staffRequirements.reduce(
        (total, requirement) => total + requirement.requiredQuantity,
        0,
      ),
    })
    const effectivePointCapacity = calculateEffectiveLinePointCapacity({
      conditionBps: line.conditionBps,
      dailyPointCapacity,
      staffCoverageBps,
    })

    current.activeLineCount += 1
    current.dailyPointCapacity += dailyPointCapacity
    current.effectiveDailyPointCapacity += effectivePointCapacity
    current.planningLines.push({
      conditionBps: line.conditionBps,
      dailyPointCapacity,
      departmentId: line.departmentId,
      effectivePointCapacity,
      id: line.id,
      lineNumber: line.lineNumber,
      productionLineTemplateId: line.productionLineTemplateId,
      sortOrder: line.sortOrder,
      staffCoverageBps,
    })
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
    planningLines: [],
  }
}

function toDepartmentQueue(input: {
  capacity: CapacityRecord
  configs: Array<{
    baseCostPer1000PointsCents: number
    costMultiplierBps: number
    delayRiskBps: number
    departmentId: string
    id: string
    leadTimeDays: number
    optionType: ProductionOutsourceOptionView["optionType"]
    qualityRiskBps: number
  }>
  currencyCode: CurrencyCode
  currentDay: number
  department: DepartmentRecord
  locale: SupportedLocale
  outsourceJobs: ProductionOutsourceJobView[]
  upstreamWaitingCount: number
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
  const copy = productionQueueCopy[input.locale].service
  const label = pickTranslation(
    input.department.translations,
    input.department.key,
    input.locale,
  )
  const completedColumnLabel = getCompletedColumnLabel(
    input.department.key,
    input.locale,
  )
  let workPointsBefore = 0
  const allItems = input.routeProgress.map((progress) => {
    const item = toQueueItem({
      completedColumnLabel,
      configs: input.configs,
      currencyCode: input.currencyCode,
      currentDay: input.currentDay,
      effectiveDailyPointCapacity: input.capacity.effectiveDailyPointCapacity,
      locale: input.locale,
      progress,
      workPointsBefore,
    })

    workPointsBefore += item.remainingWorkPoints

    return item
  })
  const items =
    input.capacity.activeLineCount > 0
      ? allItems
      : []
  const outsourceCandidates =
    input.capacity.activeLineCount === 0
      ? allItems.filter(
          (item) => item.canOutsource && item.outsourceOptions.length > 0,
        )
      : []
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
  const upstreamWaitKind = getProductionQueueUpstreamWaitKind(
    input.department.key,
    input.upstreamWaitingCount,
  )
  const upstreamWaitingCount = upstreamWaitKind
    ? input.upstreamWaitingCount
    : 0

  return {
    actionLabel: getActionLabel(input.department.key, input.locale),
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
    planningLines: input.capacity.planningLines,
    upstreamWait: {
      count: upstreamWaitingCount,
      kind: upstreamWaitKind,
    },
    summary: {
      dailyCapacityLabel: copy.pointsPerDay(
        formatNumber(input.capacity.effectiveDailyPointCapacity, input.locale),
      ),
      firstStartLabel:
        items[0]?.queueStartLabel ??
        (outsourceCandidates.length > 0 ? copy.firstStartOutsource : "-"),
      nextDeliveryLabel: allItems[0]?.deliveryLabel ?? "-",
      queueCount:
        new Set(allItems.map((item) => item.routeProgressId)).size +
        upstreamWaitingCount +
        input.outsourceJobs.length,
      totalCompletedQuantityLabel: copy.quantity(
        formatNumber(totalCompletedQuantity, input.locale),
      ),
      totalInputReadyQuantityLabel: copy.quantity(
        formatNumber(totalInputReadyQuantity, input.locale),
      ),
      totalOrderQuantityLabel: copy.quantity(
        formatNumber(totalOrderQuantity, input.locale),
      ),
      totalRemainingQuantityLabel: copy.quantity(
        formatNumber(totalRemainingQuantity, input.locale),
      ),
    },
  }
}

function toQueueItem(input: {
  completedColumnLabel: string
  configs: Parameters<typeof toDepartmentQueue>[0]["configs"]
  currencyCode: CurrencyCode
  currentDay: number
  effectiveDailyPointCapacity: number
  locale: SupportedLocale
  progress: Parameters<typeof toDepartmentQueue>[0]["routeProgress"][number]
  workPointsBefore: number
}): ProductionQueueItem {
  const copy = productionQueueCopy[input.locale].service
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
          currencyCode: input.currencyCode,
          currentDay: input.currentDay,
          locale: input.locale,
          workloadPointsPerUnit: input.progress.workloadPointsPerUnit,
        }),
      )
    : []

  return {
    availableQuantity,
    availableQuantityLabel: copy.quantity(formatNumber(availableQuantity, input.locale)),
    canOutsource: input.progress.canOutsource,
    completedQuantity,
    completedQuantityLabel: copy.quantity(formatNumber(completedQuantity, input.locale)),
    customerName:
      input.progress.productionOrder.customerOrder.virtualCustomer?.name ??
      copy.customerFallback,
    daysUntilDelivery,
    deliveryLabel: formatDeliveryLabel(daysUntilDelivery, input.locale),
    deliveryTone,
    departmentId: input.progress.departmentId,
    departmentKey: input.progress.department.key,
    id: input.progress.id,
    inputReadyQuantity,
    inputReadyQuantityLabel: copy.quantity(
      formatNumber(inputReadyQuantity, input.locale),
    ),
    manualPriorityOverride: input.progress.manualPriorityOverride,
    orderNo: input.progress.productionOrder.customerOrder.orderNo,
    orderQuantity,
    orderQuantityLabel: copy.quantity(formatNumber(orderQuantity, input.locale)),
    outsourceOptions,
    productCode: getProductCode(item),
    productImageUrl: getProductImageUrl(item),
    productName: getProductName(item, input.locale),
    productTier: item.product.tier,
    processingMode: input.progress.processingMode,
    productionNo: input.progress.productionOrder.productionNo,
    productionOrderId: input.progress.productionOrder.id,
    queuePriority: input.progress.queuePriority,
    queueRemainingQuantity,
    queueRemainingQuantityLabel: copy.quantity(
      formatNumber(queueRemainingQuantity, input.locale),
    ),
    queueStartLabel: formatQueueStartLabel({
      actionLabel: getActionLabel(input.progress.department.key, input.locale),
      locale: input.locale,
      offsetDays: queueStartOffsetDays,
    }),
    queueStartOffsetDays,
    queueStartTone,
    remainingQuantity,
    remainingQuantityLabel: copy.quantity(
      formatNumber(remainingQuantity, input.locale),
    ),
    remainingWorkPoints,
    routeProgressId: input.progress.id,
    setupPoints: input.progress.setupPoints,
    status,
    statusLabel: copy.status[status],
    targetDeliveryDay: input.progress.productionOrder.targetDeliveryDay,
    workPointsBefore: input.workPointsBefore,
    workloadPointsPerUnit: input.progress.workloadPointsPerUnit,
    workloadLabel: copy.pointPerUnit(
      formatNumber(input.progress.workloadPointsPerUnit, input.locale),
    ),
  }
}

function toOutsourceOptionView(input: {
  availableQuantity: number
  config: Parameters<typeof toDepartmentQueue>[0]["configs"][number]
  currencyCode: CurrencyCode
  currentDay: number
  locale: SupportedLocale
  workloadPointsPerUnit: number
}): ProductionOutsourceOptionView {
  const copy = productionQueueCopy[input.locale].service
  const costPerUnitCents = calculateOutsourceUnitCostCents({
    costMultiplierBps: input.config.costMultiplierBps,
    costPer1000Points: input.config.baseCostPer1000PointsCents,
    workloadPointsPerUnit: input.workloadPointsPerUnit,
  })
  const totalCostCents = BigInt(costPerUnitCents) * BigInt(input.availableQuantity)
  const presentation = copy.outsourceOption[input.config.optionType]
  const returnDay = input.currentDay + input.config.leadTimeDays

  return {
    costMultiplierBps: input.config.costMultiplierBps,
    costPerUnitCents,
    costPerUnitLabel: copy.unitCost(
      formatMoney(costPerUnitCents, input.currencyCode, input.locale),
    ),
    currencyCode: input.currencyCode,
    delayRiskBps: input.config.delayRiskBps,
    description: presentation.description,
    id: input.config.id,
    label: presentation.label,
    leadTimeDays: input.config.leadTimeDays,
    leadTimeLabel: copy.delivery.remaining(input.config.leadTimeDays),
    optionType: input.config.optionType,
    qualityRiskBps: input.config.qualityRiskBps,
    returnDay,
    returnDayLabel: copy.returnDayClosing(returnDay),
    tone: presentation.tone,
    totalCostCents: totalCostCents.toString(),
    totalCostLabel: formatMoney(totalCostCents, input.currencyCode, input.locale),
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
  locale: SupportedLocale,
): ProductionOutsourceJobView {
  const copy = productionQueueCopy[locale].service
  const remainingDays = Math.max(0, job.readyDay - currentDay)
  const item = job.productionOrder.customerOrderItem
  const presentation = copy.outsourceOption[job.optionType]
  const isDelayed = job.status === OutsourceJobStatus.DELAYED

  return {
    departmentId: job.departmentId,
    departmentKey: job.department.key,
    id: job.id,
    optionLabel: presentation.label,
    optionType: job.optionType,
    orderNo: job.productionOrder.customerOrder.orderNo,
    productImageUrl: getProductImageUrl(item),
    productName: getProductName(item, locale),
    productionNo: job.productionOrder.productionNo,
    quantity: job.quantity,
    quantityLabel: copy.quantity(formatNumber(job.quantity, locale)),
    readyDay: job.readyDay,
    remainingDays,
    remainingDaysLabel:
      isDelayed
        ? copy.statusOutsourcePaymentPending
        : remainingDays === 0
        ? copy.returns.today
        : copy.returns.later(remainingDays),
    routeProgressId: job.productionOrderRouteProgressId,
    sentDay: job.sentDay,
    status: job.status,
    statusLabel: isDelayed
      ? copy.statusOutsourcePaymentPending
      : copy.statusOutsourceInProgress,
    tone: isDelayed ? "danger" : presentation.tone,
    totalCostCents: job.totalCostCents.toString(),
    totalCostLabel: formatMoney(job.totalCostCents, currencyCode, locale),
  }
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

function getProductName(item: {
  product: { name: string }
  productSnapshot: unknown
}, locale: SupportedLocale) {
  const snapshot = readRecord(item.productSnapshot)

  return (
    localizedMetadataString(snapshot, "name", locale) ??
    readString(snapshot.name) ??
    item.product.name
  )
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

function formatDeliveryLabel(
  daysUntilDelivery: number,
  locale: SupportedLocale,
) {
  const copy = productionQueueCopy[locale].service.delivery

  if (daysUntilDelivery < 0) {
    return copy.delayed(Math.abs(daysUntilDelivery))
  }

  if (daysUntilDelivery === 0) {
    return copy.dueToday
  }

  return copy.remaining(daysUntilDelivery)
}

function formatQueueStartLabel({
  actionLabel,
  locale,
  offsetDays,
}: {
  actionLabel: string
  locale: SupportedLocale
  offsetDays: number | null
}) {
  const copy = productionQueueCopy[locale].service

  if (offsetDays === null) return copy.noLine
  if (offsetDays === 0) return copy.queueStart.today(actionLabel)

  return copy.queueStart.later(actionLabel, offsetDays)
}

function getActionLabel(departmentKey: string, locale: SupportedLocale) {
  const labels = productionQueueCopy[locale].service.actionLabel

  return labels[departmentKey as keyof typeof labels] ?? labels.fallback
}

function getCompletedColumnLabel(
  departmentKey: string,
  locale: SupportedLocale,
) {
  const labels = productionQueueCopy[locale].service.completedColumn

  return labels[departmentKey as keyof typeof labels] ?? labels.fallback
}

function formatNumber(value: number, locale: SupportedLocale) {
  return new Intl.NumberFormat(numberLocale(locale)).format(value)
}

function formatMoney(
  valueCents: bigint | number,
  currencyCode: CurrencyCode,
  locale: SupportedLocale,
) {
  return new Intl.NumberFormat(numberLocale(locale), {
    currency: currencyCode,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Number(valueCents) / 100)
}

function pickTranslation(
  translations: TranslationRecord[],
  fallbackKey: string,
  locale: SupportedLocale,
) {
  return preferredTranslation(translations, locale)?.name ?? toTitle(fallbackKey)
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
