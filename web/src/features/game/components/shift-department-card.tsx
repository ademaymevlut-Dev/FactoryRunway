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
  efficiencyBps,
  isFinal,
  producedQuantity,
  productResults,
  queueEnteredQuantity,
}: {
  department: ShiftDepartmentPlayback;
  efficiencyBps: number;
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
        <DepartmentPerformance
          efficiencyBps={efficiencyBps}
          isFinal={isFinal}
        />
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
  efficiencyBps,
  isFinal,
}: {
  efficiencyBps: number;
  isFinal: boolean;
}) {
  const efficiency = Math.round(efficiencyBps / 100);
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
      aria-label={`Departman efficiency yüzde ${efficiency}`}
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
