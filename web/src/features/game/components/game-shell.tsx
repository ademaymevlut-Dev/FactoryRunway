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
const MOBILE_HEADER_HEIGHT_PX = 64;
const MOBILE_SHIFT_DOCK_GAP_PX = 10;

const gameShellStyle = {
  "--game-dock-height": `${MOBILE_DOCK_HEIGHT_FALLBACK_PX}px`,
  "--game-mobile-header-height": `${MOBILE_HEADER_HEIGHT_PX}px`,
  "--game-shift-dock-gap": `${MOBILE_SHIFT_DOCK_GAP_PX}px`,
  "--game-visual-viewport-height": "100dvh",
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
          className="game-shell fixed inset-0 h-screen h-dvh w-full overflow-hidden overscroll-none bg-background text-foreground [--game-dock-edge-offset:0.5rem] [--game-header-block-offset:0.5rem] [--game-header-inline-offset:0.5rem] xl:[--game-dock-edge-offset:1rem] xl:[--game-header-block-offset:1rem] xl:[--game-header-inline-offset:1.5rem]"
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
    const documentRoot = document.documentElement;

    if (!shell) {
      return;
    }

    let animationFrameId: number | null = null;
    const initialShellHeight = shell.style.height;
    const initialViewportHeight = shell.style.getPropertyValue(
      "--game-visual-viewport-height",
    );
    const initialRootViewportHeight = documentRoot.style.getPropertyValue(
      "--game-visual-viewport-height",
    );
    const restoreViewportHeight = () => {
      if (initialShellHeight) {
        shell.style.height = initialShellHeight;
      } else {
        shell.style.removeProperty("height");
      }
      shell.style.setProperty(
        "--game-visual-viewport-height",
        initialViewportHeight,
      );

      if (initialRootViewportHeight) {
        documentRoot.style.setProperty(
          "--game-visual-viewport-height",
          initialRootViewportHeight,
        );
      } else {
        documentRoot.style.removeProperty("--game-visual-viewport-height");
      }
    };

    if (isStandaloneGameDisplay()) {
      shell.style.removeProperty("height");
      shell.style.setProperty("--game-visual-viewport-height", "100dvh");
      documentRoot.style.setProperty(
        "--game-visual-viewport-height",
        "100dvh",
      );

      return restoreViewportHeight;
    }

    if (!visualViewport) {
      return;
    }

    const syncViewportHeight = () => {
      animationFrameId = null;
      const viewportHeight = `${Math.round(visualViewport.height)}px`;

      shell.style.height = viewportHeight;
      shell.style.setProperty("--game-visual-viewport-height", viewportHeight);
      documentRoot.style.setProperty(
        "--game-visual-viewport-height",
        viewportHeight,
      );
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

      restoreViewportHeight();
    };
  }, [shellRef]);
}

function useGameDocumentScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const previousStyles = {
      bodyHeight: body.style.height,
      bodyLeft: body.style.left,
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlHeight: html.style.height,
      htmlOverflow: html.style.overflow,
      htmlOverscrollBehavior: html.style.overscrollBehavior,
    };

    html.style.height = "100%";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.position = "fixed";
    body.style.top = `${-scrollY}px`;
    body.style.left = `${-scrollX}px`;
    body.style.width = "100%";
    body.style.height = "100%";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.height = previousStyles.htmlHeight;
      html.style.overflow = previousStyles.htmlOverflow;
      html.style.overscrollBehavior = previousStyles.htmlOverscrollBehavior;
      body.style.position = previousStyles.bodyPosition;
      body.style.top = previousStyles.bodyTop;
      body.style.left = previousStyles.bodyLeft;
      body.style.width = previousStyles.bodyWidth;
      body.style.height = previousStyles.bodyHeight;
      body.style.overflow = previousStyles.bodyOverflow;
      body.style.overscrollBehavior = previousStyles.bodyOverscrollBehavior;

      if (scrollX !== 0 || scrollY !== 0) {
        window.scrollTo({ behavior: "auto", left: scrollX, top: scrollY });
      }
    };
  }, []);
}

function isStandaloneGameDisplay() {
  const iosNavigator = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    iosNavigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}
