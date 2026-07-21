"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ManagerRecommendationCenter } from "@/features/manager/components/manager-recommendation-center";

import type { GameSnapshot } from "../types";
import { DailyEventPanel } from "./daily-event-panel";
import { DockMenu } from "./dock-menu";
import { FactoryMap } from "./factory-map";
import { LeftDockMenu } from "./left-dock-menu";
import { NotificationCenter } from "./notification-center";
import { OverlayLayerManager } from "./overlay-layer-manager";
import { ShiftControlBar } from "./shift-control-bar";
import { ShiftPlaybackHud } from "./shift-playback-hud";
import { ShiftPlaybackInteractionLock } from "./shift-playback-interaction-lock";
import { TopStatusBar } from "./top-status-bar";
import { GameUiProvider } from "../store/game-ui-store";

export function GameShell({ initialSnapshot }: { initialSnapshot: GameSnapshot }) {
  return (
    <GameUiProvider initialShiftPlayback={initialSnapshot.activeShiftPlayback}>
      <TooltipProvider>
        <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
          <FactoryMap snapshot={initialSnapshot} />
          <TopStatusBar snapshot={initialSnapshot} />
          <LeftDockMenu snapshot={initialSnapshot} />
          <ManagerRecommendationCenter
            recommendations={initialSnapshot.managerRecommendations}
          />
          <NotificationCenter notifications={initialSnapshot.notifications} />
          <DockMenu snapshot={initialSnapshot} />
          <ShiftControlBar snapshot={initialSnapshot} />
          <OverlayLayerManager snapshot={initialSnapshot} />
          <ShiftPlaybackInteractionLock />
          <DailyEventPanel />
          <ShiftPlaybackHud />
        </main>
      </TooltipProvider>
    </GameUiProvider>
  );
}
