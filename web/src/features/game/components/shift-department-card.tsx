"use client";

import {
  ShiftDepartmentResultView,
  type ShiftDepartmentResultTone,
} from "@/components/game-presentation/shift-department-result-view";
import {
  numberLocale as resolveNumberLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales";

import type { ShiftDepartmentPlayback } from "../types";
import { SHIFT_PLAYBACK_GAME_MINUTES } from "../shift-playback";
import { shiftPlaybackCopy } from "../shift-playback-copy";

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
  locale,
  presentation = "default",
  producedQuantity,
  productResults,
  queueEnteredQuantity,
  shiftMinute,
  throughputBps,
}: {
  department: ShiftDepartmentPlayback;
  isFinal: boolean;
  locale: SupportedLocale;
  presentation?: "default" | "mobileCompact";
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
  const utilizationPercent = Math.round(throughputBps / 100);
  const copy = shiftPlaybackCopy[locale].hud;
  const numberLocale = resolveNumberLocale(locale);
  const isMobileCompact = presentation === "mobileCompact";

  return (
    <ShiftDepartmentResultView
      activeLineLabel={copy.activeLineLabel(department.activeLineCount)}
      activeProduct={
        activeProductPreview
          ? {
              ariaLabel: copy.activeProductAria(
                activeProductPreview.product.productName,
              ),
              imageUrl: activeProductPreview.product.productImageUrl,
              key: activeProductPreview.key,
              name: activeProductPreview.product.productName,
              opacity: activeProductPreview.opacity,
              orderLabel: copy.orderLabel(
                activeProductPreview.product.orderCode,
              ),
              pulseScale: activeProductPreview.pulseScale,
            }
          : null
      }
      departmentLabel={department.departmentName}
      isFinal={isFinal}
      metrics={
        isMobileCompact
          ? [
              {
                key: "produced",
                label: copy.mobileProducedLabel,
                value: producedQuantity,
              },
            ]
          : [
              {
                key: "queue-entered",
                label: copy.metrics.queueEntered,
                value: queueEnteredQuantity,
              },
              {
                key: "produced",
                label: copy.metrics.produced,
                value: producedQuantity,
              },
            ]
      }
      numberLocale={numberLocale}
      presentation={presentation}
      processedProductsLabel={copy.processedProductsLabel}
      products={
        isMobileCompact
          ? []
          : productResults.map((product) => ({
              imageUrl: product.productImageUrl,
              key: `${product.orderId ?? "no-order"}:${product.productId}`,
              name: product.productName,
              orderLabel: copy.orderLabel(product.orderCode),
              quantityLabel: copy.productQuantity(
                formatQuantity(product.processedQuantity, numberLocale),
              ),
            }))
      }
      utilizationAriaLabel={copy.utilizationAria(utilizationPercent)}
      utilizationPercent={utilizationPercent}
      utilizationTone={getUtilizationTone(utilizationPercent)}
    />
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

function getUtilizationTone(
  utilizationPercent: number,
): ShiftDepartmentResultTone {
  if (utilizationPercent >= 90) return "success";
  if (utilizationPercent >= 75) return "warning";
  if (utilizationPercent > 50) return "neutral";
  return "danger";
}

function formatQuantity(quantity: number, numberLocale: Intl.LocalesArgument) {
  return new Intl.NumberFormat(numberLocale).format(quantity);
}
