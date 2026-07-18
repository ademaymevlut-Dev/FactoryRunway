"use client"

import {
  Clock3,
  Droplet,
  Factory,
  GripVertical,
  PackageCheck,
  Plus,
  PackageOpen,
  Printer,
  Scissors,
  Send,
  Shirt,
  Sparkles,
  Waves,
} from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from "@/components/ui/sortable"
import { useGameUiStore } from "@/features/game/store/game-ui-store"
import { buildDepartmentPlannedQuantities } from "@/features/game/services/production-allocation-math"
import { cn } from "@/lib/utils"

import { startOutsourceJobAction } from "../actions/start-outsource-job-action"
import { updateDepartmentWorkloadPriorityAction } from "../actions/update-department-workload-priority-action"
import styles from "./department-queue-panel.module.css"
import type {
  GameDepartmentQueueView,
  GameProductionQueuesView,
  ProductionOutsourceJobView,
  ProductionOutsourceOptionView,
  ProductionQueueItem,
} from "../types"

export function DepartmentQueuePanel({
  departmentKeys,
  investmentDepartmentIds,
  queues,
}: {
  departmentKeys: string[]
  investmentDepartmentIds: string[]
  queues: GameProductionQueuesView
}) {
  const visibleQueues = useMemo(() => {
    const requestedKeys = new Set(departmentKeys)
    const matchedQueues = queues.queues.filter((queue) =>
      requestedKeys.has(queue.departmentKey),
    )

    return matchedQueues.length > 0 ? matchedQueues : queues.queues
  }, [departmentKeys, queues.queues])
  const [activeDepartmentKey, setActiveDepartmentKey] = useState(
    visibleQueues[0]?.departmentKey ?? "",
  )
  const resolvedDepartmentKey = visibleQueues.some(
    (queue) => queue.departmentKey === activeDepartmentKey,
  )
    ? activeDepartmentKey
    : visibleQueues[0]?.departmentKey ?? ""
  const activeQueue =
    visibleQueues.find((queue) => queue.departmentKey === resolvedDepartmentKey)
    ?? visibleQueues[0]

  if (!activeQueue) {
    return (
      <div className="grid min-h-[320px] place-items-center text-center text-xs text-muted-foreground">
        Üretim kuyruğu bulunamadı.
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[360px] flex-col gap-2 text-xs">
      {visibleQueues.length > 1 ? (
        <DepartmentTabs
          activeDepartmentKey={activeQueue.departmentKey}
          queues={visibleQueues}
          onChange={setActiveDepartmentKey}
        />
      ) : null}
      <DepartmentQueue
        canInvest={investmentDepartmentIds.includes(activeQueue.departmentId)}
        key={getQueueRevision(activeQueue)}
        queue={activeQueue}
      />
    </div>
  )
}

function DepartmentTabs({
  activeDepartmentKey,
  onChange,
  queues,
}: {
  activeDepartmentKey: string
  onChange: (departmentKey: string) => void
  queues: GameDepartmentQueueView[]
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {queues.map((queue) => (
        <button
          aria-pressed={activeDepartmentKey === queue.departmentKey}
          className={cn(
            "h-7 rounded-md border border-border px-2 text-[11px] text-muted-foreground transition-colors",
            activeDepartmentKey === queue.departmentKey &&
              "border-primary/50 bg-primary/10 text-foreground",
          )}
          key={queue.departmentKey}
          onClick={() => onChange(queue.departmentKey)}
          type="button"
        >
          {queue.label}
        </button>
      ))}
    </div>
  )
}

function DepartmentQueue({
  canInvest,
  queue,
}: {
  canInvest: boolean
  queue: GameDepartmentQueueView
}) {
  const { isShiftPlaybackActive, openPanel } = useGameUiStore()
  const [items, setItems] = useState<ProductionQueueItem[]>(queue.items)
  const [message, setMessage] = useState<string | null>(null)
  const [isPriorityPending, startPriorityTransition] = useTransition()
  const plannedQuantityByItemId = useMemo(
    () =>
      buildDepartmentPlannedQuantities({
        lines: queue.planningLines,
        queue: items.map((item) => ({
          availableQuantity: item.queueRemainingQuantity,
          departmentId: item.departmentId,
          id: item.routeProgressId,
          remainingQuantity: item.remainingQuantity,
          setupPoints: item.setupPoints,
          workloadPointsPerUnit: item.workloadPointsPerUnit,
        })),
      }),
    [items, queue.planningLines],
  )
  const plannedTotalQuantity = Array.from(
    plannedQuantityByItemId.values(),
  ).reduce((total, quantity) => total + quantity, 0)

  function handleValueChange(nextItems: ProductionQueueItem[]) {
    if (isShiftPlaybackActive) return

    const previousItems = items
    setItems(nextItems)
    setMessage("İş yükü önceliği kaydediliyor...")

    startPriorityTransition(async () => {
      const result = await updateDepartmentWorkloadPriorityAction(
        queue.departmentKey,
        nextItems.map((item) => item.routeProgressId),
      )

      if (!result.ok) {
        setItems(previousItems)
        setMessage(result.message)
        return
      }

      setMessage(`${queue.label} iş yükü önceliği kaydedildi.`)
    })
  }

  return (
    <>
      <DepartmentQueueHeader
        canInvest={canInvest}
        isPlaybackActive={isShiftPlaybackActive}
        isPending={isPriorityPending}
        message={message}
        onInvest={() =>
          openPanel("investment", { departmentId: queue.departmentId })
        }
        plannedTotalQuantity={plannedTotalQuantity}
        queue={queue}
      />

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-card/55">
        {items.length === 0 &&
        queue.outsourceCandidates.length === 0 &&
        queue.outsourceJobs.length === 0 ? (
          <DepartmentEmptyState queue={queue} />
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-3 p-2">
              {items.length > 0 ? (
                <section>
                  <QueueSectionTitle count={items.length} label="İç Hat Kuyruğu" />
                  <QueueHeader completedColumnLabel={queue.completedColumnLabel} />
                  <Sortable
                    className="mt-1.5 space-y-1.5"
                    disabled={isShiftPlaybackActive || isPriorityPending}
                    getItemValue={getQueueItemId}
                    onValueChange={handleValueChange}
                    strategy="vertical"
                    value={items}
                  >
                    {items.map((item, index) => (
                      <SortableItem
                        disabled={isShiftPlaybackActive || isPriorityPending}
                        key={item.id}
                        value={item.id}
                      >
                        <DepartmentQueueCard
                          completedColumnLabel={queue.completedColumnLabel}
                          disabled={isShiftPlaybackActive || isPriorityPending}
                          index={index}
                          item={item}
                          onMessage={setMessage}
                          plannedQuantity={
                            plannedQuantityByItemId.get(item.routeProgressId) ?? 0
                          }
                        />
                      </SortableItem>
                    ))}
                  </Sortable>
                </section>
              ) : null}

              {queue.outsourceCandidates.length > 0 ? (
                <OutsourceCandidates
                  disabled={isShiftPlaybackActive}
                  items={queue.outsourceCandidates}
                  onMessage={setMessage}
                />
              ) : null}

              {queue.outsourceJobs.length > 0 ? (
                <OutsourceJobs jobs={queue.outsourceJobs} />
              ) : null}
            </div>
          </ScrollArea>
        )}
      </div>
    </>
  )
}

function DepartmentQueueHeader({
  canInvest,
  isPlaybackActive,
  isPending,
  message,
  onInvest,
  plannedTotalQuantity,
  queue,
}: {
  canInvest: boolean
  isPlaybackActive: boolean
  isPending: boolean
  message: string | null
  onInvest: () => void
  plannedTotalQuantity: number
  queue: GameDepartmentQueueView
}) {
  return (
    <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md border border-primary/25 bg-primary/10 text-primary">
            {renderDepartmentIcon(queue.departmentKey, 15)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">
              {queue.label} Kuyruğu
            </h2>
            <p className="truncate text-[11px] text-muted-foreground">
              {queue.currentDay}. gün vardiya öncesi öncelik
            </p>
          </div>
          <Badge
            className="h-5 rounded-md px-2 text-[10px]"
            variant="secondary"
          >
            {queue.summary.queueCount} iş
          </Badge>
          {canInvest ? (
            <Button
              className="h-7 gap-1.5 px-2.5 text-[11px]"
              disabled={isPlaybackActive}
              onClick={onInvest}
              size="sm"
              type="button"
              variant="default"
            >
              <Plus size={14} />
              Yatırım Yap
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5 xl:min-w-[520px]">
        <SummaryPill
          highlight
          label="Bugün Planlanan"
          value={`${formatNumber(plannedTotalQuantity)} adet`}
        />
        <SummaryPill label="Kuyruğa Giren" value={queue.summary.totalInputReadyQuantityLabel} />
        <SummaryPill label={queue.completedColumnLabel} value={queue.summary.totalCompletedQuantityLabel} />
        <SummaryPill label="Kalan" value={queue.summary.totalRemainingQuantityLabel} />
        <SummaryPill label="Puan/gün" value={queue.summary.dailyCapacityLabel} />
      </div>

      <div className="xl:col-span-2">
        <p
          className={cn(
            "h-4 truncate text-[11px] text-muted-foreground",
            isPending && "text-primary",
          )}
        >
          {message ?? `En yakın termin: ${queue.summary.nextDeliveryLabel} · İlk iş: ${queue.summary.firstStartLabel}`}
        </p>
      </div>
    </div>
  )
}

function SummaryPill({
  highlight = false,
  label,
  value,
}: {
  highlight?: boolean
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-card/40 px-2 py-1">
      <span
        className={cn(
          "block truncate text-[10px] text-muted-foreground",
          highlight && "text-primary",
        )}
      >
        {label}
      </span>
      <strong
        className={cn(
          "block truncate text-[11px] text-foreground",
          highlight && "text-primary",
        )}
      >
        {value}
      </strong>
    </div>
  )
}

function QueueSectionTitle({ count, label }: { count: number; label: string }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
      <h3 className="text-[11px] font-semibold uppercase text-muted-foreground">
        {label}
      </h3>
      <Badge className="h-5 rounded-md px-1.5 text-[10px]" variant="outline">
        {count}
      </Badge>
    </div>
  )
}

function OutsourceCandidates({
  disabled,
  items,
  onMessage,
}: {
  disabled: boolean
  items: ProductionQueueItem[]
  onMessage: (message: string | null) => void
}) {
  return (
    <section>
      <QueueSectionTitle count={items.length} label="Fason Teklifi Bekleyen" />
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            className="grid min-h-[64px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-amber-300/35 bg-transparent px-2.5 py-2"
            key={item.routeProgressId}
          >
            <ProductThumb imageUrl={item.productImageUrl} name={item.productName} />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <strong className="truncate text-sm text-foreground">{item.orderNo}</strong>
                <Badge className="h-5 rounded-md px-1.5 text-[10px]" variant="outline">
                  {item.productTier}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {item.productName} · {item.productionNo} · {item.availableQuantityLabel}
              </p>
            </div>
            <OutsourceOfferDialog
              disabled={disabled}
              item={item}
              onMessage={onMessage}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

function OutsourceOfferDialog({
  compact = false,
  disabled,
  item,
  onMessage,
}: {
  compact?: boolean
  disabled: boolean
  item: ProductionQueueItem
  onMessage: (message: string | null) => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [quantityValue, setQuantityValue] = useState(
    String(item.availableQuantity),
  )
  const [isPending, startTransition] = useTransition()
  const parsedQuantity = Number(quantityValue)
  const selectedQuantity =
    Number.isSafeInteger(parsedQuantity) &&
    parsedQuantity > 0 &&
    parsedQuantity <= item.availableQuantity
      ? parsedQuantity
      : 0
  const internalQuantity = item.availableQuantity - selectedQuantity

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (nextOpen) setQuantityValue(String(item.availableQuantity))
  }

  function handleSelect(option: ProductionOutsourceOptionView) {
    if (selectedQuantity <= 0) return

    onMessage(`${option.label} fason teklifi işleniyor...`)
    const requestId = crypto.randomUUID()

    startTransition(async () => {
      const result = await startOutsourceJobAction({
        optionType: option.optionType,
        quantity: selectedQuantity,
        requestId,
        routeProgressId: item.routeProgressId,
      })

      onMessage(result.message)

      if (result.ok) {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button
          className={compact ? "h-6 gap-1 px-1.5 text-[10px]" : undefined}
          disabled={disabled}
          size="sm"
          type="button"
          variant="outline"
        >
          <Send size={compact ? 12 : 14} />
          {compact ? "Fason" : "Teklifler"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[min(620px,calc(100vw-2rem))] gap-3 rounded-lg p-4 sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Fason Üretim Teklifleri</DialogTitle>
          <DialogDescription>
            {item.orderNo} · {item.productName} · {item.availableQuantityLabel}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 rounded-lg border border-border bg-card/45 p-3 sm:grid-cols-[minmax(0,1fr)_160px] sm:items-end">
          <div>
            <label
              className="text-[11px] font-semibold text-foreground"
              htmlFor={`outsource-quantity-${item.routeProgressId}`}
            >
              Fasona ayrılacak miktar
            </label>
            <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
              En fazla {item.availableQuantityLabel}. Kalan miktar iç hat
              kuyruğunda üretime devam eder.
            </p>
          </div>
          <input
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
            disabled={isPending || disabled}
            id={`outsource-quantity-${item.routeProgressId}`}
            inputMode="numeric"
            max={item.availableQuantity}
            min={1}
            onChange={(event) => setQuantityValue(event.target.value)}
            step={1}
            type="number"
            value={quantityValue}
          />
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <Badge variant="outline">
            Fason: {formatNumber(selectedQuantity)} adet
          </Badge>
          <Badge variant="outline">
            İç hatta kalır: {formatNumber(Math.max(0, internalQuantity))} adet
          </Badge>
          {selectedQuantity <= 0 ? (
            <span className="self-center text-red-200">
              1 ile {formatNumber(item.availableQuantity)} arasında adet girin.
            </span>
          ) : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {item.outsourceOptions.map((option) => (
            <Button
              className={cn(
                "h-auto min-h-[132px] items-stretch justify-start whitespace-normal rounded-lg border p-3 text-left",
                option.tone === "warning" && "border-amber-300/45 bg-amber-400/10",
                option.tone === "info" && "border-cyan-300/35 bg-cyan-400/10",
                option.tone === "success" && "border-emerald-300/35 bg-emerald-400/10",
              )}
              disabled={isPending || disabled || selectedQuantity <= 0}
              key={option.id}
              onClick={() => handleSelect(option)}
              type="button"
              variant="outline"
            >
              <span className="flex w-full flex-col gap-1">
                <span className="flex items-center justify-between gap-2">
                  <strong className="text-xs">{option.label}</strong>
                  <span className="text-[10px] text-muted-foreground">
                    {option.leadTimeLabel}
                  </span>
                </span>
                <span className="text-[10px] leading-4 text-muted-foreground">
                  {option.description}
                </span>
                <span className="mt-1 text-xs font-semibold tabular-nums text-foreground">
                  {formatMoney(
                    BigInt(option.costPerUnitCents) * BigInt(selectedQuantity),
                    option.currencyCode,
                  )}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {option.costPerUnitLabel}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Dönüş: {option.returnDayLabel}
                </span>
              </span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function OutsourceJobs({ jobs }: { jobs: ProductionOutsourceJobView[] }) {
  return (
    <section>
      <QueueSectionTitle count={jobs.length} label="Fasonda" />
      <div className="space-y-1.5">
        {jobs.map((job) => (
          <div
            className="grid min-h-[64px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-cyan-300/25 bg-transparent px-2.5 py-2"
            key={job.id}
          >
            <ProductThumb imageUrl={job.productImageUrl} name={job.productName} />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <strong className="truncate text-sm text-foreground">{job.orderNo}</strong>
                <Badge className="h-5 rounded-md px-1.5 text-[10px]" variant="outline">
                  {job.optionLabel}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {job.productName} · {job.productionNo} · {job.quantityLabel} · {job.totalCostLabel}
              </p>
            </div>
            <div className="min-w-[126px] text-right">
              <QueuePill label={job.remainingDaysLabel} tone={job.tone} />
              <p className="mt-1 text-[10px] text-muted-foreground">
                <Clock3 className="mr-1 inline size-3" />
                {job.readyDay}. gün
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function QueueHeader({
  completedColumnLabel,
}: {
  completedColumnLabel: string
}) {
  return (
    <div
      className={cn(
        "hidden grid-cols-[30px_42px_minmax(150px,1fr)_78px_94px_84px_84px_112px_98px] items-center gap-2 px-2.5 pb-1 text-[10px] font-semibold uppercase text-muted-foreground lg:grid",
      )}
    >
      <span>Sıra</span>
      <span className="col-span-2">Ürün / Sipariş</span>
      <span className="text-primary">Planlanan</span>
      <span>Kuyruğa Giren</span>
      <span>{completedColumnLabel}</span>
      <span>Kalan</span>
      <span>Başlama</span>
      <span>Termin</span>
    </div>
  )
}

function DepartmentQueueCard({
  completedColumnLabel,
  disabled,
  index,
  item,
  onMessage,
  plannedQuantity,
}: {
  completedColumnLabel: string
  disabled: boolean
  index: number
  item: ProductionQueueItem
  onMessage: (message: string | null) => void
  plannedQuantity: number
}) {
  return (
    <Card
      className={cn(
        "rounded-lg border bg-transparent py-0 shadow-none transition-colors data-[dragging]:border-primary/70 data-[dragging]:bg-primary/10",
        "border-border hover:border-primary/40",
        item.deliveryTone === "danger" && "border-red-300/35",
        item.deliveryTone === "warning" && "border-amber-300/35",
      )}
    >
      <CardContent
        className={cn(
          "grid min-h-[66px] gap-2 px-2.5 py-2",
          "lg:grid-cols-[30px_42px_minmax(150px,1fr)_78px_94px_84px_84px_112px_98px] lg:items-center",
        )}
      >
        <div className="flex items-center gap-1 lg:block">
          <SortableItemHandle
            className={cn(
              "size-7 text-muted-foreground hover:bg-muted hover:text-primary",
              styles.dragHandleHint,
            )}
          >
            <GripVertical className={styles.dragHandleIcon} size={15} />
          </SortableItemHandle>
          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground lg:mt-1 lg:block lg:text-center">
            {index + 1}
          </span>
        </div>

        <ProductThumb imageUrl={item.productImageUrl} name={item.productName} />

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {item.orderNo}
            </h3>
            <Badge
              className="h-5 shrink-0 rounded-md px-1.5 text-[10px]"
              variant="outline"
            >
              {item.productTier}
            </Badge>
            <Badge
              className="h-5 shrink-0 rounded-md border-emerald-300/30 px-1.5 text-[10px] text-emerald-100"
              variant="outline"
            >
              İç Hat
            </Badge>
            {item.outsourceOptions.length > 0 ? (
              <OutsourceOfferDialog
                compact
                disabled={disabled}
                item={item}
                onMessage={onMessage}
              />
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {item.productName} · {item.productCode}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            Sipariş: {item.orderQuantityLabel} · {item.productionNo}
          </p>
        </div>

        <CompactMetric
          highlight
          label="Planlanan"
          value={`${formatNumber(plannedQuantity)} adet`}
        />
        <CompactMetric label="Kuyruğa Giren" value={item.inputReadyQuantityLabel} />
        <CompactMetric label={`${completedColumnLabel} adet`} value={item.completedQuantityLabel} />
        <CompactMetric
          label="Kalan adet"
          tone={item.deliveryTone}
          value={item.queueRemainingQuantityLabel}
        />
        <QueuePill label={item.queueStartLabel} tone={item.queueStartTone} />
        <div className="min-w-0">
          <QueuePill label={item.deliveryLabel} tone={item.deliveryTone} />
          <p className="mt-1 hidden truncate text-[10px] text-muted-foreground xl:block">
            {item.manualPriorityOverride ? "Manuel sıra" : item.statusLabel}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function getQueueItemId(item: ProductionQueueItem) {
  return item.id
}

function CompactMetric({
  highlight = false,
  label,
  tone,
  value,
}: {
  highlight?: boolean
  label: string
  tone?: ProductionQueueItem["deliveryTone"]
  value: string
}) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-card/35 px-2 py-1 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
      <span className="block truncate text-[10px] text-muted-foreground lg:hidden">
        {label}
      </span>
      <strong
        className={cn(
          "block truncate text-xs font-semibold tabular-nums text-foreground",
          highlight && "text-primary",
          tone === "danger" && "text-red-200",
          tone === "warning" && "text-amber-100",
        )}
      >
        {value}
      </strong>
    </div>
  )
}

function QueuePill({
  label,
  tone,
}: {
  label: string
  tone: ProductionQueueItem["deliveryTone"]
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center rounded-md border px-2 text-[11px] font-semibold",
        tone === "danger" &&
          "border-red-300/50 bg-red-500/15 text-red-200",
        tone === "warning" &&
          "border-amber-300/45 bg-amber-400/15 text-amber-200",
        tone === "info" &&
          "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
        tone === "success" &&
          "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
      )}
    >
      <span className="truncate">{label}</span>
    </span>
  )
}

function ProductThumb({
  imageUrl,
  name,
}: {
  imageUrl: string | null
  name: string
}) {
  return (
    <div className="relative size-11 overflow-hidden rounded-md border border-border bg-card/70">
      {imageUrl ? (
        <Image
          alt={name}
          className="object-contain p-1"
          fill
          sizes="44px"
          src={imageUrl}
        />
      ) : (
        <span className="grid size-full place-items-center text-primary">
          <PackageOpen size={18} />
        </span>
      )}
    </div>
  )
}

function DepartmentEmptyState({ queue }: { queue: GameDepartmentQueueView }) {
  return (
    <div className="grid h-full min-h-[320px] place-items-center p-6 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-11 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          {renderDepartmentIcon(queue.departmentKey, 22)}
        </span>
        <h2 className="mt-3 text-base font-semibold text-foreground">
          {queue.label} kuyruğu boş
        </h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Hazır iş geldiğinde üretim önceliği burada sürüklenebilir liste olarak açılır.
        </p>
      </div>
    </div>
  )
}

function renderDepartmentIcon(departmentKey: string, size: number) {
  if (departmentKey === "cutting") return <Scissors size={size} />
  if (departmentKey === "dyeing") return <Droplet size={size} />
  if (departmentKey === "embroidery") return <Sparkles size={size} />
  if (departmentKey === "ironing_packing") return <PackageCheck size={size} />
  if (departmentKey === "printing") return <Printer size={size} />
  if (departmentKey === "sewing") return <Shirt size={size} />
  if (departmentKey === "washing") return <Waves size={size} />

  return <Factory size={size} />
}

function getQueueRevision(queue: GameDepartmentQueueView) {
  return [
    queue.departmentKey,
    queue.items
      .map(
        (item) =>
          `${item.id}:${item.queuePriority}:${item.inputReadyQuantity}:${item.completedQuantity}:${item.queueRemainingQuantity}`,
      )
      .join(","),
    queue.planningLines
      .map((line) => `${line.id}:${line.effectivePointCapacity}`)
      .join(","),
    queue.outsourceCandidates
      .map((item) => `${item.id}:${item.availableQuantity}`)
      .join(","),
    queue.outsourceJobs.map((job) => `${job.id}:${job.status}`).join(","),
  ].join("|")
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMoney(
  valueCents: bigint,
  currencyCode: ProductionOutsourceOptionView["currencyCode"],
) {
  return new Intl.NumberFormat("tr-TR", {
    currency: currencyCode,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Number(valueCents) / 100)
}
