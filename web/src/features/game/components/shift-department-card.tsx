"use client";

import Image from "next/image";
import { PackageOpen } from "lucide-react";

import CountUp from "@/components/ui/CountUp";

import type { ShiftDepartmentPlayback } from "../types";
import { SHIFT_PLAYBACK_GAME_MINUTES } from "../shift-playback";

export type ShiftDepartmentProductResult = {
  orderCode: string | null;
  orderId: string | null;
  processedQuantity: number;
  productId: string;
  productImageUrl: string | null;
  productName: string;
};

type ActiveProductPreviewState = {
  key: string;
  opacity: number;
  product: ShiftDepartmentProductResult;
  pulseScale: number;
};

export function ShiftDepartmentCard({
  department,
  isFinal,
  producedQuantity,
  productResults,
  queueEnteredQuantity,
  shiftMinute,
  throughputBps,
}: {
  department: ShiftDepartmentPlayback;
  isFinal: boolean;
  producedQuantity: number;
  productResults: ShiftDepartmentProductResult[];
  queueEnteredQuantity: number;
  shiftMinute: number;
  throughputBps: number;
}) {
  const activeProductPreview = isFinal
    ? null
    : getActiveProductPreview({
        department,
        productResults,
        shiftMinute,
      });

  return (
    <article className="min-w-0 rounded-lg border border-white/10 bg-card/80 p-3 shadow-lg backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-white">
          {department.departmentName}
        </h3>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {department.activeLineCount} hat
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="grid grid-cols-2 gap-3">
          <Metric
            isFinal={isFinal}
            label="Kuyruğa giren"
            value={queueEnteredQuantity}
          />
          <Metric
            isFinal={isFinal}
            label="Çıkan"
            value={producedQuantity}
          />
        </div>
        <DepartmentPerformance
          isFinal={isFinal}
          throughputBps={throughputBps}
        />
      </div>

      {activeProductPreview ? (
        <ActiveProductPreview
          key={activeProductPreview.key}
          preview={activeProductPreview}
        />
      ) : null}

      {isFinal && productResults.length > 0 ? (
        <div className="mt-3 border-t border-white/8 pt-2">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            İşlenen ürünler
          </p>
          <div className="space-y-1.5">
            {productResults.map((product) => (
              <div
                className="flex items-center justify-between gap-2 rounded-md bg-background/45 px-2 py-1.5 text-xs"
                key={`${product.orderId ?? "no-order"}:${product.productId}`}
              >
                <ProductThumb
                  imageUrl={product.productImageUrl}
                  name={product.productName}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">
                    {product.productName}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    Sipariş: {product.orderCode ?? "-"}
                  </p>
                </div>
                <span className="shrink-0 font-mono tabular-nums text-emerald-300">
                  {formatQuantity(product.processedQuantity)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ActiveProductPreview({
  preview,
}: {
  preview: ActiveProductPreviewState;
}) {
  const { product } = preview;

  return (
    <div
      aria-label={`Aktif ürün: ${product.productName}`}
      aria-live="polite"
      className="mt-3 border-t border-white/8 pt-2"
      style={{ opacity: preview.opacity }}
    >
      <div className="flex min-h-[72px] items-center gap-3 rounded-md bg-background/35 px-2 py-2 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-100">
        <ProductThumb
          imageUrl={product.productImageUrl}
          name={product.productName}
          pulseScale={preview.pulseScale}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {product.productName}
          </p>
          <p className="mt-1 truncate text-[10px] text-muted-foreground">
            Sipariş: {product.orderCode ?? "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProductThumb({
  imageUrl,
  name,
  pulseScale = 1,
  size,
}: {
  imageUrl: string | null;
  name: string;
  pulseScale?: number;
  size: "sm" | "lg";
}) {
  const dimensions =
    size === "lg"
      ? "size-16 rounded-lg"
      : "size-9 rounded-md";
  const imagePadding = size === "lg" ? "p-1.5" : "p-1";
  const imageSizes = size === "lg" ? "64px" : "36px";

  return (
    <div
      className={`relative shrink-0 overflow-hidden border border-white/10 bg-card/70 shadow-sm transition-transform duration-150 ease-out ${dimensions}`}
      style={{ transform: `scale(${pulseScale})` }}
    >
      {imageUrl ? (
        <Image
          alt={name}
          className={`object-contain ${imagePadding}`}
          fill
          sizes={imageSizes}
          src={imageUrl}
        />
      ) : (
        <span className="grid size-full place-items-center text-primary">
          <PackageOpen size={size === "lg" ? 22 : 16} />
        </span>
      )}
    </div>
  );
}

function getActiveProductPreview({
  department,
  productResults,
  shiftMinute,
}: {
  department: ShiftDepartmentPlayback;
  productResults: ShiftDepartmentProductResult[];
  shiftMinute: number;
}): ActiveProductPreviewState | null {
  const totalQuantity = productResults.reduce(
    (total, product) => total + Math.max(0, product.processedQuantity),
    0,
  );

  if (totalQuantity <= 0) return null;

  const productionStartMinute = Math.max(
    0,
    department.productionStartMinute ?? 0,
  );
  const productionEndMinute = Math.min(
    SHIFT_PLAYBACK_GAME_MINUTES,
    Math.max(
      productionStartMinute + 1,
      department.productionEndMinute ?? SHIFT_PLAYBACK_GAME_MINUTES,
    ),
  );

  if (shiftMinute < productionStartMinute || shiftMinute >= productionEndMinute) {
    return null;
  }

  const productionDuration = productionEndMinute - productionStartMinute;
  let segmentStartMinute = productionStartMinute;
  let processedQuantity = 0;

  for (const [index, product] of productResults.entries()) {
    processedQuantity += Math.max(0, product.processedQuantity);

    const segmentEndMinute =
      index === productResults.length - 1
        ? productionEndMinute
        : Math.min(
            productionEndMinute,
            Math.max(
              segmentStartMinute + 1,
              productionStartMinute +
                Math.round((processedQuantity / totalQuantity) * productionDuration),
            ),
          );

    if (shiftMinute >= segmentStartMinute && shiftMinute < segmentEndMinute) {
      const segmentDuration = segmentEndMinute - segmentStartMinute;
      const fadeWindow = Math.max(1, Math.min(8, segmentDuration * 0.12));
      const fadeInProgress =
        (shiftMinute - segmentStartMinute) / Math.max(1, fadeWindow);
      const opacity = Math.max(0, Math.min(1, fadeInProgress));
      const pulseScale = 1 + Math.sin(shiftMinute * 0.12) * 0.035;

      return {
        key: `${product.orderId ?? "no-order"}:${product.productId}`,
        opacity,
        product,
        pulseScale,
      };
    }

    segmentStartMinute = segmentEndMinute;
  }

  return null;
}

function DepartmentPerformance({
  isFinal,
  throughputBps,
}: {
  isFinal: boolean;
  throughputBps: number;
}) {
  const efficiency = Math.round(throughputBps / 100);
  const colorClass =
    efficiency >= 90
      ? "text-emerald-300"
      : efficiency >= 75
        ? "text-yellow-300"
        : efficiency > 50
          ? "text-orange-400"
          : "text-red-400";

  return (
    <div
      aria-label={`Departman randımanı yüzde ${efficiency}`}
      className="flex min-w-[56px] items-center justify-end"
    >
      <span
        className={`flex items-baseline font-mono text-lg font-semibold tabular-nums ${colorClass}`}
      >
        %
        <CountUp
          className="inline-block"
          immediate={isFinal}
          locale="tr-TR"
          value={efficiency}
        />
      </span>
    </div>
  );
}

function Metric({
  isFinal,
  label,
  value,
}: {
  isFinal: boolean;
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <CountUp
        className="block truncate font-mono text-xl font-semibold tabular-nums text-emerald-300"
        immediate={isFinal}
        locale="tr-TR"
        separator="."
        value={value}
      />
    </div>
  );
}

function formatQuantity(quantity: number) {
  return new Intl.NumberFormat("tr-TR").format(quantity);
}
