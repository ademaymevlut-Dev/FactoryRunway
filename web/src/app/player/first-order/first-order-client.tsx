"use client";

import Image from "next/image";
import { useActionState, useMemo, useState, type CSSProperties } from "react";
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
  orders,
}: FirstOrderClientProps) {
  const [selectedId, setSelectedId] = useState(orders[0]?.id ?? "");
  const [state, formAction, pending] = useActionState(
    acceptFirstOrderAction,
    initialFirstOrderAcceptState,
  );
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedId) ?? orders[0],
    [orders, selectedId],
  );

  if (!selectedOrder) {
    return (
      <div className="game-card relative mx-auto grid max-w-2xl gap-3 rounded-[24px] p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[.24em] text-primary">
          ORDER MARKET
        </p>
        <h1 className="text-xl font-semibold text-foreground">İlk sipariş bulunamadı</h1>
        <p className="text-sm text-muted-foreground">
          Admin panelinden bu sektör için 3 aktif ilk sipariş ürünü tanımlandığında bu ekran açılacak.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="game-card relative h-[90dvh] max-h-[900px] min-h-[640px] w-full max-w-[1080px] overflow-hidden rounded-[28px] bg-card"
    >
      <input name="optionId" type="hidden" value={selectedOrder.id} />
      <div className="pointer-events-none absolute inset-0 bg-background/10" />

      <div className="relative z-10 grid h-full grid-cols-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[360px_minmax(0,540px)] lg:overflow-hidden lg:p-8">
        <OrderListPanel
          currentDay={currentDay}
          factoryName={factoryName}
          onSelect={setSelectedId}
          orders={orders}
          selectedId={selectedOrder.id}
        />
        <SelectedOrderPanel
          order={selectedOrder}
          orderCount={orders.length}
          pending={pending}
          stateMessage={state.status === "error" ? state.message : ""}
        />
      </div>
    </form>
  );
}

function OrderListPanel({
  factoryName,
  currentDay,
  orders,
  selectedId,
  onSelect,
}: {
  factoryName: string;
  currentDay: number;
  orders: FirstOrderView[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col">
      <div className="mb-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-primary">
          ORDER MARKET
        </p>
        <h1 className="mt-2 text-[34px] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground">
          İlk Siparişini Seç
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {factoryName} · Day {currentDay}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {orders.map((order) => (
          <OrderListCard
            key={order.id}
            onSelect={onSelect}
            order={order}
            selected={order.id === selectedId}
          />
        ))}
      </div>
      <div className="mt-4 rounded-[18px] border border-border bg-secondary/70 p-4">
        <p className="text-sm font-semibold text-secondary-foreground">
          Sipariş seçilirse üretim emri hazırlanacak.
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Kabulden sonra ilk 3 günlük simülasyon akışına geçeceğiz.
        </p>
      </div>
    </aside>
  );
}

function OrderListCard({
  order,
  selected,
  onSelect,
}: {
  order: FirstOrderView;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      aria-pressed={selected}
      className="group relative w-full rounded-[22px] border border-border bg-secondary/55 px-4 py-3.5 text-left transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/35 hover:bg-secondary"
      onClick={() => onSelect(order.id)}
      style={selected ? selectedCardStyle(order) : undefined}
      type="button"
    >
      <div className="flex items-center gap-4">
        <ProductThumb order={order} />
        <span
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border text-sm font-semibold"
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
            {order.quantityLabel} · Teslim: {order.deliveryLabel}
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
  order,
  orderCount,
  pending,
  stateMessage,
}: {
  order: FirstOrderView;
  orderCount: number;
  pending: boolean;
  stateMessage: string;
}) {
  return (
    <section className="flex min-h-0 flex-col overflow-y-auto pr-1">
      <SelectedOrderHeader order={order} orderCount={orderCount} />
      <SelectedOrderChips order={order} />
      <SelectedOrderHero order={order} />
      <SelectedOrderMetaTable order={order} />
      {stateMessage ? (
        <p className="mt-3 rounded-[18px] border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-medium text-red-200">
          {stateMessage}
        </p>
      ) : null}
      <SelectedOrderFooter pending={pending} />
    </section>
  );
}

function SelectedOrderHeader({
  order,
  orderCount,
}: {
  order: FirstOrderView;
  orderCount: number;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          SEÇİLİ SİPARİŞ
        </p>
        <h2 className="mt-2 truncate text-[34px] font-semibold leading-none tracking-[-0.03em] text-foreground">
          {order.customerName}
        </h2>
      </div>
      <span className="shrink-0 rounded-full border border-border bg-secondary px-4 py-2 text-sm text-muted-foreground">
        {orderCount} teklif
      </span>
    </div>
  );
}

function SelectedOrderChips({ order }: { order: FirstOrderView }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
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
        className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium text-foreground/75"
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
      className="relative h-[255px] overflow-visible rounded-[26px] border bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
      style={heroStyle(order)}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[26px] bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.05),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent_55%)]" />
      <div
        className="pointer-events-none absolute right-[124px] top-[34px] h-[170px] w-[170px] rounded-[58%_42%_47%_53%/40%_51%_49%_60%] opacity-75 blur-[1px]"
        style={{
          background: `linear-gradient(135deg, rgba(${hexToRgbString(order.colors.primary)},0.84), rgba(${hexToRgbString(order.colors.primary)},0.34))`,
        }}
      />
      <div
        className="pointer-events-none absolute right-[22px] top-[44px] h-[164px] w-[178px] rotate-[18deg] rounded-[38px] opacity-70"
        style={{
          background: `linear-gradient(135deg, rgba(${hexToRgbString(order.colors.secondary)},0.78), rgba(${hexToRgbString(order.colors.secondary)},0.32))`,
        }}
      />
      <div className="pointer-events-none absolute left-[26px] top-[28px] grid grid-cols-5 gap-3 opacity-40">
        {dotIndexes.map((index) => (
          <span
            key={index}
            className="h-[3px] w-[3px] rounded-full"
            style={{ backgroundColor: rgbaFromHex(order.colors.iconAccent, 0.72) }}
          />
        ))}
      </div>
      <span
        className="pointer-events-none absolute left-7 top-10 text-[72px] font-light tracking-[-0.04em]"
        style={{ color: rgbaFromHex(order.colors.text, 0.14) }}
      >
        {heroLetter}
      </span>

      <div className="absolute bottom-7 left-7 z-[3]">
        <p
          className="mb-1 max-w-[240px] truncate text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: rgbaFromHex(order.colors.text, 0.66) }}
        >
          {order.productCode}
        </p>
        <h3
          className="max-w-[240px] text-[18px] font-semibold leading-[1.1] tracking-[-0.01em]"
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
        <span
          className="pointer-events-none absolute bottom-[-24px] right-[-8px] z-[4] h-[350px] w-[66%]"
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
      ) : (
        <div
          className="pointer-events-none absolute right-8 top-14 z-[4] grid size-40 place-items-center rounded-[34px] border bg-background/20"
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

function SelectedOrderMetaTable({ order }: { order: FirstOrderView }) {
  return (
    <div className="mt-3 overflow-hidden rounded-[18px] border border-border bg-card">
      <MetaRow accent icon={Hash} label="Kod" order={order} value={order.productCode} />
      <MetaRow icon={CalendarDays} label="İstenen Tarih" order={order} value={order.requestedDateLabel} />
      <MetaRow accent icon={PackageCheck} label="Sipariş Adedi" order={order} value={order.quantityLabel} />
      <MetaRow icon={Tag} label="Birim Fiyat" order={order} value={order.unitPriceLabel} />
      <MetaRow accent icon={CircleDollarSign} label="Sipariş Tutarı" order={order} value={order.totalPriceLabel} />
      <MetaRow icon={Route} label="Üretim Rotası" order={order} value={order.routeLabel} />
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

function SelectedOrderFooter({ pending }: { pending: boolean }) {
  return (
    <div className="mt-3 flex justify-end">
      <button
        className="game-button-primary min-h-10 rounded-full px-5 text-sm shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
          {pending ? <CheckCircle2 size={15} /> : <Check size={15} />}
        </span>
        {pending ? "Hazırlanıyor..." : "Siparişi kabul et"}
      </button>
    </div>
  );
}

function ProductThumb({ order }: { order: FirstOrderView }) {
  return (
    <span
      className="relative flex h-[58px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-[18px] border bg-card"
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
