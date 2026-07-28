"use client";

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

export function GameShell({ initialSnapshot }: { initialSnapshot: GameSnapshot }) {
  return (
    <GameUiProvider initialShiftPlayback={initialSnapshot.activeShiftPlayback}>
      <TooltipProvider>
        <main
          className="relative min-h-screen overflow-hidden bg-background text-foreground"
          lang={initialSnapshot.locale}
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
