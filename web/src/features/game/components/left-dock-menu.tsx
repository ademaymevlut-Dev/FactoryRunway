"use client";

import {
  Banknote,
  BarChart3,
  ClipboardList,
  ListChecks,
  type LucideIcon,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useGameUiStore } from "../store/game-ui-store";
import type { GamePanelKey, GameSnapshot } from "../types";

type LeftDockItem = {
  key: Extract<GamePanelKey, "orders" | "tasks" | "finance" | "reports">;
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
  {
    key: "reports",
    label: "Reports",
    tooltip: "Raporlar",
    icon: BarChart3,
  },
];

export function LeftDockMenu({ snapshot }: { snapshot: GameSnapshot }) {
  const { activePanel, closePanel, openPanel, selectLine, setSelectedDockDepartmentIds } = useGameUiStore();

  return (
    <nav
      aria-label="Hızlı oyun menüsü"
      className="pointer-events-none absolute left-4 top-1/2 z-30 -translate-y-1/2"
    >
      <div className="pointer-events-auto relative isolate flex flex-col items-center gap-1.5 overflow-visible rounded-[28px] border border-white/10 bg-[#232429]/80 px-2.5 py-2.5 shadow-[inset_0_0_34px_hsl(var(--primary)/0.16),0_22px_55px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-8 right-0 w-px bg-gradient-to-b from-transparent via-primary/80 to-transparent shadow-[0_0_22px_hsl(var(--primary)/0.9)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-10 -right-4 -z-10 w-8 rounded-full bg-primary/25 blur-2xl"
        />
        {leftDockItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel?.key === item.key;
          const badge = snapshot.dock.badges[item.key];

          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                <button
                  aria-label={item.tooltip}
                  className={cn(
                    "group/leftdock relative isolate flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-1 overflow-visible rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] via-[#232429]/90 to-black/20 px-1.5 py-2 text-primary outline-none transition-all duration-200 focus-visible:border-[#006d8f]/70 focus-visible:ring-2 focus-visible:ring-primary/45 sm:h-[68px] sm:w-[74px]",
                    "hover:-translate-y-1 hover:border-[#006d8f]/60 hover:text-primary hover:shadow-[0_0_22px_rgba(0,109,143,0.36),inset_0_0_24px_hsl(var(--primary)/0.28)]",
                    "active:scale-95",
                    isActive &&
                      "h-16 w-16 -translate-y-1 scale-[1.04] border-[#006d8f]/70 bg-gradient-to-b from-[#006d8f]/35 via-[#006d8f]/18 to-[#232429]/90 text-primary shadow-[0_0_38px_rgba(0,180,235,0.52),0_16px_34px_rgba(0,0,0,0.42),inset_0_0_30px_hsl(var(--primary)/0.36)] sm:h-[78px] sm:w-[88px]",
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
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute -inset-3 -z-10 rounded-[24px] bg-primary/0 opacity-0 blur-2xl transition-all duration-200",
                      "group-hover/leftdock:bg-primary/30 group-hover/leftdock:opacity-100",
                      isActive && "bg-primary/40 opacity-100",
                    )}
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  />
                  <LeftDockIcon
                    icon={Icon}
                    id={item.key}
                    isActive={isActive}
                  />
                  <span
                    className={cn(
                      "relative z-10 max-w-[4.75rem] truncate text-[11px] font-semibold leading-none text-primary transition-all duration-200",
                      "group-hover/leftdock:text-primary group-hover/leftdock:drop-shadow-[0_0_7px_rgba(165,243,252,0.6)]",
                      isActive && "text-primary drop-shadow-[0_0_9px_rgba(165,243,252,0.85)]",
                    )}
                  >
                    {item.label}
                  </span>
                  {badge ? (
                    <span
                      aria-label={`${badge.label}: ${badge.count}`}
                      className={cn(
                        "absolute -right-1.5 -top-1.5 z-30 grid h-6 min-w-6 place-items-center rounded-full border border-white/45 px-1 text-[10px] font-black leading-none text-white shadow-[0_0_16px_rgba(0,0,0,0.35)]",
                        badge.tone === "danger" &&
                          "bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.72)]",
                        badge.tone === "warning" &&
                          "bg-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.72)]",
                        badge.tone === "info" &&
                          "bg-sky-500 shadow-[0_0_16px_rgba(14,165,233,0.72)]",
                        badge.tone === "success" &&
                          "bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.72)]",
                      )}
                      style={{
                        animation: "orderBadgeScale 1.25s ease-in-out infinite",
                      }}
                    >
                      {badge.count > 9 ? "9+" : badge.count}
                    </span>
                  ) : null}
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute -right-1 top-1/2 h-9 w-1 -translate-y-1/2 rounded-full bg-cyan-100 shadow-[0_0_16px_rgba(165,243,252,0.95)]"
                    />
                  ) : null}
                </button>
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

function LeftDockIcon({
  icon: Icon,
  id,
  isActive,
}: {
  icon: LucideIcon;
  id: string;
  isActive: boolean;
}) {
  const gradientId = `left-dock-icon-gradient-${id}`;
  const shineId = `left-dock-icon-shine-${id}`;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative z-10 grid size-6 place-items-center text-primary transition-all duration-200 group-hover/leftdock:drop-shadow-[0_0_12px_rgba(165,243,252,0.75)]",
        isActive && "drop-shadow-[0_0_15px_rgba(165,243,252,0.95)]",
      )}
    >
      <svg aria-hidden="true" className="absolute size-0">
        <defs>
          <linearGradient
            id={gradientId}
            x1="15%"
            x2="86%"
            y1="2%"
            y2="94%"
          >
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="26%" stopColor="rgba(136,224,255,0.82)" />
            <stop offset="58%" stopColor="rgb(0,109,143)" />
            <stop offset="100%" stopColor="rgba(1,28,40,0.7)" />
          </linearGradient>
          <radialGradient cx="30%" cy="18%" id={shineId} r="62%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
            <stop offset="34%" stopColor="rgba(255,255,255,0.42)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
      </svg>
      <Icon
        className="absolute inset-0 size-6 text-primary opacity-95"
        strokeWidth={2.35}
      />
      <Icon
        className="absolute inset-0 size-6 opacity-80 mix-blend-screen"
        color={`url(#${gradientId})`}
        strokeWidth={2.35}
      />
      <Icon
        className="absolute inset-0 size-6 opacity-75 mix-blend-screen"
        color={`url(#${shineId})`}
        strokeWidth={1.8}
      />
      <Icon
        className="absolute inset-0 size-6 translate-y-px opacity-35"
        color="rgba(0,0,0,0.44)"
        strokeWidth={2.35}
      />
    </span>
  );
}
