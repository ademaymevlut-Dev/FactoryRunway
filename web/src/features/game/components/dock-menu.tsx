"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpenText } from "lucide-react";

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
      className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex items-end justify-center px-2 xl:bottom-4 xl:px-4"
    >
      <div className="pointer-events-auto flex max-w-[calc(100vw-1rem)] items-end gap-1 xl:gap-3">
        <Link
          aria-label="Oyun Rehberi"
          className="group/guide relative isolate hidden h-[88px] w-[112px] shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-[24px] border border-primary/35 bg-[#232429]/85 text-primary shadow-[inset_0_0_30px_hsl(var(--primary)/0.16),0_18px_42px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-primary/65 hover:shadow-[0_0_28px_hsl(var(--primary)/0.34),0_22px_50px_rgba(0,0,0,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 xl:flex"
          data-map-control="true"
          href="/help/gameplay"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent"
          />
          <BookOpenText
            className="drop-shadow-[0_0_12px_hsl(var(--primary)/0.5)] transition-transform duration-200 group-hover/guide:scale-110"
            size={27}
          />
          <strong className="text-[11px] leading-none">Oyun Rehberi</strong>
          <span className="text-[9px] leading-none text-muted-foreground">Akışları incele</span>
          <ArrowUpRight
            className="absolute right-2.5 top-2.5 text-primary/60 transition-transform duration-200 group-hover/guide:-translate-y-0.5 group-hover/guide:translate-x-0.5"
            size={14}
          />
        </Link>

        <div className="relative isolate max-w-[calc(100vw-1rem)] overflow-visible rounded-[20px] border border-white/10 bg-[#232429]/80 px-1 py-1 shadow-[inset_0_0_26px_hsl(var(--primary)/0.14),0_16px_40px_rgba(0,0,0,0.46)] backdrop-blur-xl xl:rounded-[28px] xl:px-2.5 xl:py-2.5 xl:shadow-[inset_0_0_34px_hsl(var(--primary)/0.16),0_22px_55px_rgba(0,0,0,0.5)]">
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
          <div className="relative z-10 flex min-w-max items-end gap-1 xl:gap-2">
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
                        "group/dock relative isolate flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1 overflow-visible rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] via-[#232429]/90 to-black/20 text-primary outline-none transition-all duration-200 focus-visible:border-[#006d8f]/70 focus-visible:ring-2 focus-visible:ring-primary/45 xl:h-[68px] xl:w-[74px] xl:rounded-2xl",
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

                        setSelectedDockDepartmentIds(item.departmentIds);
                        openPanel(panelKey, { dockItemId: item.id });
                      }}
                      onMouseEnter={() =>
                        setHoveredDepartmentId(item.departmentIds[0] ?? null)
                      }
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
                          "hidden max-w-[4.75rem] truncate text-[11px] font-semibold leading-none text-primary transition-all duration-200 xl:block",
                          "group-hover/dock:text-primary group-hover/dock:drop-shadow-[0_0_7px_rgba(165,243,252,0.6)]",
                          isActive &&
                            "text-primary drop-shadow-[0_0_9px_rgba(165,243,252,0.85)]",
                        )}
                      >
                        {item.label}
                      </span>
                      <DockBadge badge={item.badge} />
                      {isActive ? (
                        <span
                          aria-hidden="true"
                          className="absolute -bottom-0.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-cyan-100 shadow-[0_0_16px_rgba(165,243,252,0.95)] xl:-bottom-1 xl:h-1 xl:w-9"
                        />
                      ) : null}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span>
                        · {item.badge.label}: {item.badge.count}
                      </span>
                    ) : null}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
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
        "relative isolate block size-5 shrink-0 overflow-hidden transition-all duration-200 group-hover/dock:drop-shadow-[0_0_12px_rgba(165,243,252,0.75)] xl:size-8",
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
        "absolute -right-1 -top-1 h-4 min-w-4 rounded-full border px-1 text-[8px] font-bold shadow-lg ring-2 ring-[#232429] xl:-right-1.5 xl:-top-1.5 xl:h-5 xl:min-w-5 xl:text-[10px]",
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
