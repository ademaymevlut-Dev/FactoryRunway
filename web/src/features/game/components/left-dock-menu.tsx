"use client";

import { CheckCircle2 } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useGameUiStore } from "../store/game-ui-store";
import type { GamePanelKey, GameSnapshot } from "../types";

type LeftDockKey = Extract<
  GamePanelKey,
  "orders" | "tasks" | "management" | "finance" | "reports"
>;

type LeftDockItem = {
  key: LeftDockKey;
  label: string;
  tooltip: string;
};

type LeftDockIconPath = {
  clipRule?: "evenodd";
  d: string;
  fillRule?: "evenodd";
};

const leftDockItems: LeftDockItem[] = [
  {
    key: "orders",
    label: "Sipariş",
    tooltip: "Yeni Siparişler",
  },
  {
    key: "tasks",
    label: "Görevler",
    tooltip: "Görevler",
  },
  {
    key: "management",
    label: "Yönetim",
    tooltip: "Yönetim tavsiyeleri",
  },
  {
    key: "finance",
    label: "Finans",
    tooltip: "Finans",
  },
  {
    key: "reports",
    label: "Reports",
    tooltip: "Raporlar",
  },
];

const leftDockIconPaths: Record<LeftDockKey, LeftDockIconPath[]> = {
  finance: [
    {
      clipRule: "evenodd",
      d: "M12 14a3 3 0 0 1 3-3h4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-4a3 3 0 0 1-3-3Zm3-1a1 1 0 1 0 0 2h4v-2h-4Z",
      fillRule: "evenodd",
    },
    {
      clipRule: "evenodd",
      d: "M12.293 3.293a1 1 0 0 1 1.414 0L16.414 6h-2.828l-1.293-1.293a1 1 0 0 1 0-1.414ZM12.414 6 9.707 3.293a1 1 0 0 0-1.414 0L5.586 6h6.828ZM4.586 7l-.056.055A2 2 0 0 0 3 9v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2h-4a5 5 0 0 1 0-10h4a2 2 0 0 0-1.53-1.945L17.414 7H4.586Z",
      fillRule: "evenodd",
    },
  ],
  management: [
    {
      clipRule: "evenodd",
      d: "M7.05 4.05A7 7 0 0 1 19 9c0 2.407-1.197 3.874-2.186 5.084l-.04.048C15.77 15.362 15 16.34 15 18a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1c0-1.612-.77-2.613-1.78-3.875l-.045-.056C6.193 12.842 5 11.352 5 9a7 7 0 0 1 2.05-4.95ZM9 21a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2h-4a1 1 0 0 1-1-1Zm1.586-13.414A2 2 0 0 1 12 7a1 1 0 1 0 0-2 4 4 0 0 0-4 4 1 1 0 0 0 2 0 2 2 0 0 1 .586-1.414Z",
      fillRule: "evenodd",
    },
  ],
  orders: [
    {
      clipRule: "evenodd",
      d: "M8 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1h2a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2Zm6 1h-4v2H9a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2h-1V4Zm-3 8a1 1 0 0 1 1-1h3a1 1 0 1 1 0 2h-3a1 1 0 0 1-1-1Zm-2-1a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H9Zm2 5a1 1 0 0 1 1-1h3a1 1 0 1 1 0 2h-3a1 1 0 0 1-1-1Zm-2-1a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H9Z",
      fillRule: "evenodd",
    },
  ],
  reports: [
    {
      d: "M13.5 2c-.178 0-.356.013-.492.022l-.074.005a1 1 0 0 0-.934.998V11a1 1 0 0 0 1 1h7.975a1 1 0 0 0 .998-.934l.005-.074A7.04 7.04 0 0 0 22 10.5 8.5 8.5 0 0 0 13.5 2Z",
    },
    {
      d: "M11 6.025a1 1 0 0 0-1.065-.998 8.5 8.5 0 1 0 9.038 9.039A1 1 0 0 0 17.975 13H11V6.025Z",
    },
  ],
  tasks: [
    {
      d: "M9 7V2.221a2 2 0 0 0-.5.365L4.586 6.5a2 2 0 0 0-.365.5H9Z",
    },
    {
      clipRule: "evenodd",
      d: "M11 7V2h7a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9h5a2 2 0 0 0 2-2Zm4.707 5.707a1 1 0 0 0-1.414-1.414L11 14.586l-1.293-1.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z",
      fillRule: "evenodd",
    },
  ],
};

export function LeftDockMenu({ snapshot }: { snapshot: GameSnapshot }) {
  const {
    activePanel,
    closePanel,
    openPanel,
    selectLine,
    setSelectedDockDepartmentIds,
  } = useGameUiStore();

  return (
    <nav
      aria-label="Hızlı oyun menüsü"
      className="pointer-events-none absolute left-2 top-1/2 z-30 -translate-y-1/2 xl:left-4"
    >
      <div className="pointer-events-auto relative isolate flex flex-col items-center gap-1 overflow-visible rounded-[20px] border border-white/10 bg-[#232429]/80 px-1 py-1 shadow-[inset_0_0_26px_hsl(var(--primary)/0.14),0_16px_40px_rgba(0,0,0,0.46)] backdrop-blur-xl xl:gap-1.5 xl:rounded-[28px] xl:px-2.5 xl:py-2.5 xl:shadow-[inset_0_0_34px_hsl(var(--primary)/0.16),0_22px_55px_rgba(0,0,0,0.5)]">
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
          const isActive = activePanel?.key === item.key;
          const badge = snapshot.dock.badges[item.key];

          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                <button
                  aria-label={item.tooltip}
                  className={cn(
                    "group/leftdock relative isolate flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1 overflow-visible rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] via-[#232429]/90 to-black/20 px-1 py-1 text-primary outline-none transition-all duration-200 focus-visible:border-[#006d8f]/70 focus-visible:ring-2 focus-visible:ring-primary/45 xl:h-[68px] xl:w-[74px] xl:rounded-2xl xl:px-1.5 xl:py-2",
                    "hover:-translate-y-1 hover:border-[#006d8f]/60 hover:text-primary hover:shadow-[0_0_22px_rgba(0,109,143,0.36),inset_0_0_24px_hsl(var(--primary)/0.28)]",
                    "active:scale-95",
                    isActive &&
                      "h-11 w-11 -translate-y-0.5 scale-[1.03] border-[#006d8f]/70 bg-gradient-to-b from-[#006d8f]/35 via-[#006d8f]/18 to-[#232429]/90 text-primary shadow-[0_0_28px_rgba(0,180,235,0.48),0_12px_26px_rgba(0,0,0,0.4),inset_0_0_24px_hsl(var(--primary)/0.32)] xl:h-[78px] xl:w-[88px] xl:-translate-y-1 xl:scale-[1.04] xl:shadow-[0_0_38px_rgba(0,180,235,0.52),0_16px_34px_rgba(0,0,0,0.42),inset_0_0_30px_hsl(var(--primary)/0.36)]",
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
                    id={item.key}
                    isActive={isActive}
                    paths={leftDockIconPaths[item.key]}
                  />
                  <span
                    className={cn(
                      "relative z-10 hidden max-w-[4.75rem] truncate text-[11px] font-semibold leading-none text-primary transition-all duration-200 xl:block",
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
                        "absolute -right-1 -top-1 z-30 grid h-4 min-w-4 place-items-center rounded-full border border-white/45 px-1 text-[8px] font-black leading-none text-white shadow-[0_0_16px_rgba(0,0,0,0.35)] xl:-right-1.5 xl:-top-1.5 xl:h-6 xl:min-w-6 xl:text-[10px]",
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
                      {badge.icon === "check" ? (
                        <CheckCircle2 aria-hidden="true" className="size-2.5 xl:size-3.5" />
                      ) : (
                        badge.count > 9 ? "9+" : badge.count
                      )}
                    </span>
                  ) : null}
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-cyan-100 shadow-[0_0_16px_rgba(165,243,252,0.95)] xl:-right-1 xl:h-9 xl:w-1"
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
  id,
  isActive,
  paths,
}: {
  id: string;
  isActive: boolean;
  paths: LeftDockIconPath[];
}) {
  const gradientId = `left-dock-icon-gradient-${id}`;
  const shineId = `left-dock-icon-shine-${id}`;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative z-10 grid size-5 place-items-center text-primary transition-all duration-200 group-hover/leftdock:drop-shadow-[0_0_12px_rgba(165,243,252,0.75)] xl:size-6",
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
      <SolidDockIconSvg
        className="absolute inset-0 size-5 translate-y-px opacity-35 xl:size-6"
        fill="rgba(0,0,0,0.44)"
        paths={paths}
      />
      <SolidDockIconSvg
        className="absolute inset-0 size-5 text-primary opacity-95 xl:size-6"
        paths={paths}
      />
      <SolidDockIconSvg
        className="absolute inset-0 size-5 opacity-80 mix-blend-screen xl:size-6"
        fill={`url(#${gradientId})`}
        paths={paths}
      />
      <SolidDockIconSvg
        className="absolute inset-0 size-5 opacity-75 mix-blend-screen xl:size-6"
        fill={`url(#${shineId})`}
        paths={paths}
      />
    </span>
  );
}

function SolidDockIconSvg({
  className,
  fill = "currentColor",
  paths,
}: {
  className: string;
  fill?: string;
  paths: LeftDockIconPath[];
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill={fill}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {paths.map((path) => (
        <path
          clipRule={path.clipRule}
          d={path.d}
          fillRule={path.fillRule}
          key={path.d}
        />
      ))}
    </svg>
  );
}
