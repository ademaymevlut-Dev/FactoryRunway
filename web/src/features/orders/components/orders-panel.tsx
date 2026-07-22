"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Factory,
  Gem,
  Hash,
  LockKeyhole,
  PackageCheck,
  Palette,
  Repeat2,
  Route,
  Shirt,
  ShoppingBag,
  StarCheck,
  TagPlus,
  type LucideIcon,
} from "lucide-react";

import { ArtCard } from "@/components/ui/art-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { acceptMarketOrderAction } from "@/features/orders/actions/accept-market-order-action";
import {
  PRODUCT_TIER_LABELS,
  PRODUCT_TIER_MIN_LEVEL,
  isProductTierUnlocked,
  type ProductTier,
} from "../product-tier-rules";

import type {
  ActiveOrderPriorityView,
  OrderMarketView,
  OrderOfferCapacityState,
  OrderOfferItemView,
  OrderOfferView,
} from "../types";

type MarketFilter = ProductTier;

const marketFilters: Array<{
  description: string;
  hint: string;
  icon: LucideIcon;
  label: string;
  value: MarketFilter;
}> = [
  {
    description: "Kolay üretim, yüksek adet ve düşük XP kademeli seri üretim işleri.",
    hint: "LEVEL 1 · Seri üretim",
    icon: Shirt,
    label: "Basic",
    value: "BASIC",
  },
  {
    description: "Baskı, nakış, boyama, yıkama veya fason süreçli ikinci kademe işler.",
    hint: "LEVEL 5 · Ek işlemli",
    icon: TagPlus,
    label: "Standard",
    value: "STANDARD",
  },
  {
    description: "Daha yüksek üretim yükü, kalite beklentisi ve üçüncü kademe XP.",
    hint: "LEVEL 20 · Yüksek kalite",
    icon: StarCheck,
    label: "Premium",
    value: "PREMIUM",
  },
  {
    description: "Düşük adet, yüksek fiyat, yüksek kar ve en yüksek XP kademesi.",
    hint: "LEVEL 50 · Zirve grup",
    icon: Gem,
    label: "Luxury",
    value: "LUXURY",
  },
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

const marketFilterAccentClasses: Record<
  MarketFilter,
  { badge: string; border: string }
> = {
  BASIC: {
    badge: "border-sky-400/55 bg-sky-400/10 text-sky-200",
    border: "border-l-sky-400",
  },
  LUXURY: {
    badge: "border-fuchsia-400/55 bg-fuchsia-400/10 text-fuchsia-200",
    border: "border-l-fuchsia-400",
  },
  PREMIUM: {
    badge: "border-violet-400/55 bg-violet-400/10 text-violet-200",
    border: "border-l-violet-400",
  },
  STANDARD: {
    badge: "border-emerald-400/55 bg-emerald-400/10 text-emerald-200",
    border: "border-l-emerald-400",
  },
};

type OrdersPanelProps = {
  orderMarket: OrderMarketView;
};

export function OrdersPanel({ orderMarket }: OrdersPanelProps) {
  const [selectedFilter, setSelectedFilter] = useState<MarketFilter | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const filteredOffers = useMemo(
    () =>
      selectedFilter === null
        ? []
        : orderMarket.offers.filter((offer) =>
            matchesMarketFilter(offer, selectedFilter),
          ),
    [orderMarket.offers, selectedFilter],
  );
  const selectedOffer = useMemo(
    () =>
      filteredOffers.find((offer) => offer.id === selectedId) ??
      filteredOffers[0],
    [filteredOffers, selectedId],
  );
  const selectFilter = (filter: MarketFilter) => {
    const nextOffers = orderMarket.offers.filter((offer) =>
      matchesMarketFilter(offer, filter),
    );

    setSelectedFilter(filter);
    setSelectedId(nextOffers[0]?.id ?? "");
  };
  const resetFilter = () => {
    setSelectedFilter(null);
    setSelectedId("");
  };
  const selectedTierUnlocked = selectedFilter
    ? isProductTierUnlocked(selectedFilter, orderMarket.currentLevel)
    : false;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 xl:grid-cols-[330px_minmax(0,1fr)_340px]">
        <OrderSidebarPanel
          currentLevel={orderMarket.currentLevel}
          offers={filteredOffers}
          selectedFilter={selectedFilter}
          onSelect={setSelectedId}
          onBack={resetFilter}
          onSelectFilter={selectFilter}
          selectedId={selectedOffer?.id ?? ""}
          sourceOffers={orderMarket.offers}
        />
        {selectedFilter === null ? (
          <OrdersEmptyState availableCount={orderMarket.availableCount} />
        ) : !selectedTierUnlocked ? (
          <LockedProductTierState
            currentLevel={orderMarket.currentLevel}
            tier={selectedFilter}
          />
        ) : selectedOffer ? (
          <SelectedOrderPanels
            activeOrders={orderMarket.activeOrders}
            key={selectedOffer.id}
            offer={selectedOffer}
          />
        ) : (
          <ProductTierEmptyState tier={selectedFilter} />
        )}
      </div>
    </div>
  );
}

function SelectedOrderPanels({
  activeOrders,
  offer,
}: {
  activeOrders: ActiveOrderPriorityView[];
  offer: OrderOfferView;
}) {
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const activeItem = offer.items[activeItemIndex] ?? offer.items[0];

  return (
    <>
      <SelectedOrderDetail
        activeItem={activeItem}
        activeItemIndex={activeItemIndex}
        offer={offer}
        onActiveItemChange={setActiveItemIndex}
      />
      <OrderCostPanel
        activeItem={activeItem}
        activeOrders={activeOrders}
        offer={offer}
      />
    </>
  );
}

function OrdersEmptyState({ availableCount }: { availableCount: number }) {
  return (
    <div className="grid h-full min-h-[420px] place-items-center rounded-lg border border-border bg-card/70 p-8 text-center xl:col-span-2">
      <div className="max-w-md">
        <span className="mx-auto grid size-12 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          <PackageCheck size={24} />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Sipariş Pazarı
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-foreground">
          Ürün grubunu seç
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {availableCount > 0
            ? `${availableCount} açık teklif ürün gruplarına ayrılmış durumda.`
            : "Yeni teklifler vardiya ilerledikçe uygun ürün gruplarında oluşacak."}
        </p>
      </div>
    </div>
  );
}

function LockedProductTierState({
  currentLevel,
  tier,
}: {
  currentLevel: number;
  tier: ProductTier;
}) {
  const minimumLevel = PRODUCT_TIER_MIN_LEVEL[tier];

  return (
    <div className="grid h-full min-h-[420px] place-items-center rounded-lg border border-amber-400/25 bg-card/70 p-8 text-center xl:col-span-2">
      <div className="max-w-lg">
        <span className="mx-auto grid size-12 place-items-center rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-200">
          <LockKeyhole size={23} />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
          Kilitli Ürün Grubu
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-foreground">
          {PRODUCT_TIER_LABELS[tier]} siparişleri için LEVEL {minimumLevel}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Mevcut seviyen LEVEL {currentLevel}. Bu seviyeye ulaştığında uygun
          ürünlerin ve bu gruba bağlı müşterilerin siparişleri gelmeye başlayacak.
        </p>
      </div>
    </div>
  );
}

function ProductTierEmptyState({ tier }: { tier: ProductTier }) {
  return (
    <div className="grid h-full min-h-[420px] place-items-center rounded-lg border border-border bg-card/70 p-8 text-center xl:col-span-2">
      <div className="max-w-lg">
        <span className="mx-auto grid size-12 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          <PackageCheck size={24} />
        </span>
        <h2 className="mt-5 text-2xl font-semibold text-foreground">
          Açık {PRODUCT_TIER_LABELS[tier]} teklifi yok
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Motor, oyuncu seviyene ve üretim kapasitesine uygun yeni teklifleri
          vardiya ilerledikçe oluşturacak.
        </p>
      </div>
    </div>
  );
}

function OrderSidebarPanel({
  currentLevel,
  offers,
  sourceOffers,
  selectedFilter,
  selectedId,
  onSelect,
  onBack,
  onSelectFilter,
}: {
  currentLevel: number;
  offers: OrderOfferView[];
  sourceOffers: OrderOfferView[];
  selectedFilter: MarketFilter | null;
  selectedId: string;
  onSelect: (id: string) => void;
  onBack: () => void;
  onSelectFilter: (filter: MarketFilter) => void;
}) {
  const selectedMarketFilter =
    selectedFilter === null ? null : getMarketFilter(selectedFilter);
  const visibleOfferCount =
    selectedFilter === null ? sourceOffers.length : offers.length;

  return (
    <aside className="flex min-h-0 flex-col rounded-lg border border-border bg-card/70 p-3">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Sipariş Pazarı
        </p>
        {selectedMarketFilter ? (
          <div className="mt-3 flex items-center gap-2">
            <Button
              aria-label="Filtreyi değiştir"
              className="shrink-0"
              onClick={onBack}
              size="icon-sm"
              type="button"
            >
              <ArrowLeft size={16} />
            </Button>
            <h2 className="min-w-0 truncate text-2xl font-semibold leading-tight text-foreground">
              {selectedMarketFilter.label}
            </h2>
          </div>
        ) : null}
        <p className="mt-2 text-sm text-muted-foreground">
          {visibleOfferCount} açık teklif
        </p>
      </div>

      {selectedFilter === null ? (
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {marketFilters.map((filter) => (
            <MarketFilterButton
              count={getMarketFilterCount(sourceOffers, filter.value)}
              currentLevel={currentLevel}
              filter={filter}
              key={filter.value}
              onSelect={onSelectFilter}
            />
          ))}
        </div>
      ) : null}

      {selectedMarketFilter ? (
        <MarketFilterBrief filter={selectedMarketFilter} />
      ) : null}

      {selectedFilter !== null ? (
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
              Bu grupta teklif bulunmuyor.
            </p>
          )}
        </div>
      ) : null}
    </aside>
  );
}

function MarketFilterButton({
  count,
  currentLevel,
  filter,
  onSelect,
}: {
  count: number;
  currentLevel: number;
  filter: (typeof marketFilters)[number];
  onSelect: (filter: MarketFilter) => void;
}) {
  const Icon = filter.icon;
  const accent = marketFilterAccentClasses[filter.value];
  const unlocked = isProductTierUnlocked(filter.value, currentLevel);

  return (
    <button
      className={cn(
        "group flex w-full items-center gap-2 rounded-lg border border-border border-l-[3px] bg-background/55 p-2 text-left transition-all duration-200 hover:bg-secondary/60",
        accent.border,
      )}
      onClick={() => onSelect(filter.value)}
      type="button"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-md border border-white/10 bg-card/80 text-foreground group-hover:text-primary">
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {filter.label}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {filter.hint}
        </span>
      </span>
      {unlocked ? (
        <span className={cn("shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold", accent.badge)}>
          {count}
        </span>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1 rounded border border-amber-400/35 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
          <LockKeyhole size={10} />
          Lv. {PRODUCT_TIER_MIN_LEVEL[filter.value]}
        </span>
      )}
    </button>
  );
}

function MarketFilterBrief({
  filter,
}: {
  filter: (typeof marketFilters)[number];
}) {
  const Icon = filter.icon;
  const accent = marketFilterAccentClasses[filter.value];

  return (
    <div className={cn("mb-3 rounded-lg border border-border border-l-[3px] bg-background/60 p-2.5", accent.border)}>
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-md border border-white/10 bg-card/70 text-foreground">
          <Icon size={15} />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-foreground">
            {filter.hint}
          </span>
          <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
            {filter.description}
          </span>
        </span>
      </div>
    </div>
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

function SelectedOrderDetail({
  activeItem,
  activeItemIndex,
  offer,
  onActiveItemChange,
}: {
  activeItem: OrderOfferItemView | undefined;
  activeItemIndex: number;
  offer: OrderOfferView;
  onActiveItemChange: (index: number) => void;
}) {
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
        {activeItem ? (
          <>
            {offer.items.length > 1 ? (
              <CollectionCarouselControls
                activeIndex={activeItemIndex}
                items={offer.items}
                onSelect={onActiveItemChange}
              />
            ) : null}
            <div
              className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-2 motion-safe:duration-300"
              key={activeItem.id}
            >
              <ProductShowcase offer={offer} item={activeItem} />
              <ColorDetails item={activeItem} />
            </div>
            {offer.isCollection ? (
              <CollectionItems
                activeItemId={activeItem.id}
                items={offer.items}
                onSelect={onActiveItemChange}
              />
            ) : null}
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

function CollectionCarouselControls({
  activeIndex,
  items,
  onSelect,
}: {
  activeIndex: number;
  items: OrderOfferItemView[];
  onSelect: (index: number) => void;
}) {
  const itemCount = items.length;
  const activeItem = items[activeIndex] ?? items[0];
  const selectPrevious = () =>
    onSelect((activeIndex - 1 + itemCount) % itemCount);
  const selectNext = () => onSelect((activeIndex + 1) % itemCount);

  return (
    <div
      aria-label="Koleksiyon ürün gezgini"
      className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-border bg-background/60 px-2.5 py-2"
      role="group"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Koleksiyon Ürünü
        </p>
        <p className="mt-0.5 truncate text-xs font-medium text-foreground">
          {activeIndex + 1} / {itemCount} · {activeItem?.productName}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          aria-label="Önceki koleksiyon ürünü"
          onClick={selectPrevious}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <ChevronLeft />
        </Button>
        <div className="flex items-center gap-1" role="tablist">
          {items.map((item, index) => (
            <button
              aria-label={`${index + 1}. ürün: ${item.productName}`}
              aria-selected={index === activeIndex}
              className={cn(
                "size-1.5 rounded-full bg-muted-foreground/35 transition-all hover:bg-primary/70",
                index === activeIndex && "w-4 bg-primary",
              )}
              key={item.id}
              onClick={() => onSelect(index)}
              role="tab"
              type="button"
            />
          ))}
        </div>
        <Button
          aria-label="Sonraki koleksiyon ürünü"
          onClick={selectNext}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

function ProductShowcase({
  offer,
  item,
}: {
  offer: OrderOfferView;
  item: OrderOfferItemView;
}) {
  return (
    <div className="grid min-h-[330px] grid-cols-1 gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="flex min-w-0 flex-col justify-between gap-2 rounded-lg border border-border bg-background/60 p-2.5">
        <div>
          <h3 className="text-2xl font-semibold leading-tight text-foreground">
            {item.productName}
          </h3>
        </div>

        <div className="grid gap-1.5">
          <MetaTile icon={Hash} label="Kod" value={item.productCode} />
          <MetaTile icon={CalendarDays} label="Teslim" value={offer.deliveryLabel} />
          <MetaTile
            icon={Route}
            label="Rota"
            marquee
            value={item.routeLabel || "-"}
          />
          <MetaTile icon={Palette} label="Renk" value={`${item.colors.length} varyant`} />
          <MetaTile icon={PackageCheck} label="Adet" value={item.quantityLabel} />
          <MetaTile icon={Factory} label="Segment" value={offer.segmentLabel} />
          <MetaTile icon={Hash} label="Hacim" value={offer.volumeLabel} />
        </div>
      </div>

      <div className="relative isolate min-h-[300px] overflow-hidden rounded-lg lg:min-h-0">
        <div
          className="absolute inset-0 z-0 overflow-hidden rounded-lg border border-white/10 bg-[#15141d]"
          data-product-art-layer="true"
        >
          <ArtCard
            gradientFrom={item.cardGradientFrom}
            gradientTo={item.cardGradientTo}
            primaryColor={item.cardPrimaryColor}
            secondaryColor={item.cardSecondaryColor}
            svgIconAccentColor={item.cardSvgIconAccentColor}
          />
          <span className="absolute left-5 top-3 z-10 text-8xl font-extralight text-white/20">
            {item.productName.charAt(0).toUpperCase()}
          </span>
        </div>
        {item.imageUrl ? (
          <div
            className="pointer-events-none absolute inset-0 z-30"
            data-product-image-layer="true"
          >
            <Image
              alt={item.productName}
              className="object-contain object-bottom"
              fill
              sizes="(min-width: 1280px) 420px, (min-width: 1024px) 40vw, 90vw"
              src={item.imageUrl}
            />
          </div>
        ) : (
          <span
            className="absolute inset-8 z-30 grid place-items-center rounded-lg border border-white/15 bg-white/10 text-white/50"
          >
            <PackageCheck size={72} />
          </span>
        )}
      </div>
    </div>
  );
}

function CollectionItems({
  activeItemId,
  items,
  onSelect,
}: {
  activeItemId: string;
  items: OrderOfferItemView[];
  onSelect: (index: number) => void;
}) {
  return (
    <div className="mt-2 rounded-lg border border-border bg-background/60 p-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Koleksiyon Kalemleri
      </p>
      <div className="mt-2 space-y-1.5">
        {items.map((item, index) => (
          <button
            aria-pressed={item.id === activeItemId}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-xs transition-colors hover:border-border hover:bg-card/70",
              item.id === activeItemId &&
                "border-primary/35 bg-primary/10 text-primary",
            )}
            key={item.id}
            onClick={() => onSelect(index)}
            type="button"
          >
            <span className="min-w-0 truncate">{item.productName}</span>
            <span className="shrink-0 text-muted-foreground">
              {item.productTierLabel} · {item.quantityLabel}
            </span>
          </button>
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

function OrderCostPanel({
  activeItem,
  activeOrders,
  offer,
}: {
  activeItem: OrderOfferItemView | undefined;
  activeOrders: ActiveOrderPriorityView[];
  offer: OrderOfferView;
}) {
  const hasMultipleItems = offer.items.length > 1;
  const isProfitPositive = Number(
    activeItem?.plannedProfitCents ?? offer.plannedProfitCents,
  ) >= 0;

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card/70">
      <div className="border-b border-border p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Maliyet Planı
        </p>
        {hasMultipleItems && activeItem ? (
          <p className="mt-1 truncate text-xs font-medium text-foreground">
            {activeItem.productName}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">Planlanan Marj</p>
        <h2
          className={cn(
            "mt-2 text-2xl font-semibold",
            isProfitPositive ? "text-emerald-300" : "text-red-300",
          )}
        >
          {activeItem?.plannedMarginLabel ?? offer.plannedMarginLabel}
        </h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="grid gap-2">
          <CostPairMetric
            firstLabel="Birim Fiyat"
            firstValue={activeItem?.unitPriceLabel ?? "-"}
            secondLabel={hasMultipleItems ? "Kalem Tutarı" : "Toplam Tutar"}
            secondValue={activeItem?.totalPriceLabel ?? offer.totalRevenueLabel}
          />
          <CostPairMetric
            firstLabel="Birim Maliyet"
            firstValue={activeItem?.plannedUnitCostLabel ?? "-"}
            secondLabel={hasMultipleItems ? "Kalem Maliyeti" : "Toplam Maliyet"}
            secondValue={activeItem?.plannedTotalCostLabel ?? offer.plannedCostLabel}
          />
          <CostPairMetric
            firstLabel="Birim Kar"
            firstValue={activeItem?.plannedUnitProfitLabel ?? "-"}
            secondLabel={hasMultipleItems ? "Kalem Karı" : "Toplam Kar"}
            secondValue={activeItem?.plannedProfitLabel ?? offer.plannedProfitLabel}
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

        <CustomerRelationshipCard offer={offer} />
        <CapacityPlanCard offer={offer} />
        <ActiveOrdersSnapshot activeOrders={activeOrders} />
        <OrderAcceptPlan offer={offer} />
      </div>
    </aside>
  );
}

function CustomerRelationshipCard({ offer }: { offer: OrderOfferView }) {
  const relationship = offer.customerRelationship;

  if (!relationship) {
    return (
      <div className="mt-2 rounded-lg border border-border bg-background/60 p-2.5">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md border border-sky-300/25 bg-sky-400/10 text-sky-100">
            <ShoppingBag size={15} />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Müşteri İlişkisi
            </span>
            <strong className="block text-xs text-foreground">Yeni müşteri</strong>
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
          İlk teslim performansı sonrası güven ve RPT ihtimali oluşacak.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-border bg-background/60 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("grid size-8 place-items-center rounded-md border", relationshipStatusIconClass(relationship.status))}>
            <Repeat2 size={15} />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Müşteri İlişkisi
            </span>
            <strong className="block text-xs text-foreground">
              {relationship.statusLabel}
            </strong>
          </span>
        </div>
        <span className={cn("shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold", relationshipStatusBadgeClass(relationship.status))}>
          {relationship.repeatLabel}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <RelationshipMiniMetric
          label="Güven"
          value={relationship.relationshipScoreLabel}
        />
        <RelationshipMiniMetric
          label="Geçmiş"
          value={`${relationship.completedOrderCount} iş`}
        />
        <RelationshipMiniMetric
          label="RPT"
          value={relationship.repeatWeightLabel}
        />
      </div>

      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
        {relationship.lateOrderCount > 0
          ? `${relationship.lateOrderCount} gecikmeli teslim, toplam ${relationship.totalLateDays} gün güven kaybı yarattı.`
          : "Zamanında teslim geçmişi tekrar sipariş ihtimalini güçlendiriyor."}
      </p>
    </div>
  );
}

function RelationshipMiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span className="min-w-0 rounded-md border border-border bg-card/50 px-2 py-1">
      <span className="block text-[10px] text-muted-foreground">{label}</span>
      <strong className="block truncate text-xs text-foreground">{value}</strong>
    </span>
  );
}

function CapacityPlanCard({ offer }: { offer: OrderOfferView }) {
  const visibleRows = offer.capacityPlan.rows.slice(0, 5);
  const hiddenCount = Math.max(0, offer.capacityPlan.rows.length - visibleRows.length);

  return (
    <div className="mt-2 rounded-lg border border-border bg-background/60 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Planlanan Yük
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Darboğaz:{" "}
            <strong className="text-foreground">
              {offer.capacityPlan.bottleneckDepartmentLabel}
            </strong>
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold",
            capacityStateBadgeClass(offer.capacityPlan.state),
          )}
        >
          {offer.capacityPlan.stateLabel}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <CapacityMiniMetric
          label="Mevcut"
          value={offer.capacityPlan.currentLoadDaysLabel}
        />
        <CapacityMiniMetric
          label="Teklif"
          value={offer.capacityPlan.offerLoadDaysLabel}
        />
        <CapacityMiniMetric
          label="Sonrası"
          tone={offer.capacityPlan.state}
          value={offer.capacityPlan.afterAcceptLoadDaysLabel}
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
        <span className="rounded-md border border-border bg-card/50 px-2 py-1 text-muted-foreground">
          Tahmin:{" "}
          <strong className="text-foreground">
            {offer.capacityPlan.plannedCompletionLabel}
          </strong>
        </span>
        <span className="rounded-md border border-border bg-card/50 px-2 py-1 text-muted-foreground">
          Termin:{" "}
          <strong className="text-foreground">
            {offer.capacityPlan.targetDeliveryLabel}
          </strong>
        </span>
      </div>

      {visibleRows.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          {visibleRows.map((row) => (
            <div
              className="rounded-md border border-border bg-card/50 px-2 py-1.5"
              key={row.departmentId}
            >
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="min-w-0 truncate font-medium text-foreground">
                  {row.departmentName}
                </span>
                <span
                  className={cn(
                    "shrink-0 font-semibold",
                    capacityStateTextClass(row.state),
                  )}
                >
                  {row.afterAcceptLoadDaysLabel}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted/50">
                <div
                  className={cn("h-full rounded-full", capacityStateBarClass(row.state))}
                  style={{ width: `${row.afterAcceptLoadPercent}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                <span>
                  {row.lineCountLabel} · {row.dailyCapacityLabel}
                </span>
                <span className="shrink-0">
                  {row.currentLoadDaysLabel} + {row.offerLoadDaysLabel}
                </span>
              </div>
            </div>
          ))}
          {hiddenCount > 0 ? (
            <p className="text-[10px] text-muted-foreground">
              +{hiddenCount} bölüm daha var.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CapacityMiniMetric({
  label,
  tone = "SAFE",
  value,
}: {
  label: string;
  tone?: OrderOfferCapacityState;
  value: string;
}) {
  return (
    <span className="min-w-0 rounded-md border border-border bg-card/50 px-2 py-1">
      <span className="block text-[10px] text-muted-foreground">{label}</span>
      <strong className={cn("block truncate text-xs", capacityStateTextClass(tone))}>
        {value}
      </strong>
    </span>
  );
}

function ActiveOrdersSnapshot({
  activeOrders,
}: {
  activeOrders: ActiveOrderPriorityView[];
}) {
  const visibleOrders = activeOrders.slice(0, 3);

  return (
    <div className="mt-2 rounded-lg border border-border bg-background/60 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Aktif Üretim
        </p>
        <span className="text-[10px] text-muted-foreground">
          {activeOrders.length} iş
        </span>
      </div>
      {visibleOrders.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          {visibleOrders.map((order) => (
            <div
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/50 px-2 py-1.5 text-[11px]"
              key={order.id}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">
                  {order.productName}
                </span>
                <span className="block truncate text-muted-foreground">
                  {order.orderNo} · {order.customerName}
                </span>
              </span>
              <span className="shrink-0 text-right text-muted-foreground">
                <strong className="block text-foreground">
                  {order.remainingQuantity.toLocaleString("tr-TR")} adet
                </strong>
                {order.targetDeliveryDay}. gün
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 rounded-md border border-dashed border-border bg-card/40 px-2 py-2 text-[11px] text-muted-foreground">
          Aktif üretim emri yok.
        </p>
      )}
    </div>
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
  marquee = false,
  value,
}: {
  icon: typeof Hash;
  label: string;
  marquee?: boolean;
  value: string;
}) {
  return (
    <div className="flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-background/60 px-2 py-1.5">
      <span className="grid size-6 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary">
        <Icon size={13} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] text-muted-foreground">{label}</span>
        <strong className="mt-0.5 block min-w-0 text-sm text-foreground">
          {marquee ? (
            <OverflowMarquee value={value} />
          ) : (
            <span className="block truncate">{value}</span>
          )}
        </strong>
      </span>
    </div>
  );
}

function OverflowMarquee({ value }: { value: string }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const viewportRef = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const text = textRef.current;
    const viewport = viewportRef.current;

    if (!text || !viewport) return;

    const measure = () => {
      setDistance(Math.max(0, text.scrollWidth - viewport.clientWidth));
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);

      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(text);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [value]);

  return (
    <span
      className="block max-w-full overflow-hidden"
      ref={viewportRef}
      title={value}
    >
      <span
        className={cn(
          "inline-block whitespace-nowrap pr-3",
          distance > 0 && "order-route-marquee",
        )}
        ref={textRef}
        style={
          {
            "--order-route-marquee-distance": `${distance}px`,
          } as CSSProperties
        }
      >
        {value}
      </span>
    </span>
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

function getMarketFilter(filter: MarketFilter) {
  return marketFilters.find((item) => item.value === filter) ?? marketFilters[0];
}

function getMarketFilterCount(offers: OrderOfferView[], filter: MarketFilter) {
  return offers.filter((offer) => matchesMarketFilter(offer, filter)).length;
}

function matchesMarketFilter(offer: OrderOfferView, filter: MarketFilter) {
  return (
    offer.productTier === filter &&
    offer.items.length > 0 &&
    offer.items.every((item) => item.productTier === filter)
  );
}

function capacityStateBadgeClass(state: OrderOfferCapacityState) {
  const classes: Record<OrderOfferCapacityState, string> = {
    BALANCED: "border-cyan-400/45 bg-cyan-400/10 text-cyan-200",
    CRITICAL: "border-red-400/55 bg-red-400/10 text-red-200",
    NO_CAPACITY: "border-zinc-400/45 bg-zinc-400/10 text-zinc-200",
    RISKY: "border-orange-400/55 bg-orange-400/10 text-orange-200",
    SAFE: "border-emerald-400/45 bg-emerald-400/10 text-emerald-200",
    STRETCH: "border-amber-400/55 bg-amber-400/10 text-amber-200",
  };

  return classes[state];
}

function capacityStateTextClass(state: OrderOfferCapacityState) {
  const classes: Record<OrderOfferCapacityState, string> = {
    BALANCED: "text-cyan-200",
    CRITICAL: "text-red-200",
    NO_CAPACITY: "text-zinc-200",
    RISKY: "text-orange-200",
    SAFE: "text-emerald-200",
    STRETCH: "text-amber-200",
  };

  return classes[state];
}

function capacityStateBarClass(state: OrderOfferCapacityState) {
  const classes: Record<OrderOfferCapacityState, string> = {
    BALANCED: "bg-cyan-300",
    CRITICAL: "bg-red-400",
    NO_CAPACITY: "bg-zinc-400",
    RISKY: "bg-orange-400",
    SAFE: "bg-emerald-300",
    STRETCH: "bg-amber-300",
  };

  return classes[state];
}

function relationshipStatusIconClass(
  status: NonNullable<OrderOfferView["customerRelationship"]>["status"],
) {
  const classes: Record<
    NonNullable<OrderOfferView["customerRelationship"]>["status"],
    string
  > = {
    at_risk: "border-orange-300/30 bg-orange-400/10 text-orange-100",
    new: "border-sky-300/30 bg-sky-400/10 text-sky-100",
    trusted: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
    warm: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
  };

  return classes[status];
}

function relationshipStatusBadgeClass(
  status: NonNullable<OrderOfferView["customerRelationship"]>["status"],
) {
  const classes: Record<
    NonNullable<OrderOfferView["customerRelationship"]>["status"],
    string
  > = {
    at_risk: "border-orange-400/45 bg-orange-400/10 text-orange-200",
    new: "border-sky-400/45 bg-sky-400/10 text-sky-200",
    trusted: "border-emerald-400/45 bg-emerald-400/10 text-emerald-200",
    warm: "border-cyan-400/45 bg-cyan-400/10 text-cyan-200",
  };

  return classes[status];
}

function badgeStyle(color: string, selected: boolean): CSSProperties {
  return {
    backgroundColor: selected ? rgbaFromHex(color, 0.16) : "rgba(255,255,255,0.04)",
    borderColor: rgbaFromHex(color, selected ? 0.65 : 0.32),
    color: selected ? color : "rgba(255,255,255,0.78)",
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
