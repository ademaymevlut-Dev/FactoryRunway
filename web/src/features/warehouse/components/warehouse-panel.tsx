"use client";

import {
  Boxes,
  CalendarClock,
  Clock3,
  PackageCheck,
  PackageOpen,
  Shirt,
  Truck,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import type {
  GameWarehouseView,
  WarehouseInboundItem,
  WarehouseProductDepotItem,
  WarehouseTabKey,
} from "../types";

type WarehouseRecord = WarehouseInboundItem | WarehouseProductDepotItem;

const tabIcons = {
  accessory_warehouse: Boxes,
  fabric_warehouse: Shirt,
  product_warehouse: PackageCheck,
} satisfies Record<WarehouseTabKey, typeof Warehouse>;

export function WarehousePanel({ warehouse }: { warehouse: GameWarehouseView }) {
  const [activeTab, setActiveTab] = useState<WarehouseTabKey>("product_warehouse");
  const activeRecords = useMemo(
    () => getTabRecords(warehouse, activeTab),
    [activeTab, warehouse],
  );

  return (
    <Tabs
      className="flex max-h-[calc(100dvh-11rem)] min-h-[420px] flex-col gap-3"
      onValueChange={(value) => setActiveTab(value as WarehouseTabKey)}
      value={activeTab}
    >
      <WarehouseTabs activeTab={activeTab} warehouse={warehouse} />

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-card/70">
        <TabsContent className="h-full min-h-0" value="product_warehouse">
          <WarehouseContent
            emptyBody="Ütü/paket sonrası depoda bekleyen ürün bulunmuyor."
            emptyTitle="Ürün deposu boş"
            items={activeRecords}
            tabKey="product_warehouse"
          />
        </TabsContent>
        <TabsContent className="h-full min-h-0" value="fabric_warehouse">
          <WarehouseContent
            emptyBody="Yolda kumaş bekleyen sipariş bulunmuyor."
            emptyTitle="Kumaş akışı temiz"
            items={activeRecords}
            tabKey="fabric_warehouse"
          />
        </TabsContent>
        <TabsContent className="h-full min-h-0" value="accessory_warehouse">
          <WarehouseContent
            emptyBody="Yolda aksesuar bekleyen sipariş bulunmuyor."
            emptyTitle="Aksesuar akışı temiz"
            items={activeRecords}
            tabKey="accessory_warehouse"
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}

function WarehouseTabs({
  activeTab,
  warehouse,
}: {
  activeTab: WarehouseTabKey;
  warehouse: GameWarehouseView;
}) {
  const tabs = [
    warehouse.product,
    warehouse.fabric,
    warehouse.accessory,
  ];

  return (
    <TabsList
      aria-label="Depo sekmeleri"
      className="grid h-auto w-full grid-cols-3 gap-1 rounded-lg border border-border bg-card/70 p-1"
    >
      {tabs.map((tab) => {
        const Icon = tabIcons[tab.key];
        const isActive = tab.key === activeTab;

        return (
          <TabsTrigger
            className={cn(
              "relative h-11 min-w-0 rounded-md border px-3 text-left transition-all duration-200",
              "border-white/10 bg-background/80 text-muted-foreground hover:border-primary/35 hover:bg-secondary/90 hover:text-foreground",
              "data-active:border-primary/70 data-active:bg-primary data-active:text-primary-foreground",
              "data-[state=active]:border-primary/70 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
              isActive &&
                "border-primary/70 bg-primary text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.32)]",
            )}
            key={tab.key}
            value={tab.key}
          >
            <Icon className={cn("size-4 shrink-0", isActive ? "text-primary-foreground" : "text-primary")} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{tab.label}</span>
            </span>
            <Badge
              className={cn(
                "shrink-0",
                isActive
                  ? "border border-white/25 bg-white/20 text-white"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {tab.items.length}
            </Badge>
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
}

function WarehouseContent({
  emptyBody,
  emptyTitle,
  items,
  tabKey,
}: {
  emptyBody: string;
  emptyTitle: string;
  items: WarehouseRecord[];
  tabKey: WarehouseTabKey;
}) {
  if (items.length === 0) {
    return <WarehouseEmptyState body={emptyBody} title={emptyTitle} />;
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-3">
        {items.map((item) =>
          item.kind === "product" ? (
            <ProductDepotCard item={item} key={item.id} />
          ) : (
            <InboundDepotCard item={item} key={item.id} tabKey={tabKey} />
          ),
        )}
      </div>
    </ScrollArea>
  );
}

function ProductDepotCard({ item }: { item: WarehouseProductDepotItem }) {
  return (
    <article
      className={cn(
        "grid gap-3 rounded-lg border bg-background/60 p-3 transition-colors sm:grid-cols-[72px_minmax(0,1fr)]",
        item.tone === "danger" && "border-red-300/35",
        item.tone === "warning" && "border-amber-300/35",
        item.tone === "success" && "border-emerald-300/25",
      )}
    >
      <ProductThumb imageUrl={item.productImageUrl} name={item.productName} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Sipariş Formu
            </p>
            <h3 className="mt-1 truncate text-base font-semibold text-foreground">
              {item.orderNo}
            </h3>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {item.productName}
            </p>
          </div>
          <WarningTimeBadge label={item.deliveryLabel} tone={item.tone} />
        </div>

        <div className="mt-3 grid gap-1.5 sm:grid-cols-3">
          <InfoCell icon={PackageCheck} label="Depodaki" value={item.quantityInDepotLabel} />
          <InfoCell icon={Boxes} label="Sipariş Adedi" value={item.plannedQuantityLabel} />
          <InfoCell icon={CalendarClock} label="Ütü/Paket" value={item.finishedLabel} />
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          <span className="rounded-md border border-border bg-card/60 px-2 py-1">
            Kod: <strong className="text-foreground/80">{item.productCode}</strong>
          </span>
          <span className="rounded-md border border-border bg-card/60 px-2 py-1">
            Üretim: <strong className="text-foreground/80">{item.productionNo}</strong>
          </span>
          <span className="rounded-md border border-border bg-card/60 px-2 py-1">
            Son çıktı: <strong className="text-foreground/80">{item.lastProducedQuantityLabel}</strong>
          </span>
        </div>
      </div>
    </article>
  );
}

function InboundDepotCard({
  item,
  tabKey,
}: {
  item: WarehouseInboundItem;
  tabKey: WarehouseTabKey;
}) {
  const Icon = tabKey === "fabric_warehouse" ? Shirt : Boxes;

  return (
    <article
      className={cn(
        "grid gap-3 rounded-lg border bg-background/60 p-3 transition-colors sm:grid-cols-[60px_minmax(0,1fr)]",
        item.tone === "warning" ? "border-amber-300/35" : "border-cyan-300/20",
      )}
    >
      <ProductThumb fallbackIcon={Icon} imageUrl={item.productImageUrl} name={item.productName} size="sm" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Sipariş Formu
            </p>
            <h3 className="mt-1 truncate text-base font-semibold text-foreground">
              {item.orderNo}
            </h3>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {item.productName}
            </p>
          </div>
          <WarningTimeBadge label={item.arrivalLabel} tone={item.tone} />
        </div>

        <div className="mt-3 grid gap-1.5 sm:grid-cols-3">
          <InfoCell icon={Truck} label="Geliş" value={item.arrivalLabel} />
          <InfoCell icon={PackageCheck} label="Sipariş Adedi" value={item.quantityLabel} />
          <InfoCell icon={Clock3} label="Teslim" value={item.deliveryLabel} />
        </div>
      </div>
    </article>
  );
}

function ProductThumb({
  fallbackIcon: FallbackIcon = PackageOpen,
  imageUrl,
  name,
  size = "md",
}: {
  fallbackIcon?: LucideIcon;
  imageUrl: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-card/70",
        size === "md" ? "size-[72px]" : "size-[60px]",
      )}
    >
      {imageUrl ? (
        <Image
          alt={name}
          className="object-contain p-1.5"
          fill
          sizes={size === "md" ? "72px" : "60px"}
          src={imageUrl}
        />
      ) : (
        <span className="grid size-full place-items-center text-primary">
          <FallbackIcon size={size === "md" ? 24 : 20} />
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
        "inline-flex h-7 shrink-0 items-center rounded-full border px-3 text-xs font-bold shadow-lg",
        "border-amber-200/65 bg-amber-400 text-amber-950 shadow-[0_0_18px_rgba(251,191,36,0.42)]",
        tone === "danger" &&
          "border-red-200/70 bg-red-500 text-white shadow-[0_0_18px_rgba(239,68,68,0.42)]",
      )}
    >
      {label}
    </span>
  );
}

function InfoCell({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[50px] min-w-0 items-center gap-2 rounded-lg border border-border bg-card/55 px-2 py-1.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary">
        <Icon size={14} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] text-muted-foreground">{label}</span>
        <strong className="mt-0.5 block truncate text-xs text-foreground">{value}</strong>
      </span>
    </div>
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
          <PackageOpen size={24} />
        </span>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function getTabRecords(warehouse: GameWarehouseView, tab: WarehouseTabKey) {
  if (tab === "accessory_warehouse") return warehouse.accessory.items;
  if (tab === "fabric_warehouse") return warehouse.fabric.items;

  return warehouse.product.items;
}
