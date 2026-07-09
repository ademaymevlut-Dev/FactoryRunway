"use client";

import { TooltipProvider } from "@/components/ui/tooltip";

import type { GameSnapshot } from "../types";
import { DockMenu } from "./dock-menu";
import { FactoryMap } from "./factory-map";
import { NotificationCenter } from "./notification-center";
import { OverlayLayerManager } from "./overlay-layer-manager";
import { ShiftControlBar } from "./shift-control-bar";
import { TopStatusBar } from "./top-status-bar";
import { GameUiProvider } from "../store/game-ui-store";

export function GameShell({ initialSnapshot }: { initialSnapshot: GameSnapshot }) {
  return (
    <GameUiProvider>
      <TooltipProvider>
        <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
          <FactoryMap snapshot={initialSnapshot} />
          <TopStatusBar snapshot={initialSnapshot} />
          <NotificationCenter notifications={initialSnapshot.notifications} />
          <DockMenu />
          <ShiftControlBar snapshot={initialSnapshot} />
          <OverlayLayerManager snapshot={initialSnapshot} />
        </main>
      </TooltipProvider>
    </GameUiProvider>
  );
}
