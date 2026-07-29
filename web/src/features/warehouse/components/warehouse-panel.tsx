"use client";

import {
  PackageOpen,
  Truck,
  Warehouse,
} from "lucide-react";
import Image from "next/image";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import type {
  GameWarehouseView,
  WarehouseProductDepotItem,
} from "../types";

export function WarehousePanel({ warehouse }: { warehouse: GameWarehouseView }) {
  const items = warehouse.product.items;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card/75">
      <div className="shrink-0 border-b border-border bg-background/45 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary shadow-[0_0_22px_hsl(var(--primary)/0.18)]">
              <Truck size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                Sevkiyat Deposu
              </p>
              <h2 className="mt-1 truncate text-xl font-semibold text-foreground">
                Teslime Hazır Ürünler
              </h2>
            </div>
          </div>
          <div className="grid min-w-[210px] grid-cols-2 gap-2">
            <SummaryMetric
              label="Hazır Adet"
              value={warehouse.summary.productReadyQuantityLabel}
            />
            <SummaryMetric
              label="Sıradaki Teslim"
              value={warehouse.summary.nextDeliveryLabel}
            />
          </div>
        </div>
      </div>

      <WarehouseContent
        emptyBody="Ütü/paket sonrası sevkiyat deposunda bekleyen ürün bulunmuyor."
        emptyTitle="Sevkiyat deposu boş"
        items={items}
      />
    </section>
  );
}

function WarehouseContent({
  emptyBody,
  emptyTitle,
  items,
}: {
  emptyBody: string;
  emptyTitle: string;
  items: WarehouseProductDepotItem[];
}) {
  if (items.length === 0) {
    return (
      <div className="min-h-0 flex-1">
        <WarehouseEmptyState body={emptyBody} title={emptyTitle} />
      </div>
    );
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="p-3">
        <div className="hidden grid-cols-[minmax(190px,1.3fr)_0.8fr_0.75fr_0.75fr_0.75fr_0.8fr] gap-2 border-b border-border px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:grid">
          <span>Sipariş</span>
          <span>Müşteri</span>
          <span>Depodaki</span>
          <span>Sipariş Adedi</span>
          <span>Ütü/Paket</span>
          <span>Teslim</span>
        </div>
        <div className="space-y-1.5 pt-2">
          {items.map((item) => (
            <ProductDepotRow item={item} key={item.id} />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

function ProductDepotRow({ item }: { item: WarehouseProductDepotItem }) {
  return (
    <article
      className={cn(
        "grid gap-3 rounded-lg border bg-background/55 p-2.5 transition-colors lg:grid-cols-[minmax(190px,1.3fr)_0.8fr_0.75fr_0.75fr_0.75fr_0.8fr] lg:items-center",
        "hover:border-primary/35 hover:bg-secondary/40",
        item.tone === "danger" && "border-red-300/40",
        item.tone === "warning" && "border-amber-300/40",
        item.tone === "success" && "border-emerald-300/25",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <ProductThumb imageUrl={item.productImageUrl} name={item.productName} />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {item.orderNo}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {item.productName}
          </p>
        </div>
      </div>
      <TableValue label="Müşteri" value={item.customerName} />
      <TableValue
        emphasis
        label="Depodaki"
        value={item.quantityInDepotLabel}
      />
      <TableValue label="Sipariş Adedi" value={item.plannedQuantityLabel} />
      <TableValue label="Ütü/Paket" value={item.finishedLabel} />
      <div className="flex min-w-0 items-center justify-between gap-2 lg:justify-start">
        <span className="text-[11px] font-medium text-muted-foreground lg:hidden">
          Teslim
        </span>
        <WarningTimeBadge label={item.deliveryLabel} tone={item.tone} />
      </div>
    </article>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card/65 px-3 py-2">
      <span className="block truncate text-[11px] text-muted-foreground">
        {label}
      </span>
      <strong className="mt-0.5 block truncate text-xs text-foreground">
        {value}
      </strong>
    </div>
  );
}

function TableValue({
  emphasis = false,
  label,
  value,
}: {
  emphasis?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 lg:block">
      <span className="text-[11px] font-medium text-muted-foreground lg:hidden">
        {label}
      </span>
      <span
        className={cn(
          "truncate text-xs text-foreground/85 lg:block",
          emphasis && "font-semibold text-primary",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ProductThumb({
  imageUrl,
  name,
}: {
  imageUrl: string | null;
  name: string;
}) {
  return (
    <div className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-border bg-card/70">
      {imageUrl ? (
        <Image
          alt={name}
          className="object-contain p-1.5"
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
  );
}

function WarningTimeBadge({
  label,
  tone = "warning",
}: {
  label: string;
  tone?: "danger" | "success" | "warning" | "info";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-md border px-2.5 text-xs font-bold shadow-lg",
        "border-emerald-300/55 bg-emerald-400/15 text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.22)]",
        tone === "warning" &&
          "border-amber-200/65 bg-amber-400 text-amber-950 shadow-[0_0_18px_rgba(251,191,36,0.42)]",
        tone === "danger" &&
          "border-red-200/70 bg-red-500 text-white shadow-[0_0_18px_rgba(239,68,68,0.42)]",
      )}
    >
      {label}
    </span>
  );
}

function WarehouseEmptyState({
  body,
  title,
}: {
  body: string;
  title: string;
}) {
  return (
    <div className="grid h-full min-h-[320px] place-items-center p-8 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          <Warehouse size={24} />
        </span>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
