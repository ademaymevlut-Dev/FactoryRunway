import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  ClipboardList,
  Factory,
  Gauge,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { GameMetric, GameSnapshot } from "../types";

const metricIcons: Record<string, LucideIcon> = {
  cash: Wallet,
  capacity: Boxes,
  day: CalendarDays,
  late: AlertTriangle,
  orders: ClipboardList,
  staff: UserRound,
};

const toneClasses: Record<GameMetric["tone"], string> = {
  amber: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  blue: "border-sky-400/20 bg-sky-400/10 text-sky-200",
  cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
  green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  red: "border-red-400/20 bg-red-400/10 text-red-200",
  violet: "border-violet-400/20 bg-violet-400/10 text-violet-200",
};

export function TopStatusBar({ snapshot }: { snapshot: GameSnapshot }) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-4 pt-4 sm:px-6">
      <div className="pointer-events-auto mx-auto flex max-w-[1500px] items-center gap-3 rounded-lg border border-white/10 bg-background/88 p-3 shadow-2xl backdrop-blur">
        <div className="flex min-w-0 items-center gap-3 border-r border-white/10 pr-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/15 text-primary">
            <Factory size={24} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-widest text-primary">
              {snapshot.factory.sectorName}
            </p>
            <h1 className="truncate text-lg font-semibold text-white">{snapshot.factory.name}</h1>
          </div>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {snapshot.metrics.map((metric) => {
            const Icon = metricIcons[metric.id] ?? Gauge;

            return (
              <div
                className={`min-w-0 rounded-lg border px-3 py-2 ${toneClasses[metric.tone]}`}
                key={metric.id}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className="shrink-0" size={16} />
                  <span className="truncate text-[10px] font-semibold uppercase tracking-widest opacity-80">
                    {metric.label}
                  </span>
                </div>
                <strong className="mt-1 block truncate text-sm text-white">{metric.value}</strong>
                <small className="block truncate text-[11px] opacity-75">{metric.subLabel}</small>
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
}
