"use client";

import CountUp from "@/components/ui/CountUp";

import type { ShiftDepartmentPlayback } from "../types";

export type ShiftDepartmentProductResult = {
  orderCode: string | null;
  processedQuantity: number;
  productName: string;
};

export function ShiftDepartmentCard({
  department,
  isFinal,
  producedQuantity,
  productResults,
  queueEnteredQuantity,
}: {
  department: ShiftDepartmentPlayback;
  isFinal: boolean;
  producedQuantity: number;
  productResults: ShiftDepartmentProductResult[];
  queueEnteredQuantity: number;
}) {
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
        <DepartmentPerformance performance={department.performance} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-white/8 pt-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Başlangıç</dt>
          <dd className="font-mono tabular-nums text-white">
            {formatQuantity(department.startingQueueQuantity)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Kalan</dt>
          <dd className="font-mono tabular-nums text-white">
            {formatQuantity(department.endingQueueQuantity)}
          </dd>
        </div>
      </dl>
      {isFinal && productResults.length > 0 ? (
        <div className="mt-3 border-t border-white/8 pt-2">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            İşlenen ürünler
          </p>
          <div className="space-y-1.5">
            {productResults.map((product) => (
              <div
                className="flex items-start justify-between gap-2 rounded-md bg-background/45 px-2 py-1.5 text-xs"
                key={`${product.orderCode ?? "no-order"}:${product.productName}`}
              >
                <div className="min-w-0">
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

function DepartmentPerformance({
  performance,
}: {
  performance: ShiftDepartmentPlayback["performance"];
}) {
  const efficiency = Math.round(performance.efficiencyBps / 100);
  const isQueueLimited =
    performance.queueLoadPoints > 0 &&
    performance.queueLoadPoints < performance.effectiveCapacityPoints;
  const hasCapacityLoss = performance.capacityLossBps > 0;
  const reason = hasCapacityLoss
    ? "Personel / kondisyon etkisi"
    : isQueueLimited
      ? "Kuyruk yükü sınırladı"
      : "Kapasite kullanımı";

  return (
    <div className="min-w-[128px] rounded-md border border-white/8 bg-background/45 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          Efficiency
        </p>
        <span className="font-mono text-sm font-semibold tabular-nums text-emerald-300">
          %{efficiency}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-emerald-400"
          style={{ width: `${Math.min(100, Math.max(0, efficiency))}%` }}
        />
      </div>
      <div className="mt-2 space-y-1 text-[10px]">
        <MetricLine
          label="Kapasite"
          value={performance.effectiveCapacityPoints}
        />
        <MetricLine label="Kuyruk yükü" value={performance.queueLoadPoints} />
        <MetricLine label="Kullanılan" value={performance.usedPoints} />
      </div>
      <p className="mt-1.5 truncate text-[10px] text-muted-foreground">
        {reason}
      </p>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums text-white">
        {formatQuantity(value)}
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
        className="block truncate font-mono text-2xl font-semibold tabular-nums text-emerald-300"
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
