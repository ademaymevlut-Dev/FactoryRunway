//web/src/components/ui/sortable.tsx

"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import {
  arrayMove,
  horizontalListSortingStrategy,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  type SortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

type SortableStrategy = "grid" | "horizontal" | "vertical"

type SortableProps<TItem> = Omit<React.ComponentProps<"div">, "value" | "onChange"> & {
  disabled?: boolean
  getItemValue: (item: TItem) => UniqueIdentifier
  onValueChange: (items: TItem[]) => void
  strategy?: SortableStrategy
  value: TItem[]
}

type SortableItemContextValue = {
  attributes: ReturnType<typeof useSortable>["attributes"]
  disabled: boolean
  listeners: ReturnType<typeof useSortable>["listeners"]
  setActivatorNodeRef: ReturnType<typeof useSortable>["setActivatorNodeRef"]
}

const SortableItemContext = React.createContext<SortableItemContextValue | null>(null)

function Sortable<TItem>({
  children,
  className,
  disabled = false,
  getItemValue,
  onValueChange,
  strategy = "vertical",
  value,
  ...props
}: SortableProps<TItem>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const items = React.useMemo(
    () => value.map((item) => getItemValue(item)),
    [getItemValue, value],
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = items.indexOf(active.id)
    const newIndex = items.indexOf(over.id)

    if (oldIndex < 0 || newIndex < 0) {
      return
    }

    onValueChange(arrayMove(value, oldIndex, newIndex))
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <SortableContext
        disabled={disabled}
        items={items}
        strategy={getSortingStrategy(strategy)}
      >
        <div className={className} data-slot="sortable" {...props}>
          {children}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableItem({
  asChild = false,
  children,
  className,
  disabled = false,
  style,
  value,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean
  disabled?: boolean
  value: UniqueIdentifier
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    disabled,
    id: value,
  })
  const Comp = asChild ? Slot.Root : "div"
  const itemStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...style,
  }

  return (
    <SortableItemContext.Provider
      value={{
        attributes,
        disabled,
        listeners,
        setActivatorNodeRef,
      }}
    >
      <Comp
        data-dragging={isDragging ? "" : undefined}
        data-slot="sortable-item"
        ref={setNodeRef}
        className={cn(
          "touch-manipulation",
          isDragging && "relative z-50 opacity-80",
          className,
        )}
        style={itemStyle}
        {...props}
      >
        {children}
      </Comp>
    </SortableItemContext.Provider>
  )
}

function SortableItemHandle({
  asChild = false,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
}) {
  const context = React.useContext(SortableItemContext)

  if (!context) {
    throw new Error("SortableItemHandle must be used inside SortableItem.")
  }

  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      aria-label="Sıralamayı değiştir"
      data-slot="sortable-item-handle"
      disabled={!asChild ? context.disabled : undefined}
      ref={context.setActivatorNodeRef}
      type={!asChild ? "button" : undefined}
      className={cn(
        "inline-flex shrink-0 cursor-grab items-center justify-center rounded-md outline-none transition-colors active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring/45",
        className,
      )}
      {...context.attributes}
      {...context.listeners}
      {...props}
    />
  )
}

function getSortingStrategy(strategy: SortableStrategy): SortingStrategy {
  if (strategy === "horizontal") return horizontalListSortingStrategy
  if (strategy === "grid") return rectSortingStrategy

  return verticalListSortingStrategy
}

export { Sortable, SortableItem, SortableItemHandle }
