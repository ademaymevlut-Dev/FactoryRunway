"use client";

import { CalendarDays, GripVertical, PackageOpen } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from "@/components/ui/sortable";
import { useGameUiStore } from "@/features/game/store/game-ui-store";

import { updateOrderPriorityAction } from "../actions/update-order-priority-action";
import type { ActiveOrderPriorityView } from "../types";

export function OrderPriorityList({
  activeOrders,
}: {
  activeOrders: ActiveOrderPriorityView[];
}) {
  const { isShiftPlaybackActive } = useGameUiStore();
  const [items, setItems] = useState(activeOrders);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const saveQueueRef = useRef(Promise.resolve());

  function handleValueChange(nextItems: ActiveOrderPriorityView[]) {
    if (isShiftPlaybackActive) return;

    const previousItems = items;
    setItems(nextItems);
    setMessage("Öncelik sırası kaydediliyor…");

    startTransition(async () => {
      const save = saveQueueRef.current.then(() =>
        updateOrderPriorityAction(nextItems.map((item) => item.id)),
      );
      saveQueueRef.current = save.then(() => undefined);
      const result = await save;

      if (!result.ok) {
        setItems(previousItems);
        setMessage(result.message);
        return;
      }

      setMessage("Sipariş önceliği kaydedildi.");
    });
  }

  if (items.length === 0) {
    return (
      <div className="grid min-h-[360px] place-items-center rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
        <div>
          <PackageOpen className="mx-auto text-muted-foreground" size={32} />
          <h3 className="mt-3 font-semibold text-foreground">
            Önceliklendirilecek aktif sipariş yok
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Kabul edilen siparişler burada tek bir üretim sırası halinde görünür.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card/70 p-3">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Otomatik üretim sırası
          </p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">
            Sipariş Önceliği
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Yalnızca sırayı belirleyin. Vardiya başladığında uygun WIP bütün
            aktif hatlara otomatik dağıtılır.
          </p>
        </div>
        <Badge variant={isShiftPlaybackActive ? "destructive" : "secondary"}>
          {isShiftPlaybackActive ? "Vardiya kilitli" : `${items.length} sipariş`}
        </Badge>
      </header>

      <p aria-live="polite" className="min-h-7 py-2 text-xs text-muted-foreground">
        {isPending ? "Kaydediliyor…" : message}
      </p>

      <div className="min-h-0 flex-1 touch-pan-y overscroll-contain overflow-y-auto pr-1">
        <Sortable
          className="space-y-2"
          disabled={isShiftPlaybackActive || isPending}
          getItemValue={getOrderId}
          onValueChange={handleValueChange}
          strategy="vertical"
          value={items}
        >
          {items.map((item, index) => (
            <SortableItem
              disabled={isShiftPlaybackActive || isPending}
              key={item.id}
              value={item.id}
            >
              <article className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-background/55 p-3">
                <span className="font-mono text-lg font-semibold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <SortableItemHandle className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <GripVertical size={17} />
                </SortableItemHandle>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="font-mono text-sm text-foreground">
                      {item.orderNo}
                    </strong>
                    <span className="truncate text-sm text-muted-foreground">
                      {item.customerName}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-foreground">
                    {item.productName}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <span className="flex items-center justify-end gap-1">
                    <CalendarDays size={13} /> Gün {item.targetDeliveryDay}
                  </span>
                  <strong className="mt-1 block font-mono text-sm text-foreground">
                    {formatNumber(item.remainingQuantity)} kalan
                  </strong>
                </div>
              </article>
            </SortableItem>
          ))}
        </Sortable>
      </div>
    </section>
  );
}

function getOrderId(order: ActiveOrderPriorityView) {
  return order.id;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}
