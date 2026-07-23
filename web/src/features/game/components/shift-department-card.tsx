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
    <article className="min-w-0 rounded-lg border border-white/10 bg-card/80 p-2 shadow-lg backdrop-blur xl:p-3">
      <div className="mb-2 flex items-center justify-between gap-2 xl:mb-3">
        <h3 className="truncate text-xs font-semibold text-white xl:text-sm">
          {department.departmentName}
        </h3>
        <span className="shrink-0 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground xl:text-[10px]">
          {department.activeLineCount} hat
        </span>
      </div>

      <div className="grid gap-2 lg:grid-cols-[1fr_auto] xl:gap-3">
        <div className="grid grid-cols-2 gap-2 xl:gap-3">
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
        <div className="mt-2 border-t border-white/8 pt-1.5 xl:mt-3 xl:pt-2">
          <p className="mb-1.5 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground xl:mb-2 xl:text-[9px]">
            İşlenen ürünler
          </p>
          <div className="space-y-1 xl:space-y-1.5">
            {productResults.map((product) => (
              <div
                className="flex items-center justify-between gap-1.5 rounded-md bg-background/45 px-1.5 py-1 text-[10px] xl:gap-2 xl:px-2 xl:py-1.5 xl:text-xs"
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
                  <p className="truncate text-[8px] text-muted-foreground xl:text-[10px]">
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
      className="mt-2 border-t border-white/8 pt-1.5 xl:mt-3 xl:pt-2"
      style={{ opacity: preview.opacity }}
    >
      <div className="flex min-h-12 items-center gap-2 rounded-md bg-background/35 px-1.5 py-1.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-100 xl:min-h-[72px] xl:gap-3 xl:px-2 xl:py-2">
        <ProductThumb
          imageUrl={product.productImageUrl}
          name={product.productName}
          pulseScale={preview.pulseScale}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white xl:text-sm">
            {product.productName}
          </p>
          <p className="mt-0.5 truncate text-[8px] text-muted-foreground xl:mt-1 xl:text-[10px]">
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
      ? "size-10 rounded-md xl:size-16 xl:rounded-lg"
      : "size-7 rounded-md xl:size-9";
  const imagePadding = size === "lg" ? "p-1 xl:p-1.5" : "p-0.5 xl:p-1";
  const imageSizes = size === "lg" ? "(min-width: 1280px) 64px, 40px" : "(min-width: 1280px) 36px, 28px";

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
          <PackageOpen
            className={size === "lg" ? "size-4 xl:size-[22px]" : "size-3.5 xl:size-4"}
          />
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
      className="flex min-w-10 items-center justify-end xl:min-w-[56px]"
    >
      <span
        className={`flex items-baseline font-mono text-base font-semibold tabular-nums xl:text-lg ${colorClass}`}
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
      <p className="truncate text-[8px] font-semibold uppercase tracking-wider text-muted-foreground xl:text-[9px]">
        {label}
      </p>
      <CountUp
        className="block truncate font-mono text-base font-semibold tabular-nums text-emerald-300 xl:text-xl"
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
