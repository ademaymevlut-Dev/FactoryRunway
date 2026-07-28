"use client"

import {
  Clock3,
  Droplet,
  Factory,
  GripVertical,
  PackageCheck,
  PackageOpen,
  Plus,
  Printer,
  Scissors,
  Send,
  Shirt,
  Sparkles,
  Waves,
} from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProductionQueueRow } from "@/components/game-presentation/production-queue-row"
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
import {
  DEFAULT_LOCALE,
  numberLocale as resolveNumberLocale,
  localeUpper,
  type NumberLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales"
import { cn } from "@/lib/utils"

import {
  productionQueueCopy,
  type ProductionQueueCopy,
} from "../production-queue-copy"
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

type QueueUiContextValue = {
  copy: ProductionQueueCopy["ui"]
  locale: SupportedLocale
  numberLocale: NumberLocale
}

const QueueUiContext = createContext<QueueUiContextValue>({
  copy: productionQueueCopy[DEFAULT_LOCALE].ui,
  locale: DEFAULT_LOCALE,
  numberLocale: resolveNumberLocale(DEFAULT_LOCALE),
})

function useQueueUi() {
  return useContext(QueueUiContext)
}

export function DepartmentQueuePanel({
  departmentKeys,
  investmentDepartmentIds,
  locale,
  queues,
}: {
  departmentKeys: string[]
  investmentDepartmentIds: string[]
  locale: SupportedLocale
  queues: GameProductionQueuesView
}) {
  const uiContext = useMemo<QueueUiContextValue>(
    () => ({
      copy: productionQueueCopy[locale].ui,
      locale,
      numberLocale: resolveNumberLocale(locale),
    }),
    [locale],
  )
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
      <QueueUiContext.Provider value={uiContext}>
        <div className="grid min-h-[320px] place-items-center text-center text-xs text-muted-foreground">
          {uiContext.copy.empty.noQueue}
        </div>
      </QueueUiContext.Provider>
    )
  }

  return (
    <QueueUiContext.Provider value={uiContext}>
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
    </QueueUiContext.Provider>
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
  const { copy, numberLocale } = useQueueUi()
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
    setMessage(copy.header.saving)

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

      setMessage(copy.header.messageSaved(queue.label))
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
                  <QueueSectionTitle
                    count={items.length}
                    label={copy.sections.internalQueue}
                  />
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
                          numberLocale={numberLocale}
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
  const { copy, numberLocale } = useQueueUi()

  return (
    <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md border border-primary/25 bg-primary/10 text-primary">
            {renderDepartmentIcon(queue.departmentKey, 15)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">
              {copy.header.title(queue.label)}
            </h2>
            <p className="truncate text-[11px] text-muted-foreground">
              {copy.header.dayPriority(queue.currentDay)}
            </p>
          </div>
          <Badge
            className="h-5 rounded-md px-2 text-[10px]"
            variant="secondary"
          >
            {copy.header.workCount(queue.summary.queueCount)}
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
              {copy.header.invest}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5 xl:min-w-[520px]">
        <SummaryPill
          highlight
          label={copy.summary.planned}
          value={formatQuantity(plannedTotalQuantity, numberLocale, copy)}
        />
        <SummaryPill label={copy.summary.inputReady} value={queue.summary.totalInputReadyQuantityLabel} />
        <SummaryPill label={queue.completedColumnLabel} value={queue.summary.totalCompletedQuantityLabel} />
        <SummaryPill label={copy.summary.remaining} value={queue.summary.totalRemainingQuantityLabel} />
        <SummaryPill label={copy.summary.dailyPoints} value={queue.summary.dailyCapacityLabel} />
      </div>

      <div className="xl:col-span-2">
        <p
          className={cn(
            "h-4 truncate text-[11px] text-muted-foreground",
            isPending && "text-primary",
          )}
        >
          {message ??
            copy.header.summary(
              queue.summary.nextDeliveryLabel,
              queue.summary.firstStartLabel,
            )}
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
  const { locale } = useQueueUi()

  return (
    <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
      <h3 className="text-[11px] font-semibold text-muted-foreground">
        {localeUpper(label, locale)}
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
  const { copy } = useQueueUi()

  return (
    <section>
      <QueueSectionTitle
        count={items.length}
        label={copy.sections.outsourceCandidates}
      />
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            className="grid min-h-[64px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-amber-300/35 bg-transparent px-2.5 py-2"
            key={item.routeProgressId}
          >
            <QueueProductThumb imageUrl={item.productImageUrl} name={item.productName} />
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
  const { copy, numberLocale } = useQueueUi()
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

    onMessage(copy.outsource.processing(option.label))
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
          {compact ? copy.outsource.compactButton : copy.outsource.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[min(620px,calc(100vw-2rem))] gap-3 rounded-lg p-4 sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{copy.outsource.dialogTitle}</DialogTitle>
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
              {copy.outsource.quantityLabel}
            </label>
            <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
              {copy.outsource.quantityHelp(item.availableQuantityLabel)}
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
            {copy.outsource.selectedQuantity(
              formatNumber(selectedQuantity, numberLocale),
            )}
          </Badge>
          <Badge variant="outline">
            {copy.outsource.internalRemaining(
              formatNumber(Math.max(0, internalQuantity), numberLocale),
            )}
          </Badge>
          {selectedQuantity <= 0 ? (
            <span className="self-center text-red-200">
              {copy.outsource.invalidQuantity(
                formatNumber(item.availableQuantity, numberLocale),
              )}
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
                    numberLocale,
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
  const { copy } = useQueueUi()

  return (
    <section>
      <QueueSectionTitle count={jobs.length} label={copy.sections.outsourceJobs} />
      <div className="space-y-1.5">
        {jobs.map((job) => (
          <div
            className="grid min-h-[64px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-cyan-300/25 bg-transparent px-2.5 py-2"
            key={job.id}
          >
            <QueueProductThumb imageUrl={job.productImageUrl} name={job.productName} />
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
                {copy.readyDay(job.readyDay)}
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
  const { copy, locale } = useQueueUi()

  return (
    <div
      className={cn(
        "hidden grid-cols-[30px_42px_minmax(150px,1fr)_78px_94px_84px_84px_112px_98px] items-center gap-2 px-2.5 pb-1 text-[10px] font-semibold text-muted-foreground lg:grid",
      )}
    >
      <span>{localeUpper(copy.table.priority, locale)}</span>
      <span className="col-span-2">
        {localeUpper(copy.table.productOrder, locale)}
      </span>
      <span className="text-primary">
        {localeUpper(copy.table.planned, locale)}
      </span>
      <span>{localeUpper(copy.table.inputReady, locale)}</span>
      <span>{localeUpper(completedColumnLabel, locale)}</span>
      <span>{localeUpper(copy.table.remaining, locale)}</span>
      <span>{localeUpper(copy.table.queueStart, locale)}</span>
      <span>{localeUpper(copy.table.due, locale)}</span>
    </div>
  )
}

function DepartmentQueueCard({
  completedColumnLabel,
  disabled,
  index,
  item,
  onMessage,
  numberLocale,
  plannedQuantity,
}: {
  completedColumnLabel: string
  disabled: boolean
  index: number
  item: ProductionQueueItem
  numberLocale: NumberLocale
  onMessage: (message: string | null) => void
  plannedQuantity: number
}) {
  const { copy } = useQueueUi()
  const rowItem = {
    completedQuantityLabel: item.completedQuantityLabel,
    dueLabel: item.deliveryLabel,
    dueTone: item.deliveryTone,
    footerStatusLabel: item.manualPriorityOverride
      ? copy.row.manualPriority
      : item.statusLabel,
    inputReadyQuantityLabel: item.inputReadyQuantityLabel,
    modeLabel: copy.row.internalMode,
    orderNo: item.orderNo,
    orderSummaryLabel: copy.row.orderSummary(
      item.orderQuantityLabel,
      item.productionNo,
    ),
    plannedProductionLabel: formatQuantity(plannedQuantity, numberLocale, copy),
    productCode: item.productCode,
    productImageUrl: item.productImageUrl,
    productName: item.productName,
    productTierLabel: item.productTier,
    queueStartLabel: item.queueStartLabel,
    queueStartTone: item.queueStartTone,
    remainingQuantityLabel: item.queueRemainingQuantityLabel,
  }
  const labels = {
    completed: copy.summary.completedSuffix(completedColumnLabel),
    inputReady: copy.summary.inputReady,
    planned: copy.summary.plannedShort,
    remaining: copy.summary.remainingQuantity,
  }

  return (
    <ProductionQueueRow
      action={
        item.outsourceOptions.length > 0 ? (
          <OutsourceOfferDialog
            compact
            disabled={disabled}
            item={item}
            onMessage={onMessage}
          />
        ) : null
      }
      dragHandle={
        <SortableItemHandle
          className={cn(
            "size-7 text-muted-foreground hover:bg-muted hover:text-primary",
            styles.dragHandleHint,
          )}
        >
          <GripVertical className={styles.dragHandleIcon} size={15} />
        </SortableItemHandle>
      }
      item={rowItem}
      labels={labels}
      priorityLabel={String(index + 1)}
    />
  )
}

function getQueueItemId(item: ProductionQueueItem) {
  return item.id
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

function QueueProductThumb({
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
          <PackageOpen aria-hidden="true" size={18} />
        </span>
      )}
    </div>
  )
}

function DepartmentEmptyState({ queue }: { queue: GameDepartmentQueueView }) {
  const { copy } = useQueueUi()
  const upstreamWaitCopy = queue.upstreamWait.kind
    ? copy.empty.upstreamWait[queue.upstreamWait.kind]
    : null

  return (
    <div className="grid h-full min-h-[320px] place-items-center p-6 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-11 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          {renderDepartmentIcon(queue.departmentKey, 22)}
        </span>
        <h2 className="mt-3 text-base font-semibold text-foreground">
          {upstreamWaitCopy?.title ?? copy.empty.title(queue.label)}
        </h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {upstreamWaitCopy?.body(queue.label) ?? copy.empty.body}
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
    `${queue.upstreamWait.kind ?? "none"}:${queue.upstreamWait.count}`,
  ].join("|")
}

function formatQuantity(
  value: number,
  numberLocale: NumberLocale,
  copy: ProductionQueueCopy["ui"],
) {
  return copy.summary.quantity(formatNumber(value, numberLocale))
}

function formatNumber(value: number, numberLocale: NumberLocale) {
  return new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMoney(
  valueCents: bigint,
  currencyCode: ProductionOutsourceOptionView["currencyCode"],
  numberLocale: NumberLocale,
) {
  return new Intl.NumberFormat(numberLocale, {
    currency: currencyCode,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Number(valueCents) / 100)
}
