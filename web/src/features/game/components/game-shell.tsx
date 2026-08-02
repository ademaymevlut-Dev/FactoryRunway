"use client";

import {
  type CSSProperties,
  type RefObject,
  useEffect,
  useRef,
} from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

import type { GameSnapshot } from "../types";
import { DockMenu } from "./dock-menu";
import { FactoryMap } from "./factory-map";
import { LeftDockMenu } from "./left-dock-menu";
import { NotificationCenter } from "./notification-center";
import { OverlayLayerManager } from "./overlay-layer-manager";
import { ShiftControlBar } from "./shift-control-bar";
import { ShiftPlaybackInteractionLock } from "./shift-playback-interaction-lock";
import { ShiftPlaybackOverlayLayout } from "./shift-playback-overlay-layout";
import { TopStatusBar } from "./top-status-bar";
import { GameUiProvider } from "../store/game-ui-store";

const MOBILE_DOCK_HEIGHT_FALLBACK_PX = 50;
const MOBILE_SHIFT_DOCK_GAP_PX = 10;

const gameShellStyle = {
  "--game-dock-height": `${MOBILE_DOCK_HEIGHT_FALLBACK_PX}px`,
  "--game-shift-dock-gap": `${MOBILE_SHIFT_DOCK_GAP_PX}px`,
} as CSSProperties;

export function GameShell({ initialSnapshot }: { initialSnapshot: GameSnapshot }) {
  const shellRef = useRef<HTMLElement>(null);

  useGameDocumentScrollLock();
  useGameDockHeight(shellRef);
  useGameVisualViewportHeight(shellRef);

  return (
    <GameUiProvider initialShiftPlayback={initialSnapshot.activeShiftPlayback}>
      <TooltipProvider>
        <main
          className="game-shell fixed inset-0 h-screen h-dvh w-full overflow-hidden overscroll-none bg-background text-foreground [--game-dock-edge-offset:0.5rem] xl:[--game-dock-edge-offset:1rem]"
          lang={initialSnapshot.locale}
          ref={shellRef}
          style={gameShellStyle}
        >
          <FactoryMap snapshot={initialSnapshot} />
          <TopStatusBar snapshot={initialSnapshot} />
          <LeftDockMenu snapshot={initialSnapshot} />
          <NotificationCenter notifications={initialSnapshot.notifications} />
          <DockMenu snapshot={initialSnapshot} />
          <ShiftControlBar snapshot={initialSnapshot} />
          <OverlayLayerManager snapshot={initialSnapshot} />
          <ShiftPlaybackInteractionLock locale={initialSnapshot.locale} />
          <ShiftPlaybackOverlayLayout
            currencyCode={initialSnapshot.factory.currencyCode}
            locale={initialSnapshot.locale}
          />
        </main>
      </TooltipProvider>
    </GameUiProvider>
  );
}

function useGameDockHeight(shellRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const shell = shellRef.current;
    const dock = shell?.querySelector<HTMLElement>(".game-bottom-dock");

    if (!shell || !dock) return;

    const initialDockHeight = shell.style.getPropertyValue(
      "--game-dock-height",
    );
    const syncDockHeight = () => {
      const dockHeight = Math.ceil(dock.getBoundingClientRect().height);

      if (dockHeight > 0) {
        shell.style.setProperty("--game-dock-height", `${dockHeight}px`);
      }
    };

    syncDockHeight();

    const resizeObserver = new ResizeObserver(syncDockHeight);
    resizeObserver.observe(dock);

    return () => {
      resizeObserver.disconnect();
      shell.style.setProperty("--game-dock-height", initialDockHeight);
    };
  }, [shellRef]);
}

function useGameVisualViewportHeight(shellRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const shell = shellRef.current;
    const visualViewport = window.visualViewport;

    if (!shell || !visualViewport) {
      return;
    }

    let animationFrameId: number | null = null;

    const syncViewportHeight = () => {
      animationFrameId = null;
      shell.style.height = `${Math.round(visualViewport.height)}px`;
    };

    const scheduleViewportHeightSync = () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = window.requestAnimationFrame(syncViewportHeight);
    };

    syncViewportHeight();
    visualViewport.addEventListener("resize", scheduleViewportHeightSync);
    visualViewport.addEventListener("scroll", scheduleViewportHeightSync);
    window.addEventListener("resize", scheduleViewportHeightSync);

    return () => {
      visualViewport.removeEventListener("resize", scheduleViewportHeightSync);
      visualViewport.removeEventListener("scroll", scheduleViewportHeightSync);
      window.removeEventListener("resize", scheduleViewportHeightSync);

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      shell.style.removeProperty("height");
    };
  }, [shellRef]);
}

function useGameDocumentScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousStyles = {
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      htmlOverflow: html.style.overflow,
      htmlOverscrollBehavior: html.style.overscrollBehavior,
    };

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = previousStyles.htmlOverflow;
      html.style.overscrollBehavior = previousStyles.htmlOverscrollBehavior;
      body.style.overflow = previousStyles.bodyOverflow;
      body.style.overscrollBehavior = previousStyles.bodyOverscrollBehavior;
    };
  }, []);
}
