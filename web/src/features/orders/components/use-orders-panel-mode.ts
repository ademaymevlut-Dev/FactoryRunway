"use client";

import { useEffect, useState, type RefObject } from "react";

export type OrdersPanelMode = "COMPACT" | "MEDIUM" | "WIDE";

const COMPACT_MAX_WIDTH = 759;
const MEDIUM_MAX_WIDTH = 1179;

export function useOrdersPanelMode(
  panelRef: RefObject<HTMLElement | null>,
): { mode: OrdersPanelMode; revision: number } {
  const [panelState, setPanelState] = useState<{
    mode: OrdersPanelMode;
    revision: number;
  }>({ mode: "COMPACT", revision: 0 });

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const updateMode = (width: number) => {
      setPanelState((current) => {
        const next = resolveOrdersPanelMode(width);
        return current.mode === next
          ? current
          : { mode: next, revision: current.revision + 1 };
      });
    };
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) updateMode(entry.contentRect.width);
    });

    updateMode(panel.getBoundingClientRect().width);
    observer.observe(panel);

    return () => observer.disconnect();
  }, [panelRef]);

  return panelState;
}

export function resolveOrdersPanelMode(width: number): OrdersPanelMode {
  if (width <= COMPACT_MAX_WIDTH) return "COMPACT";
  if (width <= MEDIUM_MAX_WIDTH) return "MEDIUM";
  return "WIDE";
}
