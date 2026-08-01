"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import {
  ArrowLeft,
  Gem,
  LockKeyhole,
  PackageCheck,
  Route,
  Shirt,
  StarCheck,
  TagPlus,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SupportedLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import { ordersCopy } from "../orders-copy";
import {
  PRODUCT_TIER_MIN_LEVEL,
  isProductTierUnlocked,
  type ProductTier,
} from "../product-tier-rules";
import type { OrderMarketView, OrderOfferView } from "../types";
import { OrderDecisionWorkspace } from "./order-decision-workspace";
import { OrdersUiProvider, useOrdersUi } from "./orders-ui-context";
import { useOrdersPanelMode } from "./use-orders-panel-mode";

type MarketFilter = ProductTier;
type CompactOrdersView = "DETAIL" | "MARKET";
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

export function OrdersPanel({
  locale,
  orderMarket,
}: {
  locale: SupportedLocale;
  orderMarket: OrderMarketView;
}) {
  return (
    <OrdersUiProvider locale={locale}>
      <OrdersPanelContent orderMarket={orderMarket} />
    </OrdersUiProvider>
  );
}

function OrdersPanelContent({ orderMarket }: { orderMarket: OrderMarketView }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const compactBackButtonRef = useRef<HTMLButtonElement>(null);
  const selectedOfferButtonRef = useRef<HTMLButtonElement>(null);
  const [selectedFilter, setSelectedFilter] = useState<MarketFilter | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [compactView, setCompactView] =
    useState<CompactOrdersView>("MARKET");
  const { mode: panelMode, revision: panelModeRevision } =
    useOrdersPanelMode(panelRef);
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
    setCompactView("MARKET");
  };
  const resetFilter = () => {
    setSelectedFilter(null);
    setSelectedId("");
    setCompactView("MARKET");
  };
  const selectOffer = (id: string) => {
    setSelectedId(id);

    if (panelMode === "COMPACT") {
      setCompactView("DETAIL");
      focusOnNextFrame(compactBackButtonRef);
    }
  };
  const showCompactMarket = () => {
    setCompactView("MARKET");
    focusOnNextFrame(selectedOfferButtonRef);
  };
  const selectedTierUnlocked = selectedFilter
    ? isProductTierUnlocked(selectedFilter, orderMarket.currentLevel)
    : false;

  return (
    <div
      className="orders-panel-root flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
      data-compact-view={compactView}
      data-orders-panel-mode={panelMode}
      ref={panelRef}
    >
      <div
        className="orders-responsive-layout grid min-h-0 min-w-0 flex-1 gap-2 overflow-hidden"
        data-orders-responsive-shell="true"
      >
        <div className="orders-market-view min-h-0 min-w-0">
          <OrderSidebarPanel
            currentLevel={orderMarket.currentLevel}
            offers={filteredOffers}
            onBack={resetFilter}
            onSelect={selectOffer}
            onSelectFilter={selectFilter}
            selectedFilter={selectedFilter}
            selectedId={selectedOffer?.id ?? ""}
            selectedOfferButtonRef={selectedOfferButtonRef}
            sourceOffers={orderMarket.offers}
          />
        </div>
        <main className="orders-detail-view min-h-0 min-w-0 overflow-hidden">
          {selectedFilter === null ? (
            <OrdersEmptyState availableCount={orderMarket.availableCount} />
          ) : !selectedTierUnlocked ? (
            <LockedProductTierState
              currentLevel={orderMarket.currentLevel}
              tier={selectedFilter}
            />
          ) : selectedOffer ? (
            <OrderDecisionWorkspace
              activeOrders={orderMarket.activeOrders}
              compactBackButtonRef={compactBackButtonRef}
              key={selectedOffer.id}
              offer={selectedOffer}
              onCompactBack={showCompactMarket}
              panelMode={panelMode}
              panelModeRevision={panelModeRevision}
            />
          ) : (
            <ProductTierEmptyState tier={selectedFilter} />
          )}
        </main>
      </div>
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
  selectedOfferButtonRef,
}: {
  currentLevel: number;
  offers: OrderOfferView[];
  sourceOffers: OrderOfferView[];
  selectedFilter: MarketFilter | null;
  selectedId: string;
  onSelect: (id: string) => void;
  onBack: () => void;
  onSelectFilter: (filter: MarketFilter) => void;
  selectedOfferButtonRef: RefObject<HTMLButtonElement | null>;
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
    <aside className="orders-sidebar flex h-full min-h-0 flex-col rounded-lg border border-border bg-card/70 p-2.5">
      <div className="mb-2 sm:mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
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
        <div className="min-h-0 flex-1 touch-pan-y space-y-2 overflow-y-auto overscroll-contain pr-1">
          {offers.length > 0 ? (
            offers.map((offer) => (
              <OrderListCard
                key={offer.id}
                offer={offer}
                onSelect={onSelect}
                selected={offer.id === selectedId}
                buttonRef={
                  offer.id === selectedId ? selectedOfferButtonRef : undefined
                }
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
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {filter.label}
        </span>
        <span className="mt-0.5 hidden truncate text-[11px] text-muted-foreground xl:block">
          {filter.hint}
        </span>
      </span>
      {unlocked ? (
        <span
          className={cn(
            "shrink-0 rounded border px-1 py-0.5 text-[10px] font-semibold sm:px-1.5",
            accent.badge,
          )}
        >
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

function MarketFilterBrief({ filter }: { filter: MarketFilterConfig }) {
  const Icon = filter.icon;
  const accent = marketFilterAccentClasses[filter.value];

  return (
    <div
      className={cn(
        "mb-3 hidden rounded-lg border border-border border-l-[3px] bg-background/60 p-2.5 xl:block",
        accent.border,
      )}
    >
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
  buttonRef,
  offer,
  selected,
  onSelect,
}: {
  buttonRef?: RefObject<HTMLButtonElement | null>;
  offer: OrderOfferView;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { copy } = useOrdersUi();
  const primaryItem = offer.items[0];
  const accent = offerAccentClasses[offer.offerType];

  return (
    <button
      aria-label={`${offer.customerName} · ${primaryItem?.productName ?? offer.offerNo}`}
      aria-pressed={selected}
      className={cn(
        "group w-full rounded-lg border border-border border-l-[3px] bg-background/55 p-1.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary/60 sm:p-2.5",
        accent.border,
        selected &&
          "bg-secondary shadow-[0_0_24px_hsl(var(--primary)/0.16)] ring-1 ring-primary/50",
      )}
      onClick={() => onSelect(offer.id)}
      ref={buttonRef}
      type="button"
    >
      <span className="block min-w-0">
        <span className="block truncate text-[11px] font-semibold text-foreground sm:text-sm">
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
        <span className="mt-2 flex min-w-0 items-end justify-between gap-3">
          <span className="orders-compact-offer-delivery min-w-0 truncate text-[11px] text-muted-foreground">
            {copy.list.delivery(offer.targetDeliveryDay)}
          </span>
          <span className="ml-auto block whitespace-nowrap text-right text-[10px] font-semibold tabular-nums text-primary sm:text-sm">
            {offer.totalRevenueLabel}
          </span>
        </span>
      </span>
    </button>
  );
}

function focusOnNextFrame(ref: RefObject<HTMLElement | null>) {
  requestAnimationFrame(() => ref.current?.focus());
}

function OfferTypeBadge({ offer }: { offer: OrderOfferView }) {
  return (
    <span
      className={cn(
        "inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold",
        offerAccentClasses[offer.offerType].badge,
      )}
    >
      {offer.offerTypeLabel}
    </span>
  );
}

function getMarketFilters(locale: SupportedLocale): MarketFilterConfig[] {
  const filterCopy = ordersCopy[locale].filters;

  return marketFilterOrder.map((value) => ({
    ...filterCopy[value],
    icon: marketFilterIcons[value],
    value,
  }));
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
