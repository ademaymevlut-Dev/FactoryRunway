"use client";

import { useEffect } from "react";
import type { GameSnapshot } from "../types";
import { useGameUiStore } from "../store/game-ui-store";
import { PanelChrome, panelRegistry } from "../panels/panel-registry";
import { cn } from "@/lib/utils";
import { gameCopy } from "../game-copy";

export function OverlayLayerManager({ snapshot }: { snapshot: GameSnapshot }) {
  const { activePanel, closePanel } = useGameUiStore();

  useEffect(() => {
    if (!activePanel) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, [activePanel]);

  if (!activePanel) {
    return null;
  }

  const panel = panelRegistry[activePanel.key];
  const layout = panel.layout ?? "side";
  const showBackdrop = Boolean(panel.backdrop);
  const panelCopy = gameCopy[snapshot.locale].panels;

  return (
    <div
      className={cn(
        "absolute inset-0 z-40 flex",
        layout === "center"
          ? cn(
              "items-center justify-center",
              panel.size === "orders"
                ? "p-0 min-[840px]:px-8 min-[840px]:py-24"
                : "px-4 py-24 sm:px-8",
              showBackdrop
                ? "pointer-events-auto bg-background/55 backdrop-blur-[2px]"
                : "pointer-events-none",
            )
          : layout === "dock"
            ? "pointer-events-none items-center justify-start px-4 py-24 pl-[6.75rem] sm:pl-[7.5rem]"
            : layout === "rightDrawer"
              ? "pointer-events-auto items-stretch justify-end bg-background/35 backdrop-blur-[1px] sm:p-2"
              : "pointer-events-none items-start justify-end px-4 pb-24 pt-28 sm:px-6",
      )}
    >
      <PanelChrome
        closeAria={panelCopy.closeAria}
        layout={layout}
        locale={snapshot.locale}
        onClose={closePanel}
        size={panel.size}
        title={panelCopy.titles[panel.titleKey]}
      >
        {panel.render({
          onClose: closePanel,
          payload: activePanel.payload,
          snapshot,
        })}
      </PanelChrome>
    </div>
  );
}
