"use client";

import {
  createContext,
  useContext,
  useMemo,
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
  ReceiptText,
  Repeat2,
  Route,
  Shirt,
  ShoppingBag,
  StarCheck,
  TagPlus,
  type LucideIcon,
} from "lucide-react";

import { ProductColorChips } from "@/components/game-presentation/product-color-chips";
import { ProductRouteTimeline } from "@/components/game-presentation/product-route-timeline";
import {
  ProductShowcaseCard,
  type ProductShowcaseMetric,
} from "@/components/game-presentation/product-showcase-card";
import { ProductLightRaysBackground } from "@/components/game-presentation/product-light-rays-background";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_LOCALE,
  numberLocale as resolveNumberLocale,
  type NumberLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import { acceptMarketOrderAction } from "@/features/orders/actions/accept-market-order-action";
import {
  PRODUCT_TIER_MIN_LEVEL,
  isProductTierUnlocked,
  type ProductTier,
} from "../product-tier-rules";
import { ordersCopy, type OrdersCopy } from "../orders-copy";

import type {
  ActiveOrderPriorityView,
  OrderMarketView,
  OrderOfferCapacityState,
  OrderOfferItemView,
  OrderOfferView,
} from "../types";

type MarketFilter = ProductTier;
type MarketFilterConfig = {
  description: string;
  hint: string;
  icon: LucideIcon;
  label: string;
  value: MarketFilter;
};

const marketFilterIcons = {
  BASIC: Shirt,
  LUXURY: Gem,
  PREMIUM: StarCheck,
  STANDARD: TagPlus,
} satisfies Record<MarketFilter, LucideIcon>;

const marketFilterOrder = [
  "BASIC",
  "STANDARD",
  "PREMIUM",
  "LUXURY",
] as const satisfies MarketFilter[];

type OrdersUiContextValue = {
  copy: OrdersCopy["ui"];
  locale: SupportedLocale;
  numberLocale: NumberLocale;
};

const OrdersUiContext = createContext<OrdersUiContextValue>({
  copy: ordersCopy[DEFAULT_LOCALE].ui,
  locale: DEFAULT_LOCALE,
  numberLocale: resolveNumberLocale(DEFAULT_LOCALE),
});

function useOrdersUi() {
  return useContext(OrdersUiContext);
}

function getMarketFilters(locale: SupportedLocale): MarketFilterConfig[] {
  const filterCopy = ordersCopy[locale].filters;

  return marketFilterOrder.map((value) => ({
    ...filterCopy[value],
    icon: marketFilterIcons[value],
    value,
  }));
}

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
  locale: SupportedLocale;
  orderMarket: OrderMarketView;
};

export function OrdersPanel({ locale, orderMarket }: OrdersPanelProps) {
  const uiContext = useMemo<OrdersUiContextValue>(
    () => ({
      copy: ordersCopy[locale].ui,
      locale,
      numberLocale: resolveNumberLocale(locale),
    }),
    [locale],
  );
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
    <OrdersUiContext.Provider value={uiContext}>
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div className="grid min-h-0 flex-1 grid-cols-[68px_minmax(0,1fr)] gap-2 sm:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
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
    </OrdersUiContext.Provider>
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
  const [activeDetailPanel, setActiveDetailPanel] = useState<
    "ORDER" | "PLAN"
  >("ORDER");
  const activeItem = offer.items[activeItemIndex] ?? offer.items[0];

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-2 xl:grid xl:grid-cols-[minmax(0,1fr)_340px]">
      <ResponsiveDetailSwitcher
        activePanel={activeDetailPanel}
        onSelect={setActiveDetailPanel}
      />
      <div
        className={cn(
          "min-h-0 flex-1 xl:block",
          activeDetailPanel !== "ORDER" && "hidden",
        )}
      >
        <SelectedOrderDetail
          activeItem={activeItem}
          activeItemIndex={activeItemIndex}
          offer={offer}
          onActiveItemChange={setActiveItemIndex}
        />
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 xl:block",
          activeDetailPanel !== "PLAN" && "hidden",
        )}
      >
        <OrderCostPanel
          activeItem={activeItem}
          activeOrders={activeOrders}
          offer={offer}
        />
      </div>
    </div>
  );
}

function ResponsiveDetailSwitcher({
  activePanel,
  onSelect,
}: {
  activePanel: "ORDER" | "PLAN";
  onSelect: (panel: "ORDER" | "PLAN") => void;
}) {
  const { copy } = useOrdersUi();
  const tabs = [
    {
      icon: PackageCheck,
      label: copy.detail.selectedOrder,
      value: "ORDER",
    },
    {
      icon: ReceiptText,
      label: copy.cost.planTitle,
      value: "PLAN",
    },
  ] as const;

  return (
    <div
      aria-label={`${copy.detail.selectedOrder} / ${copy.cost.planTitle}`}
      className="grid shrink-0 grid-cols-2 gap-1 rounded-lg border border-border bg-card/70 p-1 xl:hidden"
      role="group"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = activePanel === tab.value;

        return (
          <button
            aria-pressed={selected}
            className={cn(
              "flex min-w-0 items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors",
              selected
                ? "bg-primary/15 text-primary ring-1 ring-primary/35"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
            key={tab.value}
            onClick={() => onSelect(tab.value)}
            type="button"
          >
            <Icon aria-hidden="true" size={15} />
            <span className="hidden truncate min-[440px]:inline">
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function OrdersEmptyState({ availableCount }: { availableCount: number }) {
  const { copy } = useOrdersUi();

  return (
    <div className="grid h-full min-h-0 place-items-center rounded-lg border border-border bg-card/70 p-3 text-center sm:p-8">
      <div className="max-w-md">
        <span className="mx-auto grid size-12 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          <PackageCheck size={24} />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          {copy.empty.market}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-foreground sm:text-2xl">
          {copy.empty.selectTier}
        </h2>
        <p className="mt-3 hidden text-sm leading-6 text-muted-foreground sm:block">
          {availableCount > 0
            ? copy.empty.offersAvailable(availableCount)
            : copy.empty.noOffers}
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
  const { copy, locale } = useOrdersUi();
  const minimumLevel = PRODUCT_TIER_MIN_LEVEL[tier];
  const tierLabel = ordersCopy[locale].filters[tier].label;

  return (
    <div className="grid h-full min-h-0 place-items-center rounded-lg border border-amber-400/25 bg-card/70 p-3 text-center sm:p-8">
      <div className="max-w-lg">
        <span className="mx-auto grid size-12 place-items-center rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-200">
          <LockKeyhole size={23} />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
          {copy.locked.eyebrow}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-foreground sm:text-2xl">
          {copy.locked.title(tierLabel, minimumLevel)}
        </h2>
        <p className="mt-3 hidden text-sm leading-6 text-muted-foreground sm:block">
          {copy.locked.body(currentLevel)}
        </p>
      </div>
    </div>
  );
}

function ProductTierEmptyState({ tier }: { tier: ProductTier }) {
  const { copy, locale } = useOrdersUi();
  const tierLabel = ordersCopy[locale].filters[tier].label;

  return (
    <div className="grid h-full min-h-0 place-items-center rounded-lg border border-border bg-card/70 p-3 text-center sm:p-8">
      <div className="max-w-lg">
        <span className="mx-auto grid size-12 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          <PackageCheck size={24} />
        </span>
        <h2 className="mt-5 text-lg font-semibold text-foreground sm:text-2xl">
          {copy.tierEmpty.title(tierLabel)}
        </h2>
        <p className="mt-3 hidden text-sm leading-6 text-muted-foreground sm:block">
          {copy.tierEmpty.body}
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
  const { copy, locale } = useOrdersUi();
  const marketFilters = getMarketFilters(locale);
  const selectedMarketFilter =
    selectedFilter === null
      ? null
      : getMarketFilter(selectedFilter, marketFilters);
  const visibleOfferCount =
    selectedFilter === null ? sourceOffers.length : offers.length;

  return (
    <aside className="flex min-h-0 flex-col rounded-lg border border-border bg-card/70 p-1.5 sm:p-3">
      <div className="mb-2 sm:mb-3">
        <p className="hidden text-xs font-semibold uppercase tracking-[0.24em] text-primary sm:block">
          {copy.marketTitle}
        </p>
        {selectedMarketFilter ? (
          <div className="flex items-center justify-center gap-2 sm:mt-3 sm:justify-start">
            <Button
              aria-label={copy.sidebar.changeFilterAria}
              className="shrink-0"
              onClick={onBack}
              size="icon-sm"
              type="button"
            >
              <ArrowLeft size={16} />
            </Button>
            <h2 className="hidden min-w-0 truncate text-xl font-semibold leading-tight text-foreground sm:block xl:text-2xl">
              {selectedMarketFilter.label}
            </h2>
          </div>
        ) : null}
        <p className="mt-1 text-center text-[10px] text-muted-foreground sm:mt-2 sm:text-left sm:text-sm">
          {copy.sidebar.openOffers(visibleOfferCount)}
        </p>
      </div>

      {selectedFilter === null ? (
        <>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto sm:space-y-1.5 sm:pr-1">
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
          <OrderSidebarRouteHint />
        </>
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
              {copy.list.noOffersInTier}
            </p>
          )}
        </div>
      ) : null}
    </aside>
  );
}

function OrderSidebarRouteHint() {
  const { copy } = useOrdersUi();

  return (
    <div className="mt-2 shrink-0 rounded-lg border border-primary/20 bg-primary/10 p-1.5 text-primary sm:mt-3 sm:p-2 lg:p-3">
      <div className="flex items-start justify-center gap-2 xl:justify-start">
        <span className="grid size-8 shrink-0 place-items-center rounded-md border border-primary/25 bg-background/45">
          <Route size={15} />
        </span>
        <span className="hidden min-w-0 xl:block">
          <span className="block text-xs font-semibold text-foreground">
            {copy.sidebar.routeXpHintTitle}
          </span>
          <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">
            {copy.sidebar.routeXpHintBody}
          </span>
        </span>
      </div>
    </div>
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
  filter: MarketFilterConfig;
  onSelect: (filter: MarketFilter) => void;
}) {
  const Icon = filter.icon;
  const accent = marketFilterAccentClasses[filter.value];
  const unlocked = isProductTierUnlocked(filter.value, currentLevel);

  return (
    <button
      aria-label={filter.label}
      className={cn(
        "group flex w-full items-center justify-center gap-1 rounded-lg border border-border border-l-[3px] bg-background/55 p-1.5 text-left transition-all duration-200 hover:bg-secondary/60 sm:justify-start sm:gap-2 sm:p-2",
        accent.border,
      )}
      onClick={() => onSelect(filter.value)}
      type="button"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-md border border-white/10 bg-card/80 text-foreground group-hover:text-primary">
        <Icon size={15} />
      </span>
      <span className="hidden min-w-0 flex-1 sm:block">
        <span className="block truncate text-sm font-semibold text-foreground">
          {filter.label}
        </span>
        <span className="mt-0.5 hidden truncate text-[11px] text-muted-foreground xl:block">
          {filter.hint}
        </span>
      </span>
      {unlocked ? (
        <span className={cn("shrink-0 rounded border px-1 py-0.5 text-[10px] font-semibold sm:px-1.5", accent.badge)}>
          {count}
        </span>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1 rounded border border-amber-400/35 bg-amber-400/10 px-1 py-0.5 text-[10px] font-semibold text-amber-200 sm:px-1.5">
          <LockKeyhole size={10} />
          <span className="hidden sm:inline">
            Lv. {PRODUCT_TIER_MIN_LEVEL[filter.value]}
          </span>
        </span>
      )}
    </button>
  );
}

function MarketFilterBrief({
  filter,
}: {
  filter: MarketFilterConfig;
}) {
  const Icon = filter.icon;
  const accent = marketFilterAccentClasses[filter.value];

  return (
    <div className={cn("mb-3 hidden rounded-lg border border-border border-l-[3px] bg-background/60 p-2.5 xl:block", accent.border)}>
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
  const { copy } = useOrdersUi();
  const primaryItem = offer.items[0];
  const primaryColor = primaryItem?.colors[0]?.hexCode ?? "#006D8F";
  const accent = offerAccentClasses[offer.offerType];

  return (
    <button
      aria-label={`${offer.customerName} · ${primaryItem?.productName ?? offer.offerNo}`}
      aria-pressed={selected}
      className={cn(
        "group w-full rounded-lg border border-border border-l-[3px] bg-background/55 p-1 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary/60 sm:p-2.5",
        accent.border,
        selected && "bg-secondary ring-1 ring-primary/50 shadow-[0_0_24px_hsl(var(--primary)/0.16)]",
      )}
      onClick={() => onSelect(offer.id)}
      type="button"
    >
      <div className="flex items-start justify-center gap-2 sm:justify-start">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-lg border text-sm font-semibold"
          style={badgeStyle(primaryColor, selected)}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="hidden min-w-0 flex-1 sm:block">
          <span className="block truncate text-sm font-semibold text-foreground">
            {offer.customerName}
          </span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">
            {offer.isCollection
              ? copy.list.collection(offer.items.length)
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
              {copy.list.delivery(offer.targetDeliveryDay)}
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
  const { copy } = useOrdersUi();

  return (
    <section className={cn("flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border border-t-2 bg-card/70", offerAccentClasses[offer.offerType].border.replace("border-l", "border-t"))}>
      <div className="border-b border-border p-2 sm:p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {copy.detail.selectedOrder}
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-foreground sm:mt-2 sm:text-2xl">
              {offer.customerName}
            </h2>
          </div>
          <Badge className="shrink-0" variant="secondary">
            {offer.offerNo}
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3">
          <InfoPill icon={PackageCheck} label={offer.totalQuantityLabel} />
          <OfferTypeBadge offer={offer} />
          <span className="hidden xl:contents">
            <InfoPill icon={Clock} label={copy.detail.expires(offer.expiresDay)} />
            <InfoPill icon={Factory} label={offer.segmentLabel} />
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
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
              <div className="hidden sm:block">
                <ColorDetails item={activeItem} />
              </div>
            </div>
            {offer.isCollection ? (
              <div className="hidden sm:block">
                <CollectionItems
                  activeItemId={activeItem.id}
                  items={offer.items}
                  onSelect={onActiveItemChange}
                />
              </div>
            ) : null}
          </>
        ) : (
          <p className="rounded-lg border border-border bg-background/60 p-4 text-sm text-muted-foreground">
            {copy.detail.emptyItem}
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
  const { copy } = useOrdersUi();
  const itemCount = items.length;
  const activeItem = items[activeIndex] ?? items[0];
  const selectPrevious = () =>
    onSelect((activeIndex - 1 + itemCount) % itemCount);
  const selectNext = () => onSelect((activeIndex + 1) % itemCount);

  return (
    <div
      aria-label={copy.carousel.ariaLabel}
      className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-border bg-background/60 px-2.5 py-2"
      role="group"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {copy.carousel.title}
        </p>
        <p className="mt-0.5 truncate text-xs font-medium text-foreground">
          {activeIndex + 1} / {itemCount} · {activeItem?.productName}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          aria-label={copy.carousel.previousAria}
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
              aria-label={copy.carousel.itemAria(index + 1, item.productName)}
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
          aria-label={copy.carousel.nextAria}
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
  const { copy } = useOrdersUi();
  const metrics: ProductShowcaseMetric[] = [
    {
      icon: Hash,
      key: "code",
      label: copy.metrics.code,
      value: item.productCode,
    },
    {
      icon: CalendarDays,
      key: "delivery",
      label: copy.metrics.delivery,
      value: offer.deliveryLabel,
    },
    {
      icon: Route,
      key: "route",
      label: copy.metrics.route,
      value: (
        <ProductRouteTimeline
          steps={item.route}
          title={item.routeLabel || "-"}
        />
      ),
    },
    {
      icon: Palette,
      key: "colors",
      label: copy.metrics.colors,
      value: copy.metrics.variants(item.colors.length),
    },
    {
      icon: PackageCheck,
      key: "quantity",
      label: copy.metrics.quantity,
      value: item.quantityLabel,
    },
    {
      icon: Factory,
      key: "segment",
      label: copy.metrics.segment,
      value: offer.segmentLabel,
    },
    {
      icon: Hash,
      key: "volume",
      label: copy.metrics.volume,
      value: offer.volumeLabel,
    },
  ];
  const cardColors = {
    gradientFrom: item.cardGradientFrom,
    gradientTo: item.cardGradientTo,
    primaryColor: item.cardPrimaryColor,
    secondaryColor: item.cardSecondaryColor,
    svgIconAccentColor: item.cardSvgIconAccentColor,
  };

  return (
    <ProductShowcaseCard
      backgroundLayer={
        <ProductLightRaysBackground color={item.cardPrimaryColor} />
      }
      cardColors={cardColors}
      compactMobile
      imageUrl={item.imageUrl}
      metrics={metrics}
      name={item.productName}
    />
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
  const { copy } = useOrdersUi();

  return (
    <div className="mt-2 rounded-lg border border-border bg-background/60 p-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {copy.collectionItemsTitle}
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
  const { copy } = useOrdersUi();

  return (
    <ProductColorChips
      colors={item.colors.map((color) => ({
        hexCode: color.hexCode,
        key: color.id,
        label: color.name,
        quantityLabel: color.quantityLabel,
      }))}
      title={copy.colorDistributionTitle}
    />
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
  const { copy } = useOrdersUi();
  const hasMultipleItems = offer.items.length > 1;
  const isProfitPositive = Number(
    activeItem?.plannedProfitCents ?? offer.plannedProfitCents,
  ) >= 0;

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card/70">
      <div className="border-b border-border p-2 sm:p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          {copy.cost.planTitle}
        </p>
        {hasMultipleItems && activeItem ? (
          <p className="mt-1 truncate text-xs font-medium text-foreground">
            {activeItem.productName}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          {copy.cost.margin}
        </p>
        <h2
          className={cn(
            "mt-2 text-2xl font-semibold",
            isProfitPositive ? "text-emerald-300" : "text-red-300",
          )}
        >
          {activeItem?.plannedMarginLabel ?? offer.plannedMarginLabel}
        </h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
        <div className="grid gap-2">
          <CostPairMetric
            firstLabel={copy.cost.unitPrice}
            firstValue={activeItem?.unitPriceLabel ?? "-"}
            secondLabel={
              hasMultipleItems ? copy.cost.itemTotal : copy.cost.totalRevenue
            }
            secondValue={activeItem?.totalPriceLabel ?? offer.totalRevenueLabel}
          />
          <CostPairMetric
            firstLabel={copy.cost.unitCost}
            firstValue={activeItem?.plannedUnitCostLabel ?? "-"}
            secondLabel={
              hasMultipleItems ? copy.cost.itemCost : copy.cost.totalCost
            }
            secondValue={activeItem?.plannedTotalCostLabel ?? offer.plannedCostLabel}
          />
          <CostPairMetric
            firstLabel={copy.cost.unitProfit}
            firstValue={activeItem?.plannedUnitProfitLabel ?? "-"}
            secondLabel={
              hasMultipleItems ? copy.cost.itemProfit : copy.cost.totalProfit
            }
            secondValue={activeItem?.plannedProfitLabel ?? offer.plannedProfitLabel}
            tone={isProfitPositive ? "profit" : "loss"}
          />
        </div>

        <div className="mt-2 rounded-lg border border-border bg-background/60 p-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{copy.cost.capacityRisk}</span>
            <strong className="text-foreground">{offer.capacityRiskLabel}</strong>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{copy.cost.deliveryRisk}</span>
            <strong className="text-foreground">{offer.deliveryRiskLabel}</strong>
          </div>
        </div>

        <CustomerRelationshipCard offer={offer} />
        <CapacityPlanCard offer={offer} />
        <div className="hidden xl:block">
          <ActiveOrdersSnapshot activeOrders={activeOrders} />
        </div>
        <OrderAcceptPlan offer={offer} />
      </div>
    </aside>
  );
}

function CustomerRelationshipCard({ offer }: { offer: OrderOfferView }) {
  const { copy } = useOrdersUi();
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
              {copy.relationship.title}
            </span>
            <strong className="block text-xs text-foreground">
              {copy.relationship.newCustomer}
            </strong>
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
          {copy.relationship.noHistory}
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
              {copy.relationship.title}
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
          label={copy.relationship.trust}
          value={relationship.relationshipScoreLabel}
        />
        <RelationshipMiniMetric
          label={copy.relationship.history}
          value={copy.relationship.completedWork(relationship.completedOrderCount)}
        />
        <RelationshipMiniMetric
          label="RPT"
          value={relationship.repeatWeightLabel}
        />
      </div>

      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
        {relationship.lateOrderCount > 0
          ? copy.relationship.lateSummary(
              relationship.lateOrderCount,
              relationship.totalLateDays,
            )
          : copy.relationship.onTimeHistory}
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
  const { copy } = useOrdersUi();
  const visibleRows = offer.capacityPlan.rows.slice(0, 5);
  const hiddenCount = Math.max(0, offer.capacityPlan.rows.length - visibleRows.length);

  return (
    <div className="mt-2 rounded-lg border border-border bg-background/60 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {copy.capacity.plannedLoad}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {copy.capacity.bottleneck}:{" "}
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
          label={copy.capacity.current}
          value={offer.capacityPlan.currentLoadDaysLabel}
        />
        <CapacityMiniMetric
          label={copy.capacity.offer}
          value={offer.capacityPlan.offerLoadDaysLabel}
        />
        <CapacityMiniMetric
          label={copy.capacity.targetAfter}
          tone={offer.capacityPlan.state}
          value={offer.capacityPlan.afterAcceptLoadDaysLabel}
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
        <span className="rounded-md border border-border bg-card/50 px-2 py-1 text-muted-foreground">
          {copy.capacity.prediction}:{" "}
          <strong className="text-foreground">
            {offer.capacityPlan.plannedCompletionLabel}
          </strong>
        </span>
        <span className="rounded-md border border-border bg-card/50 px-2 py-1 text-muted-foreground">
          {copy.capacity.deadline}:{" "}
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
              {copy.capacity.hiddenDepartments(hiddenCount)}
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
  const { copy, numberLocale } = useOrdersUi();
  const visibleOrders = activeOrders.slice(0, 3);

  return (
    <div className="mt-2 rounded-lg border border-border bg-background/60 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {copy.activeOrders.title}
        </p>
        <span className="text-[10px] text-muted-foreground">
          {copy.activeOrders.workCount(activeOrders.length)}
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
                  {copy.activeOrders.remaining(
                    order.remainingQuantity.toLocaleString(numberLocale),
                  )}
                </strong>
                {copy.activeOrders.targetDay(order.targetDeliveryDay)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 rounded-md border border-dashed border-border bg-card/40 px-2 py-2 text-[11px] text-muted-foreground">
          {copy.activeOrders.empty}
        </p>
      )}
    </div>
  );
}

function OrderAcceptPlan({ offer }: { offer: OrderOfferView }) {
  const { copy } = useOrdersUi();

  return (
    <form action={acceptMarketOrderAction} className="mt-2 rounded-lg border border-border bg-background/60 p-2.5">
      <input name="offerId" type="hidden" value={offer.id} />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {copy.acceptPlan.title}
      </p>
      <div className="mt-2 space-y-1.5 text-[11px]">
        <AcceptPlanRow
          label={copy.acceptPlan.material}
          value={offer.acceptPlan.materialReadyLabel}
        />
        <AcceptPlanRow
          label={copy.acceptPlan.cutting}
          value={offer.acceptPlan.cuttingStartLabel}
        />
        <AcceptPlanRow
          label={copy.acceptPlan.production}
          value={offer.acceptPlan.productionOrderLabel}
        />
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
  const { copy } = useOrdersUi();
  const { pending } = useFormStatus();

  return (
    <Button className="mt-2 w-full" disabled={pending} size="sm" type="submit">
      <Check size={16} />
      {pending ? copy.acceptButton.pending : copy.acceptButton.idle}
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

function getMarketFilter(
  filter: MarketFilter,
  marketFilters: MarketFilterConfig[],
) {
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
