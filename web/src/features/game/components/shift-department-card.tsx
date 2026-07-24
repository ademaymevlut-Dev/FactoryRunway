"use client";

import {
  ShiftDepartmentResultView,
  type ShiftDepartmentResultTone,
} from "@/components/game-presentation/shift-department-result-view";

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
  const utilizationPercent = Math.round(throughputBps / 100);

  return (
    <ShiftDepartmentResultView
      activeLineLabel={`${department.activeLineCount} hat`}
      activeProduct={
        activeProductPreview
          ? {
              ariaLabel: `Aktif ürün: ${activeProductPreview.product.productName}`,
              imageUrl: activeProductPreview.product.productImageUrl,
              key: activeProductPreview.key,
              name: activeProductPreview.product.productName,
              opacity: activeProductPreview.opacity,
              orderLabel: `Sipariş: ${
                activeProductPreview.product.orderCode ?? "-"
              }`,
              pulseScale: activeProductPreview.pulseScale,
            }
          : null
      }
      departmentLabel={department.departmentName}
      isFinal={isFinal}
      metrics={[
        {
          key: "queue-entered",
          label: "Kuyruğa giren",
          value: queueEnteredQuantity,
        },
        {
          key: "produced",
          label: "Çıkan",
          value: producedQuantity,
        },
      ]}
      numberLocale="tr-TR"
      processedProductsLabel="İşlenen ürünler"
      products={productResults.map((product) => ({
        imageUrl: product.productImageUrl,
        key: `${product.orderId ?? "no-order"}:${product.productId}`,
        name: product.productName,
        orderLabel: `Sipariş: ${product.orderCode ?? "-"}`,
        quantityLabel: formatQuantity(product.processedQuantity),
      }))}
      utilizationAriaLabel={`Departman randımanı yüzde ${utilizationPercent}`}
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

function formatQuantity(quantity: number) {
  return new Intl.NumberFormat("tr-TR").format(quantity);
}
