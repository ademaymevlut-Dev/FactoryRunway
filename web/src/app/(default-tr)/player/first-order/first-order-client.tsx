"use client";

import Image from "next/image";
import {
  useActionState,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Hash,
  PackageCheck,
  Route,
  Tag,
} from "lucide-react";

import {
  acceptFirstOrderAction,
  type FirstOrderAcceptState,
} from "./first-order-actions";
import { GameLocaleSwitcher } from "@/components/game-locale-switcher";
import { useVisualViewportBottomInset } from "@/hooks/use-visual-viewport-bottom-inset";
import type { SupportedLocale } from "@/lib/i18n/locales";
import { firstOrderCopy, type FirstOrderCopy } from "./first-order-copy";

export type FirstOrderView = {
  id: string;
  orderIndex: string;
  customerName: string;
  productName: string;
  productCode: string;
  collectionName: string;
  themeName: string;
  difficultyLabel: string;
  statusLabel: string;
  quantityLabel: string;
  deliveryLabel: string;
  requestedDateLabel: string;
  totalPriceLabel: string;
  unitPriceLabel: string;
  routeLabel: string;
  imageUrl: string | null;
  cardCopy: string[];
  colors: {
    primary: string;
    secondary: string;
    gradientFrom: string;
    gradientTo: string;
    text: string;
    icon: string;
    iconAccent: string;
  };
};

type FirstOrderClientProps = {
  factoryName: string;
  currentDay: number;
  locale: SupportedLocale;
  orders: FirstOrderView[];
};

const dotIndexes = Array.from({ length: 20 }, (_, index) => index);
const initialFirstOrderAcceptState: FirstOrderAcceptState = {
  status: "idle",
  message: "",
};

export function FirstOrderClient({
  factoryName,
  currentDay,
  locale,
  orders,
}: FirstOrderClientProps) {
  const copy = firstOrderCopy[locale];
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedId, setSelectedId] = useState(orders[0]?.id ?? "");
  const [state, formAction, pending] = useActionState(
    acceptFirstOrderAction,
    initialFirstOrderAcceptState,
  );
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedId) ?? orders[0],
    [orders, selectedId],
  );
  const selectedIndex = Math.max(
    0,
    orders.findIndex((order) => order.id === selectedOrder?.id),
  );
  useVisualViewportBottomInset(formRef);

  if (!selectedOrder) {
    return (
      <div className="game-card relative mx-auto grid max-w-2xl gap-3 rounded-[24px] p-6 text-center">
        <GameLocaleSwitcher className="absolute right-4 top-4" locale={locale} />
        <p className="text-xs font-semibold uppercase tracking-[.24em] text-primary">
          {copy.selection.emptyKicker}
        </p>
        <h1 className="text-xl font-semibold text-foreground">{copy.selection.emptyTitle}</h1>
        <p className="text-sm text-muted-foreground">
          {copy.selection.emptyBody}
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="first-order-form game-card relative min-h-dvh w-full max-w-[1080px] overflow-visible rounded-none border-0 bg-card shadow-none md:h-[90dvh] md:max-h-[900px] md:min-h-[640px] md:overflow-hidden md:rounded-[28px] md:border md:shadow-[var(--shadow-md)]"
      ref={formRef}
    >
      <input name="optionId" type="hidden" value={selectedOrder.id} />
      <input name="locale" type="hidden" value={locale} />
      <GameLocaleSwitcher
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 md:top-4"
        locale={locale}
      />
      <div className="pointer-events-none absolute inset-0 bg-background/10" />

      <div className="relative z-10 flex min-h-dvh flex-col gap-5 px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-[calc(env(safe-area-inset-top)+4.5rem)] md:grid md:h-full md:min-h-0 md:grid-cols-1 md:overflow-y-auto md:p-5 lg:grid-cols-[360px_minmax(0,540px)] lg:overflow-hidden lg:p-8">
        <OrderListPanel
          currentDay={currentDay}
          copy={copy}
          factoryName={factoryName}
          onSelect={setSelectedId}
          orders={orders}
          selectedId={selectedOrder.id}
        />
        <SelectedOrderPanel
          order={selectedOrder}
          orderCount={orders.length}
          selectedIndex={selectedIndex}
          pending={pending}
          copy={copy}
          stateMessage={state.status === "error" ? state.message : ""}
        />
      </div>
    </form>
  );
}

function OrderListPanel({
  copy,
  factoryName,
  currentDay,
  orders,
  selectedId,
  onSelect,
}: {
  copy: FirstOrderCopy;
  factoryName: string;
  currentDay: number;
  orders: FirstOrderView[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="flex flex-col md:min-h-0">
      <div className="mb-4 pr-20 md:mb-5 md:pr-0">
        <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-primary">
          {copy.selection.marketKicker}
        </p>
        <h1 className="mt-2 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground md:text-[34px]">
          {copy.selection.title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground md:mt-3">
          {factoryName} · Day {currentDay}
        </p>
      </div>

      <div
        aria-label={copy.selection.offers(orders.length)}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 pr-8 touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:min-h-0 md:flex-1 md:snap-none md:flex-col md:space-y-3 md:overflow-y-auto md:px-0 md:pb-0 md:pr-1"
        role="group"
      >
        {orders.map((order) => (
          <OrderListCard
            key={order.id}
            onSelect={onSelect}
            order={order}
            copy={copy}
            selected={order.id === selectedId}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground md:hidden">
        <span>{copy.selection.compareHint}</span>
        <span>{copy.selection.offers(orders.length)}</span>
      </div>
      <div className="mt-4 hidden rounded-[18px] border border-border bg-secondary/70 p-4 md:block">
        <p className="text-sm font-semibold text-secondary-foreground">
          {copy.selection.footerTitle}
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {copy.selection.footerBody}
        </p>
      </div>
    </aside>
  );
}

function OrderListCard({
  copy,
  order,
  selected,
  onSelect,
}: {
  copy: FirstOrderCopy;
  order: FirstOrderView;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      aria-pressed={selected}
      className="group relative w-full max-w-[340px] shrink-0 snap-center rounded-[22px] border border-border bg-secondary/55 px-3 py-3 text-left transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/35 hover:bg-secondary md:max-w-none md:px-4 md:py-3.5"
      onClick={() => onSelect(order.id)}
      style={selected ? selectedCardStyle(order) : undefined}
      type="button"
    >
      <div className="flex items-center gap-3 md:gap-4">
        <ProductThumb order={order} />
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold md:h-[42px] md:w-[42px] md:text-sm"
          style={indexBadgeStyle(order, selected)}
        >
          {order.orderIndex}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[18px] font-semibold tracking-[-0.01em] text-foreground">
            {order.customerName}
          </span>
          <span className="mt-1 block truncate text-sm text-muted-foreground">
            {order.productName}
          </span>
          <span className="mt-1 block truncate text-xs text-muted-foreground/75">
            {order.quantityLabel} · {copy.selection.deliveryPrefix}: {order.deliveryLabel}
          </span>
        </span>
        <span className="hidden shrink-0 text-right text-[16px] font-semibold tracking-[-0.01em] sm:block" style={{ color: order.colors.primary }}>
          {order.totalPriceLabel}
        </span>
      </div>
    </button>
  );
}

function SelectedOrderPanel({
  copy,
  order,
  orderCount,
  selectedIndex,
  pending,
  stateMessage,
}: {
  copy: FirstOrderCopy;
  order: FirstOrderView;
  orderCount: number;
  selectedIndex: number;
  pending: boolean;
  stateMessage: string;
}) {
  return (
    <section className="flex flex-col md:min-h-0 md:overflow-y-auto md:pr-1">
      <SelectedOrderHeader
        copy={copy}
        order={order}
        orderCount={orderCount}
        selectedIndex={selectedIndex}
      />
      <SelectedOrderChips order={order} />
      <SelectedOrderHero order={order} />
      <SelectedOrderMetaTable copy={copy} order={order} />
      {stateMessage ? (
        <p className="mt-3 rounded-[18px] border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-medium text-red-200">
          {stateMessage}
        </p>
      ) : null}
      <SelectedOrderFooter copy={copy} pending={pending} />
    </section>
  );
}

function SelectedOrderHeader({
  copy,
  order,
  orderCount,
  selectedIndex,
}: {
  copy: FirstOrderCopy;
  order: FirstOrderView;
  orderCount: number;
  selectedIndex: number;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          {copy.selection.selectedKicker}
        </p>
        <h2 className="mt-2 truncate text-[28px] font-semibold leading-none tracking-[-0.03em] text-foreground md:text-[34px]">
          {order.customerName}
        </h2>
      </div>
      <span className="shrink-0 rounded-full border border-border bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground md:px-4 md:text-sm">
        <span className="md:hidden">
          {copy.selection.offerProgress(selectedIndex + 1, orderCount)}
        </span>
        <span className="hidden md:inline">{copy.selection.offers(orderCount)}</span>
      </span>
    </div>
  );
}

function SelectedOrderChips({ order }: { order: FirstOrderView }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 md:mb-4 md:gap-3">
      <span
        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium md:px-4 md:py-2 md:text-sm"
        style={{
          borderColor: rgbaFromHex(order.colors.primary, 0.35),
          backgroundColor: rgbaFromHex(order.colors.primary, 0.12),
          color: order.colors.primary,
        }}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: order.colors.primary }}
        />
        {order.themeName}
      </span>
      <span
        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium text-foreground/75 md:px-4 md:py-2 md:text-sm"
        style={{
          borderColor: rgbaFromHex(order.colors.secondary, 0.3),
          backgroundColor: rgbaFromHex(order.colors.secondary, 0.1),
        }}
      >
        {order.difficultyLabel}
      </span>
    </div>
  );
}

function SelectedOrderHero({ order }: { order: FirstOrderView }) {
  const heroLetter = order.customerName.charAt(0).toUpperCase();

  return (
    <div
      className="relative h-[220px] overflow-hidden rounded-[22px] border bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:h-[255px] md:overflow-visible md:rounded-[26px]"
      style={heroStyle(order)}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.05),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent_55%)] md:rounded-[26px]" />
      <div
        className="pointer-events-none absolute right-[68px] top-[28px] h-[130px] w-[130px] rounded-[58%_42%_47%_53%/40%_51%_49%_60%] opacity-75 blur-[1px] md:right-[124px] md:top-[34px] md:h-[170px] md:w-[170px]"
        style={{
          background: `linear-gradient(135deg, rgba(${hexToRgbString(order.colors.primary)},0.84), rgba(${hexToRgbString(order.colors.primary)},0.34))`,
        }}
      />
      <div
        className="pointer-events-none absolute right-[12px] top-[36px] h-[124px] w-[138px] rotate-[18deg] rounded-[30px] opacity-70 md:right-[22px] md:top-[44px] md:h-[164px] md:w-[178px] md:rounded-[38px]"
        style={{
          background: `linear-gradient(135deg, rgba(${hexToRgbString(order.colors.secondary)},0.78), rgba(${hexToRgbString(order.colors.secondary)},0.32))`,
        }}
      />
      <div className="pointer-events-none absolute left-5 top-5 grid grid-cols-5 gap-2.5 opacity-40 md:left-[26px] md:top-[28px] md:gap-3">
        {dotIndexes.map((index) => (
          <span
            key={index}
            className="h-[3px] w-[3px] rounded-full"
            style={{ backgroundColor: rgbaFromHex(order.colors.iconAccent, 0.72) }}
          />
        ))}
      </div>
      <span
        className="pointer-events-none absolute left-5 top-8 text-[56px] font-light tracking-[-0.04em] md:left-7 md:top-10 md:text-[72px]"
        style={{ color: rgbaFromHex(order.colors.text, 0.14) }}
      >
        {heroLetter}
      </span>

      <div className="absolute bottom-5 left-5 z-[3] max-w-[44%] md:bottom-7 md:left-7 md:max-w-none">
        <p
          className="mb-1 max-w-full truncate text-[9px] font-semibold uppercase tracking-[0.16em] md:max-w-[240px] md:text-[10px] md:tracking-[0.18em]"
          style={{ color: rgbaFromHex(order.colors.text, 0.66) }}
        >
          {order.productCode}
        </p>
        <h3
          className="max-w-full text-[16px] font-semibold leading-[1.1] tracking-[-0.01em] md:max-w-[240px] md:text-[18px]"
          style={{ color: order.colors.text }}
        >
          {order.productName}
        </h3>
        <div
          className="mt-4 h-[3px] w-10 rounded-full"
          style={{ backgroundColor: order.colors.primary }}
        />
      </div>

      {order.imageUrl ? (
        <>
          <span className="pointer-events-none absolute inset-y-2 right-0 z-[4] w-[60%] md:hidden">
            <Image
              alt={order.productName}
              className="object-contain object-bottom drop-shadow-[0_18px_28px_rgba(0,0,0,0.38)]"
              fill
              priority
              sizes="60vw"
              src={order.imageUrl}
            />
          </span>
          <span
            className="pointer-events-none absolute bottom-[-24px] right-[-8px] z-[4] hidden h-[350px] w-[66%] md:block"
            style={{ clipPath: "inset(-120px 0 24px 0)" }}
          >
            <Image
              alt={order.productName}
              className="object-contain object-bottom drop-shadow-[0_24px_40px_rgba(0,0,0,0.42)]"
              fill
              priority
              sizes="(min-width: 1024px) 320px, 58vw"
              src={order.imageUrl}
            />
          </span>
        </>
      ) : (
        <div
          className="pointer-events-none absolute right-5 top-12 z-[4] grid size-32 place-items-center rounded-[28px] border bg-background/20 md:right-8 md:top-14 md:size-40 md:rounded-[34px]"
          style={{
            borderColor: rgbaFromHex(order.colors.primary, 0.16),
            color: rgbaFromHex(order.colors.text, 0.35),
          }}
        >
          <PackageCheck size={54} />
        </div>
      )}
    </div>
  );
}

function SelectedOrderMetaTable({
  copy,
  order,
}: {
  copy: FirstOrderCopy;
  order: FirstOrderView;
}) {
  return (
    <>
      <div className="mt-3 md:hidden">
        <div className="grid grid-cols-2 gap-2">
          <MobileMetric icon={PackageCheck} label={copy.selection.meta.quantity} order={order} value={order.quantityLabel} />
          <MobileMetric icon={CalendarDays} label={copy.selection.deliveryPrefix} order={order} value={order.deliveryLabel} />
          <MobileMetric accent icon={CircleDollarSign} label={copy.selection.meta.totalPrice} order={order} value={order.totalPriceLabel} />
          <MobileMetric icon={Tag} label={copy.selection.meta.unitPrice} order={order} value={order.unitPriceLabel} />
        </div>
        <details className="group mt-2 overflow-hidden rounded-[18px] border border-border bg-card">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            {copy.selection.details}
            <span className="text-lg leading-none text-muted-foreground transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="border-t border-border">
            <MetaRow icon={Hash} label={copy.selection.meta.code} order={order} value={order.productCode} />
            <MetaRow icon={CalendarDays} label={copy.selection.meta.requestedDate} order={order} value={order.requestedDateLabel} />
            <MetaRow icon={Route} label={copy.selection.meta.route} order={order} value={order.routeLabel} />
          </div>
        </details>
      </div>
      <div className="mt-3 hidden overflow-hidden rounded-[18px] border border-border bg-card md:block">
        <MetaRow accent icon={Hash} label={copy.selection.meta.code} order={order} value={order.productCode} />
        <MetaRow icon={CalendarDays} label={copy.selection.meta.requestedDate} order={order} value={order.requestedDateLabel} />
        <MetaRow accent icon={PackageCheck} label={copy.selection.meta.quantity} order={order} value={order.quantityLabel} />
        <MetaRow icon={Tag} label={copy.selection.meta.unitPrice} order={order} value={order.unitPriceLabel} />
        <MetaRow accent icon={CircleDollarSign} label={copy.selection.meta.totalPrice} order={order} value={order.totalPriceLabel} />
        <MetaRow icon={Route} label={copy.selection.meta.route} order={order} value={order.routeLabel} />
      </div>
    </>
  );
}

function MobileMetric({
  icon: Icon,
  label,
  value,
  order,
  accent = false,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
  order: FirstOrderView;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-[16px] border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon size={15} style={{ color: accent ? order.colors.primary : order.colors.icon }} />
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.08em]">{label}</span>
      </div>
      <p
        className="mt-2 truncate text-[14px] font-semibold tracking-[-0.01em]"
        style={{ color: accent ? order.colors.primary : undefined }}
      >
        {value}
      </p>
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
  order,
  accent = false,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
  order: FirstOrderView;
  accent?: boolean;
}) {
  const iconColor = order.colors.icon;
  const iconAccentColor = order.colors.iconAccent;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
          style={{
            backgroundColor: rgbaFromHex(iconAccentColor, accent ? 0.2 : 0.13),
            borderColor: rgbaFromHex(iconAccentColor, accent ? 0.36 : 0.22),
            color: iconColor,
          }}
        >
          <Icon size={16} />
        </span>
        <span className="text-[13px] text-muted-foreground">{label}</span>
      </div>
      <span
        className="max-w-[58%] truncate text-right text-[13px] font-semibold tracking-[-0.01em]"
        style={{ color: accent ? order.colors.primary : undefined }}
      >
        {value}
      </span>
    </div>
  );
}

function SelectedOrderFooter({
  copy,
  pending,
}: {
  copy: FirstOrderCopy;
  pending: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-[var(--visual-viewport-bottom,0px)] z-20 mt-4 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl md:static md:mt-3 md:flex md:justify-end md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
      <button
        className="game-button-primary min-h-12 w-full rounded-full px-5 text-sm shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-60 md:min-h-10 md:w-auto"
        disabled={pending}
        type="submit"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
          {pending ? <CheckCircle2 size={15} /> : <Check size={15} />}
        </span>
        {pending ? copy.selection.preparing : copy.selection.accept}
      </button>
    </div>
  );
}

function ProductThumb({ order }: { order: FirstOrderView }) {
  return (
    <span
      className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-[16px] border bg-card md:h-[58px] md:w-[58px] md:rounded-[18px]"
      style={{
        borderColor: rgbaFromHex(order.colors.primary, 0.18),
        background: `linear-gradient(135deg, ${rgbaFromHex(order.colors.gradientFrom, 0.54)}, ${rgbaFromHex(order.colors.gradientTo, 0.42)})`,
      }}
    >
      {order.imageUrl ? (
        <Image
          alt=""
          aria-hidden="true"
          className="object-contain p-2"
          fill
          sizes="58px"
          src={order.imageUrl}
        />
      ) : (
        <PackageCheck size={24} style={{ color: rgbaFromHex(order.colors.text, 0.35) }} />
      )}
    </span>
  );
}

function selectedCardStyle(order: FirstOrderView): CSSProperties {
  return {
    borderColor: rgbaFromHex(order.colors.primary, 0.58),
    background: `linear-gradient(180deg, ${rgbaFromHex(order.colors.primary, 0.11)}, rgba(255,255,255,0.025))`,
    boxShadow: `0 0 0 1px ${rgbaFromHex(order.colors.primary, 0.22)}, 0 0 30px ${rgbaFromHex(order.colors.primary, 0.16)}`,
  };
}

function indexBadgeStyle(order: FirstOrderView, selected: boolean): CSSProperties {
  return {
    borderColor: rgbaFromHex(order.colors.primary, selected ? 0.72 : 0.4),
    color: selected ? order.colors.primary : "rgba(255,255,255,0.72)",
    backgroundColor: selected
      ? rgbaFromHex(order.colors.primary, 0.11)
      : "rgba(255,255,255,0.035)",
  };
}

function heroStyle(order: FirstOrderView): CSSProperties {
  const gradientFromRgb = hexToRgbString(order.colors.gradientFrom);
  const gradientToRgb = hexToRgbString(order.colors.gradientTo);

  return {
    background: [
      `radial-gradient(circle at 88% 92%, rgba(${gradientToRgb}, 0.42), transparent 46%)`,
      `radial-gradient(circle at 14% 12%, rgba(${gradientFromRgb}, 0.24), transparent 38%)`,
      `linear-gradient(to top left, ${order.colors.gradientTo} 0%, ${order.colors.gradientFrom} 100%)`,
    ].join(", "),
    borderColor: rgbaFromHex(order.colors.primary, 0.22),
  };
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const normalized = clean.length === 3
    ? clean.split("").map((char) => `${char}${char}`).join("")
    : clean;
  const bigint = Number.parseInt(normalized || "ffffff", 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

function hexToRgbString(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}

function rgbaFromHex(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
