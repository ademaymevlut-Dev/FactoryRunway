import type {
  CurrencyCode,
  OutsourceJobStatus,
  OutsourceOptionType,
  ProductTier,
  RouteProcessingMode,
  RouteProgressStatus,
} from "@/generated/prisma/enums"
import type { AutomaticAllocationLine } from "@/features/game/services/production-allocation-math"

export type ProductionQueueTone = "danger" | "info" | "success" | "warning"

export type ProductionOutsourceOptionView = {
  id: string
  optionType: OutsourceOptionType
  label: string
  description: string
  leadTimeDays: number
  leadTimeLabel: string
  costMultiplierBps: number
  costPerUnitCents: number
  costPerUnitLabel: string
  currencyCode: CurrencyCode
  totalCostCents: string
  totalCostLabel: string
  returnDay: number
  returnDayLabel: string
  qualityRiskBps: number
  delayRiskBps: number
  tone: ProductionQueueTone
}

export type ProductionOutsourceJobView = {
  id: string
  routeProgressId: string
  departmentId: string
  departmentKey: string
  orderNo: string
  productionNo: string
  productName: string
  productImageUrl: string | null
  optionType: OutsourceOptionType
  optionLabel: string
  quantity: number
  quantityLabel: string
  sentDay: number
  readyDay: number
  remainingDays: number
  remainingDaysLabel: string
  totalCostCents: string
  totalCostLabel: string
  status: OutsourceJobStatus
  statusLabel: string
  tone: ProductionQueueTone
}

export type ProductionQueueItem = {
  id: string
  routeProgressId: string
  productionOrderId: string
  departmentId: string
  departmentKey: string
  orderNo: string
  productionNo: string
  customerName: string
  productCode: string
  productImageUrl: string | null
  productName: string
  productTier: ProductTier
  status: RouteProgressStatus
  statusLabel: string
  processingMode: RouteProcessingMode
  canOutsource: boolean
  orderQuantity: number
  orderQuantityLabel: string
  inputReadyQuantity: number
  inputReadyQuantityLabel: string
  completedQuantity: number
  completedQuantityLabel: string
  remainingQuantity: number
  remainingQuantityLabel: string
  queueRemainingQuantity: number
  queueRemainingQuantityLabel: string
  availableQuantity: number
  availableQuantityLabel: string
  outsourceOptions: ProductionOutsourceOptionView[]
  queuePriority: number
  targetDeliveryDay: number
  daysUntilDelivery: number
  deliveryLabel: string
  deliveryTone: ProductionQueueTone
  queueStartOffsetDays: number | null
  queueStartLabel: string
  queueStartTone: ProductionQueueTone
  workPointsBefore: number
  remainingWorkPoints: number
  workloadLabel: string
  manualPriorityOverride: boolean
  setupPoints: number
  workloadPointsPerUnit: number
}

export type GameDepartmentQueueView = {
  currentDay: number
  departmentId: string
  departmentKey: string
  label: string
  actionLabel: string
  completedColumnLabel: string
  dailyPointCapacity: number
  effectiveDailyPointCapacity: number
  activeLineCount: number
  planningLines: AutomaticAllocationLine[]
  items: ProductionQueueItem[]
  outsourceCandidates: ProductionQueueItem[]
  outsourceJobs: ProductionOutsourceJobView[]
  summary: {
    queueCount: number
    totalOrderQuantityLabel: string
    totalInputReadyQuantityLabel: string
    totalCompletedQuantityLabel: string
    totalRemainingQuantityLabel: string
    nextDeliveryLabel: string
    dailyCapacityLabel: string
    firstStartLabel: string
  }
}

export type GameProductionQueuesView = {
  currentDay: number
  queues: GameDepartmentQueueView[]
}
