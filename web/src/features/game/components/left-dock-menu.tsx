"use client";

import { Banknote, ClipboardList, ListChecks, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useGameUiStore } from "../store/game-ui-store";
import type { GamePanelKey, GameSnapshot } from "../types";

type LeftDockItem = {
  key: GamePanelKey;
  label: string;
  tooltip: string;
  icon: LucideIcon;
};

const leftDockItems: LeftDockItem[] = [
  {
    key: "orders",
    label: "Sipariş",
    tooltip: "Yeni Siparişler",
    icon: ClipboardList,
  },
  {
    key: "tasks",
    label: "Görevler",
    tooltip: "Görevler",
    icon: ListChecks,
  },
  {
    key: "finance",
    label: "Finans",
    tooltip: "Finans",
    icon: Banknote,
  },
];

export function LeftDockMenu({ snapshot }: { snapshot: GameSnapshot }) {
  const { activePanel, closePanel, openPanel, selectLine, setSelectedDockDepartmentIds } = useGameUiStore();

  return (
    <nav
      aria-label="Hızlı oyun menüsü"
      className="pointer-events-none absolute left-4 top-1/2 z-30 -translate-y-1/2"
    >
      <div className="pointer-events-auto relative isolate flex flex-col gap-2 rounded-[24px] border border-white/10 bg-[#232429]/45 p-2.5 shadow-[0_18px_42px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-5 left-0 w-px bg-gradient-to-b from-transparent via-primary/60 to-transparent shadow-[0_0_14px_hsl(var(--primary)/0.55)]"
        />
        {leftDockItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel?.key === item.key;
          const badgeCount = item.key === "orders" ? snapshot.orders.availableCount : 0;

          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                <Button
                  aria-label={item.tooltip}
                  className={cn(
                    "group/leftdock relative h-[68px] w-[68px] flex-col gap-1.5 overflow-hidden rounded-xl border border-primary/25 bg-primary px-1.5 py-2 text-white shadow-[0_10px_22px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-primary hover:text-white hover:shadow-[0_0_22px_hsl(var(--primary)/0.44),inset_0_0_18px_rgba(255,255,255,0.12)] active:scale-95",
                    isActive && "border-white/35 shadow-[0_0_22px_hsl(var(--primary)/0.48),inset_0_0_18px_rgba(255,255,255,0.14)]",
                  )}
                  data-map-control="true"
                  onClick={() => {
                    if (isActive) {
                      closePanel();
                      return;
                    }

                    selectLine(null);
                    setSelectedDockDepartmentIds([]);
                    openPanel(item.key);
                  }}
                  size="sm"
                  type="button"
                  variant="default"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 -left-10 w-7 rotate-12 bg-white/35 opacity-0 blur-[1px] transition-all duration-500 group-hover/leftdock:left-[118%] group-hover/leftdock:opacity-100"
                  />
                  <Icon className="relative z-10 size-5" />
                  <span className="relative z-10 max-w-[58px] truncate text-[11px] font-semibold leading-none text-white">
                    {item.label}
                  </span>
                  {badgeCount > 0 ? (
                    <span
                      className="absolute -right-1.5 -top-1.5 z-20 grid h-6 min-w-6 place-items-center rounded-full border border-white/45 bg-red-500 px-1 text-[10px] font-black leading-none text-white shadow-[0_0_16px_rgba(239,68,68,0.72)]"
                      style={{
                        animation: "orderBadgeScale 1.25s ease-in-out infinite",
                      }}
                    >
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  ) : null}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {item.tooltip}
              </TooltipContent>
            </Tooltip>
          );
        })}
        <style>
          {`
            @keyframes orderBadgeScale {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.16); }
            }
          `}
        </style>
      </div>
    </nav>
  );
}
