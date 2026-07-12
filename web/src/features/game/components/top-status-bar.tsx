//web/src/features/game/components/top-status-bar.tsx

import Image from "next/image";
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  ClipboardList,
  Gauge,
  LogOut,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { logoutAction } from "@/app/user-actions";

import type { GameSnapshot } from "../types";

const metricIcons: Record<string, LucideIcon> = {
  cash: Wallet,
  capacity: Boxes,
  day: CalendarDays,
  late: AlertTriangle,
  orders: ClipboardList,
  staff: UserRound,
};

export function TopStatusBar({ snapshot }: { snapshot: GameSnapshot }) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-4 pt-4 sm:px-6">
      <div className="pointer-events-auto mx-auto flex max-w-[1500px] items-center gap-3 rounded-lg bg-background/88 p-3 shadow-2xl backdrop-blur">
        <div className="flex min-w-0 items-center gap-3 border-r border-card pr-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Image
              alt="Factory Runway"
              className="h-7 w-7 object-contain"
              height={28}
              priority
              src="/factoryRunway.svg"
              width={28}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-widest text-primary">
              {snapshot.factory.sectorName}
            </p>
            <h1 className="truncate text-lg font-semibold text-white">{snapshot.factory.name}</h1>
          </div>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 divide-x divide-card md:grid-cols-3 xl:grid-cols-6">
          {snapshot.metrics.map((metric) => {
            const Icon = metricIcons[metric.id] ?? Gauge;

            return (
              <div
                className="flex min-w-0 items-center gap-2 px-3 py-1 text-muted-foreground first:pl-0"
                key={metric.id}
              >
                <Icon className="shrink-0 text-primary" size={16} />
                <div className="min-w-0">
                  <span className="block truncate text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {metric.label}
                  </span>
                  <strong className="block truncate text-sm font-semibold leading-tight text-white">
                    {metric.value}
                  </strong>
                </div>
              </div>
            );
          })}
        </div>

        <form action={logoutAction} className="border-l border-card pl-3">
          <button
            aria-label="Çıkış yap"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
            title="Çıkış yap"
            type="submit"
          >
            <LogOut size={17} />
          </button>
        </form>
      </div>
    </header>
  );
}
