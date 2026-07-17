"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useGameUiStore } from "../store/game-ui-store";
import type { GameDockBadge, GameDockItem, GamePanelKey, GameSnapshot } from "../types";

export function DockMenu({ snapshot }: { snapshot: GameSnapshot }) {
  const {
    activePanel,
    closePanel,
    openPanel,
    setHoveredDepartmentId,
    setSelectedDockDepartmentIds,
  } = useGameUiStore();

  if (snapshot.dock.items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Departman menüsü"
      className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-2 sm:px-4"
    >
      <div className="pointer-events-auto relative isolate max-w-[calc(100vw-1rem)] overflow-visible rounded-[28px] border border-white/10 bg-[#232429]/80 px-2.5 py-2.5 shadow-[inset_0_0_34px_hsl(var(--primary)/0.16),0_22px_55px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent shadow-[0_0_22px_hsl(var(--primary)/0.9)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 -bottom-4 -z-10 h-8 rounded-full bg-primary/25 blur-2xl"
        />
        <div className="relative z-10 flex min-w-max items-end gap-1.5 sm:gap-2">
          {snapshot.dock.items.map((item) => {
            const panelKey = getDockPanelKey(item);
            const isActive =
              activePanel?.key === panelKey &&
              activePanel.payload?.dockItemId === item.id;

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    aria-label={item.label}
                    className={cn(
                      "group/dock relative isolate flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-1 overflow-visible rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] via-[#232429]/90 to-black/20 text-primary outline-none transition-all duration-200 focus-visible:border-[#006d8f]/70 focus-visible:ring-2 focus-visible:ring-primary/45 sm:h-[68px] sm:w-[74px]",
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

                      setSelectedDockDepartmentIds(item.departmentIds);
                      openPanel(panelKey, { dockItemId: item.id });
                    }}
                    onMouseEnter={() => setHoveredDepartmentId(item.departmentIds[0] ?? null)}
                    onMouseLeave={() => setHoveredDepartmentId(null)}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute -inset-3 -z-10 rounded-[24px] bg-primary/0 opacity-0 blur-2xl transition-all duration-200",
                        "group-hover/dock:bg-primary/30 group-hover/dock:opacity-100",
                        isActive && "bg-primary/40 opacity-100",
                      )}
                    />
                    <DockIcon isActive={isActive} item={item} />
                    <span
                      className={cn(
                        "hidden max-w-[4.75rem] truncate text-[11px] font-semibold leading-none text-primary transition-all duration-200 sm:block",
                        "group-hover/dock:text-primary group-hover/dock:drop-shadow-[0_0_7px_rgba(165,243,252,0.6)]",
                        isActive && "text-primary drop-shadow-[0_0_9px_rgba(165,243,252,0.85)]",
                      )}
                    >
                      {item.label}
                    </span>
                    <DockBadge badge={item.badge} />
                    {isActive ? (
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-1 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-cyan-100 shadow-[0_0_16px_rgba(165,243,252,0.95)]"
                      />
                    ) : null}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <span>{item.label}</span>
                  {item.badge ? <span>· {item.badge.label}: {item.badge.count}</span> : null}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function getDockPanelKey(item: GameDockItem): GamePanelKey {
  if (item.id === "dock:warehouse" || item.departmentKeys.includes("warehouse")) {
    return "warehouse";
  }

  if (item.kind === "PRODUCTION") {
    return "departmentQueue";
  }

  return "departmentDetail";
}

function DockIcon({ isActive, item }: { isActive: boolean; item: GameDockItem }) {
  const iconUrl = `/game-icons/dock/${item.iconKey}.svg`;
  const iconMaskStyle = {
    WebkitMaskImage: `url("${iconUrl}")`,
    WebkitMaskPosition: "center",
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    maskImage: `url("${iconUrl}")`,
    maskPosition: "center",
    maskRepeat: "no-repeat",
    maskSize: "contain",
  };

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative isolate block size-7 shrink-0 overflow-hidden transition-all duration-200 group-hover/dock:drop-shadow-[0_0_12px_rgba(165,243,252,0.75)] sm:size-8",
        isActive && "drop-shadow-[0_0_15px_rgba(165,243,252,0.95)]",
      )}
    >
      <span
        className="absolute inset-0 bg-current opacity-95"
        style={iconMaskStyle}
      />
      <span
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.76)_0%,rgba(136,224,255,0.5)_24%,rgba(0,109,143,0.82)_56%,rgba(1,28,40,0.3)_100%)] opacity-70 mix-blend-screen"
        style={iconMaskStyle}
      />
      <span
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.34)_22%,transparent_48%)] opacity-65"
        style={iconMaskStyle}
      />
      <span
        className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,transparent_58%,rgba(0,0,0,0.24)_100%)] opacity-50"
        style={iconMaskStyle}
      />
    </span>
  );
}

function DockBadge({ badge }: { badge: GameDockBadge | null }) {
  if (!badge || badge.count <= 0) {
    return null;
  }

  return (
    <Badge
      aria-label={`${badge.label}: ${badge.count}`}
      className={cn(
        "absolute -right-1.5 -top-1.5 h-5 min-w-5 rounded-full border px-1 text-[10px] font-bold shadow-lg ring-2 ring-[#232429]",
        badge.tone === "danger" &&
          "!border-red-300/50 !bg-red-500 text-white shadow-[0_0_14px_rgba(239,68,68,0.6)]",
        badge.tone === "warning" &&
          "!border-amber-200/55 !bg-amber-400 text-amber-950 shadow-[0_0_14px_rgba(251,191,36,0.58)]",
        badge.tone === "success" &&
          "!border-emerald-100/55 !bg-emerald-400 text-emerald-950 shadow-[0_0_14px_rgba(52,211,153,0.58)]",
        badge.tone === "info" &&
          "!border-cyan-100/55 !bg-[#006d8f] text-cyan-50 shadow-[0_0_14px_rgba(0,180,235,0.62)]",
      )}
    >
      {formatBadgeCount(badge.count)}
    </Badge>
  );
}

function formatBadgeCount(count: number) {
  return count > 99 ? "99+" : count.toString();
}
