"use client";

import Image from "next/image";
import { useMemo, useState, type CSSProperties } from "react";
import { useFormStatus } from "react-dom";
import {
  CalendarDays,
  Check,
  Clock,
  Factory,
  Hash,
  PackageCheck,
  Palette,
  Route,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { acceptMarketOrderAction } from "@/features/orders/actions/accept-market-order-action";
import { OrderPriorityList } from "./order-priority-list";

import type { OrderMarketView, OrderOfferItemView, OrderOfferView } from "../types";

type OfferFilter =
  | "ALL"
  | "NORMAL"
  | "OPPORTUNITY"
  | "EXPRESS"
  | "REPEAT"
  | "COLLECTION";
type TierFilter = "ALL" | "BASIC" | "STANDARD" | "PREMIUM" | "LUXURY";

const offerFilters: Array<{ label: string; value: OfferFilter }> = [
  { label: "Tümü", value: "ALL" },
  { label: "Normal", value: "NORMAL" },
  { label: "Fırsat", value: "OPPORTUNITY" },
  { label: "Express", value: "EXPRESS" },
  { label: "RPT", value: "REPEAT" },
  { label: "Koleksiyon", value: "COLLECTION" },
];

const tierFilters: Array<{ label: string; value: TierFilter }> = [
  { label: "Tümü", value: "ALL" },
  { label: "Basic", value: "BASIC" },
  { label: "Standard", value: "STANDARD" },
  { label: "Premium", value: "PREMIUM" },
  { label: "Luxury", value: "LUXURY" },
];

const offerAccentClasses = {
  EXPRESS: {
    badge: "border-rose-400/55 bg-rose-400/10 text-rose-200",
    border: "border-l-rose-400",
  },
  NORMAL: {
    badge: "border-sky-400/55 bg-sky-400/10 text-sky-200",
    border: "border-l-sky-400",
  },
  OPPORTUNITY: {
    badge: "border-amber-400/60 bg-amber-400/10 text-amber-200",
    border: "border-l-amber-400",
  },
  REPEAT: {
    badge: "border-emerald-400/55 bg-emerald-400/10 text-emerald-200",
    border: "border-l-emerald-400",
  },
} as const;

type OrdersPanelProps = {
  orderMarket: OrderMarketView;
};

export function OrdersPanel({ orderMarket }: OrdersPanelProps) {
  const [panelMode, setPanelMode] = useState<"MARKET" | "PRIORITY">(
    orderMarket.activeOrders.length > 0 ? "PRIORITY" : "MARKET",
  );
  const [selectedId, setSelectedId] = useState(
    orderMarket.offers[0]?.id ?? "",
  );
  const [offerFilter, setOfferFilter] = useState<OfferFilter>("ALL");
  const [tierFilter, setTierFilter] = useState<TierFilter>("ALL");
  const filteredOffers = useMemo(
    () =>
      orderMarket.offers.filter((offer) => {
        const matchesOfferType =
          offerFilter === "ALL" ||
          (offerFilter === "COLLECTION"
            ? offer.isCollection
            : offer.offerType === offerFilter);
        const matchesTier =
          tierFilter === "ALL" ||
          offer.items.some((item) => item.productTier === tierFilter);

        return matchesOfferType && matchesTier;
      }),
    [offerFilter, orderMarket.offers, tierFilter],
  );
  const selectedOffer = useMemo(
    () =>
      filteredOffers.find((offer) => offer.id === selectedId) ??
      filteredOffers[0],
    [filteredOffers, selectedId],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <nav aria-label="Sipariş paneli görünümü" className="flex gap-2">
        <Button
          onClick={() => setPanelMode("PRIORITY")}
          size="sm"
          type="button"
          variant={panelMode === "PRIORITY" ? "default" : "outline"}
        >
          Üretim Önceliği ({orderMarket.activeOrders.length})
        </Button>
        <Button
          onClick={() => setPanelMode("MARKET")}
          size="sm"
          type="button"
          variant={panelMode === "MARKET" ? "default" : "outline"}
        >
          Sipariş Pazarı ({orderMarket.offers.length})
        </Button>
      </nav>

      {panelMode === "PRIORITY" ? (
        <OrderPriorityList
          activeOrders={orderMarket.activeOrders}
          key={orderMarket.activeOrders.map((order) => order.id).join(":")}
        />
      ) : orderMarket.offers.length === 0 ? (
        <OrdersEmptyState />
      ) : (
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 xl:grid-cols-[330px_minmax(0,1fr)_340px]">
      <OrderListPanel
        offerFilter={offerFilter}
        offers={filteredOffers}
        onSelect={setSelectedId}
        onOfferFilterChange={setOfferFilter}
        onTierFilterChange={setTierFilter}
        selectedId={selectedOffer?.id ?? ""}
        sourceOffers={orderMarket.offers}
        tierFilter={tierFilter}
      />
      {selectedOffer ? (
        <>
          <SelectedOrderDetail offer={selectedOffer} />
          <OrderCostPanel offer={selectedOffer} />
        </>
      ) : (
        <OrdersFilterEmptyState />
      )}
      </div>
      )}
    </div>
  );
}

function OrdersFilterEmptyState() {
  return (
    <div className="grid min-h-[320px] place-items-center rounded-lg border border-dashed border-border bg-card/50 p-6 text-center xl:col-span-2">
      <div>
        <p className="text-sm font-medium text-foreground">Bu filtrede teklif yok</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Pazar yeni teklifler oluşturduğunda burada görünecek.
        </p>
      </div>
    </div>
  );
}

function OrdersEmptyState() {
  return (
    <div className="grid h-full min-h-[420px] place-items-center rounded-lg border border-border bg-card/70 p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-12 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          <PackageCheck size={24} />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Sipariş Pazarı
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-foreground">
          Açık teklif bulunmuyor
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Sipariş üretim motoru teklifleri oluşturduğunda bu panelde listelenecek.
        </p>
      </div>
    </div>
  );
}

function OrderListPanel({
  offers,
  sourceOffers,
  offerFilter,
  tierFilter,
  selectedId,
  onSelect,
  onOfferFilterChange,
  onTierFilterChange,
}: {
  offers: OrderOfferView[];
  sourceOffers: OrderOfferView[];
  offerFilter: OfferFilter;
  tierFilter: TierFilter;
  selectedId: string;
  onSelect: (id: string) => void;
  onOfferFilterChange: (filter: OfferFilter) => void;
  onTierFilterChange: (filter: TierFilter) => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col rounded-lg border border-border bg-card/70 p-3">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Sipariş Pazarı
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-none text-foreground">
          Ürün Siparişleri
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {offers.length} açık teklif
        </p>
      </div>
      <div className="mb-3 space-y-2">
        <Tabs onValueChange={(value) => onOfferFilterChange(value as OfferFilter)} value={offerFilter}>
          <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-lg bg-background/60 p-1">
            {offerFilters.map((filter) => (
              <TabsTrigger className="h-7 shrink-0 rounded-md px-2 text-[11px]" key={filter.value} value={filter.value}>
                {filter.label} ({getOfferFilterCount(sourceOffers, filter.value)})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Tabs onValueChange={(value) => onTierFilterChange(value as TierFilter)} value={tierFilter}>
          <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-lg bg-background/60 p-1">
            {tierFilters.map((filter) => (
              <TabsTrigger className="h-7 shrink-0 rounded-md px-2 text-[11px]" key={filter.value} value={filter.value}>
                {filter.label} ({getTierFilterCount(sourceOffers, filter.value)})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="min-h-0 flex-1 touch-pan-y overscroll-contain space-y-2 overflow-y-auto pr-1">
        {offers.length > 0 ? (
          offers.map((offer, index) => (
            <OrderListCard
              index={index}
              key={offer.id}
              offer={offer}
              onSelect={onSelect}
              selected={offer.id === selectedId}
            />
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-background/40 p-3 text-center text-xs text-muted-foreground">
            Bu filtrede teklif bulunmuyor.
          </p>
        )}
      </div>
    </aside>
  );
}

function OrderListCard({
  index,
  offer,
  selected,
  onSelect,
}: {
  index: number;
  offer: OrderOfferView;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const primaryItem = offer.items[0];
  const primaryColor = primaryItem?.colors[0]?.hexCode ?? "#006D8F";
  const accent = offerAccentClasses[offer.offerType];

  return (
    <button
      aria-pressed={selected}
      className={cn(
        "group w-full rounded-lg border border-border border-l-[3px] bg-background/55 p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary/60",
        accent.border,
        selected && "bg-secondary ring-1 ring-primary/50 shadow-[0_0_24px_hsl(var(--primary)/0.16)]",
      )}
      onClick={() => onSelect(offer.id)}
      type="button"
    >
      <div className="flex items-start gap-2">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-lg border text-sm font-semibold"
          style={badgeStyle(primaryColor, selected)}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {offer.customerName}
          </span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">
            {offer.isCollection
              ? `Koleksiyon · ${offer.items.length} ürün`
              : primaryItem?.productName ?? offer.offerNo}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-1">
            <OfferTypeBadge offer={offer} />
            <span className="rounded border border-border bg-card/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {offer.segmentLabel}
            </span>
          </span>
          <span className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              Teslim: {offer.targetDeliveryDay}. gün
            </span>
            <span className="text-sm font-semibold text-primary">
              {offer.totalRevenueLabel}
            </span>
          </span>
        </span>
      </div>
    </button>
  );
}

function SelectedOrderDetail({ offer }: { offer: OrderOfferView }) {
  const primaryItem = offer.items[0];

  return (
    <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-lg border border-border border-t-2 bg-card/70", offerAccentClasses[offer.offerType].border.replace("border-l", "border-t"))}>
      <div className="border-b border-border p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Seçili Sipariş
            </p>
            <h2 className="mt-2 truncate text-2xl font-semibold text-foreground">
              {offer.customerName}
            </h2>
          </div>
          <Badge className="shrink-0" variant="secondary">
            {offer.offerNo}
          </Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <InfoPill icon={PackageCheck} label={offer.totalQuantityLabel} />
          <InfoPill icon={Clock} label={`Son: ${offer.expiresDay}. gün`} />
          <InfoPill icon={Factory} label={offer.segmentLabel} />
          <OfferTypeBadge offer={offer} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {primaryItem ? (
          <>
            <ProductHero item={primaryItem} />
            <OrderMetaGrid offer={offer} item={primaryItem} />
            <ColorDetails item={primaryItem} />
            {offer.isCollection ? <CollectionItems items={offer.items} /> : null}
          </>
        ) : (
          <p className="rounded-lg border border-border bg-background/60 p-4 text-sm text-muted-foreground">
            Bu teklifte ürün kalemi bulunmuyor.
          </p>
        )}
      </div>
    </section>
  );
}

function ProductHero({ item }: { item: OrderOfferItemView }) {
  const primaryColor = item.colors[0]?.hexCode ?? "#006D8F";
  const secondaryColor = item.colors[1]?.hexCode ?? "#D29D00";

  return (
    <div
      className="relative min-h-[210px] overflow-hidden rounded-lg border border-border bg-background"
      style={heroStyle(primaryColor, secondaryColor)}
    >
      <div className="absolute bottom-5 left-5 z-10 max-w-[54%]">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
          {item.productCode}
        </p>
        <h3 className="text-2xl font-semibold leading-tight text-white">
          {item.productName}
        </h3>
        <p className="mt-3 text-sm text-white/70">
          {item.quantityLabel} · {item.productTierLabel}
        </p>
      </div>
      {item.imageUrl ? (
        <span className="absolute bottom-[-16px] right-2 h-[230px] w-[48%]">
          <Image
            alt={item.productName}
            className="object-contain object-bottom drop-shadow-[0_20px_34px_rgba(0,0,0,0.45)]"
            fill
            sizes="(min-width: 1280px) 360px, 50vw"
            src={item.imageUrl}
          />
        </span>
      ) : (
        <span className="absolute right-8 top-12 grid size-32 place-items-center rounded-lg border border-white/15 bg-white/10 text-white/50">
          <PackageCheck size={48} />
        </span>
      )}
    </div>
  );
}

function OrderMetaGrid({
  offer,
  item,
}: {
  offer: OrderOfferView;
  item: OrderOfferItemView;
}) {
  return (
    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
      <MetaTile icon={Hash} label="Kod" value={item.productCode} />
      <MetaTile icon={CalendarDays} label="Teslim" value={offer.deliveryLabel} />
      <MetaTile icon={Route} label="Rota" value={item.routeLabel || "-"} />
      <MetaTile icon={Palette} label="Renk" value={`${item.colors.length} varyant`} />
      <MetaTile icon={PackageCheck} label="Adet" value={item.quantityLabel} />
      <MetaTile icon={Factory} label="Segment" value={offer.segmentLabel} />
      <MetaTile icon={Hash} label="Hacim" value={offer.volumeLabel} />
    </div>
  );
}

function CollectionItems({ items }: { items: OrderOfferItemView[] }) {
  return (
    <div className="mt-2 rounded-lg border border-border bg-background/60 p-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Koleksiyon Kalemleri
      </p>
      <div className="mt-2 space-y-1.5">
        {items.map((item) => (
          <div className="flex items-center justify-between gap-2 text-xs" key={item.id}>
            <span className="min-w-0 truncate text-foreground">{item.productName}</span>
            <span className="shrink-0 text-muted-foreground">
              {item.productTierLabel} · {item.quantityLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColorDetails({ item }: { item: OrderOfferItemView }) {
  if (item.colors.length === 0) return null;

  return (
    <div className="mt-2 rounded-lg border border-border bg-background/60 p-2.5">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Palette size={13} />
        Renk Dağılımı
      </div>
      <div className="flex flex-wrap gap-1.5">
        {item.colors.map((color) => (
          <span
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/70 px-2 py-1 text-[11px] text-muted-foreground"
            key={color.id}
          >
            <span
              className="size-3.5 shrink-0 rounded-[4px] border border-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
              style={{ backgroundColor: color.hexCode }}
            />
            <span className="max-w-24 truncate">{color.name}</span>
            <strong className="text-foreground/80">{color.quantityLabel}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function OrderCostPanel({ offer }: { offer: OrderOfferView }) {
  const isProfitPositive = Number(offer.plannedProfitCents) >= 0;
  const primaryItem = offer.items[0];

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card/70">
      <div className="border-b border-border p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Maliyet Planı
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Planlanan Marj</p>
        <h2
          className={cn(
            "mt-2 text-2xl font-semibold",
            isProfitPositive ? "text-emerald-300" : "text-red-300",
          )}
        >
          {offer.plannedMarginLabel}
        </h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="grid gap-2">
          <CostPairMetric
            firstLabel="Birim Fiyat"
            firstValue={primaryItem?.unitPriceLabel ?? "-"}
            secondLabel="Toplam Tutar"
            secondValue={offer.totalRevenueLabel}
          />
          <CostPairMetric
            firstLabel="Birim Maliyet"
            firstValue={primaryItem?.plannedUnitCostLabel ?? "-"}
            secondLabel="Toplam Maliyet"
            secondValue={offer.plannedCostLabel}
          />
          <CostPairMetric
            firstLabel="Birim Kar"
            firstValue={primaryItem?.plannedUnitProfitLabel ?? "-"}
            secondLabel="Toplam Kar"
            secondValue={offer.plannedProfitLabel}
            tone={isProfitPositive ? "profit" : "loss"}
          />
        </div>

        <div className="mt-2 rounded-lg border border-border bg-background/60 p-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Kapasite riski</span>
            <strong className="text-foreground">{offer.capacityRiskLabel}</strong>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Teslimat riski</span>
            <strong className="text-foreground">{offer.deliveryRiskLabel}</strong>
          </div>
        </div>

        <OrderAcceptPlan offer={offer} />
      </div>
    </aside>
  );
}

function OrderAcceptPlan({ offer }: { offer: OrderOfferView }) {
  return (
    <form action={acceptMarketOrderAction} className="mt-2 rounded-lg border border-border bg-background/60 p-2.5">
      <input name="offerId" type="hidden" value={offer.id} />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Kabul Planı
      </p>
      <div className="mt-2 space-y-1.5 text-[11px]">
        <AcceptPlanRow label="Stok" value={offer.acceptPlan.materialReadyLabel} />
        <AcceptPlanRow label="Kesim" value={offer.acceptPlan.cuttingStartLabel} />
        <AcceptPlanRow label="Üretim" value={offer.acceptPlan.productionOrderLabel} />
      </div>
      <AcceptOrderButton />
    </form>
  );
}

function AcceptPlanRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card/60 px-2 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <strong className="text-right text-[11px] text-foreground">{value}</strong>
    </div>
  );
}

function AcceptOrderButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="mt-2 w-full" disabled={pending} size="sm" type="submit">
      <Check size={16} />
      {pending ? "Hazırlanıyor..." : "Siparişi Kabul Et"}
    </Button>
  );
}

function InfoPill({
  icon: Icon,
  label,
}: {
  icon: typeof PackageCheck;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs text-muted-foreground">
      <Icon size={14} />
      {label}
    </span>
  );
}

function MetaTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[54px] items-center gap-2 rounded-lg border border-border bg-background/60 p-2">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
        <Icon size={14} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <strong className="mt-1 block truncate text-sm text-foreground">
          {value}
        </strong>
      </span>
    </div>
  );
}

function CostPairMetric({
  firstLabel,
  firstValue,
  secondLabel,
  secondValue,
  tone = "default",
}: {
  firstLabel: string;
  firstValue: string;
  secondLabel: string;
  secondValue: string;
  tone?: "default" | "profit" | "loss";
}) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-2.5">
      <div className="grid grid-cols-2 gap-2">
        <CostValue label={firstLabel} tone={tone} value={firstValue} />
        <CostValue label={secondLabel} tone={tone} value={secondValue} />
      </div>
    </div>
  );
}

function CostValue({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "profit" | "loss";
}) {
  return (
    <span className="min-w-0">
      <span className="block text-[11px] text-muted-foreground">{label}</span>
      <strong
        className={cn(
          "mt-0.5 block truncate text-base font-semibold",
          tone === "profit" && "text-emerald-300",
          tone === "loss" && "text-red-300",
          tone === "default" && "text-foreground",
        )}
      >
        {value}
      </strong>
    </span>
  );
}

function OfferTypeBadge({ offer }: { offer: OrderOfferView }) {
  return (
    <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold", offerAccentClasses[offer.offerType].badge)}>
      {offer.offerTypeLabel}
    </span>
  );
}

function getOfferFilterCount(offers: OrderOfferView[], filter: OfferFilter) {
  if (filter === "ALL") return offers.length;
  if (filter === "COLLECTION") return offers.filter((offer) => offer.isCollection).length;

  return offers.filter((offer) => offer.offerType === filter).length;
}

function getTierFilterCount(offers: OrderOfferView[], filter: TierFilter) {
  if (filter === "ALL") return offers.length;

  return offers.filter((offer) =>
    offer.items.some((item) => item.productTier === filter),
  ).length;
}

function badgeStyle(color: string, selected: boolean): CSSProperties {
  return {
    backgroundColor: selected ? rgbaFromHex(color, 0.16) : "rgba(255,255,255,0.04)",
    borderColor: rgbaFromHex(color, selected ? 0.65 : 0.32),
    color: selected ? color : "rgba(255,255,255,0.78)",
  };
}

function heroStyle(primaryColor: string, secondaryColor: string): CSSProperties {
  return {
    background: [
      `radial-gradient(circle at 88% 90%, ${rgbaFromHex(secondaryColor, 0.48)}, transparent 42%)`,
      `radial-gradient(circle at 14% 10%, ${rgbaFromHex(primaryColor, 0.28)}, transparent 36%)`,
      "linear-gradient(135deg, rgba(35,36,41,0.96), rgba(8,10,12,0.94))",
    ].join(", "),
  };
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : clean;
  const bigint = Number.parseInt(normalized || "ffffff", 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return { b, g, r };
}

function rgbaFromHex(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
