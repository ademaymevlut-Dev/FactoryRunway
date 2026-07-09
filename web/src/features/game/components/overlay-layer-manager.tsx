"use client";

import type { GameSnapshot } from "../types";
import { useGameUiStore } from "../store/game-ui-store";
import { PanelChrome, panelRegistry } from "../panels/panel-registry";

export function OverlayLayerManager({ snapshot }: { snapshot: GameSnapshot }) {
  const { activePanel, closePanel } = useGameUiStore();

  if (!activePanel) {
    return null;
  }

  const panel = panelRegistry[activePanel.key];

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-start justify-end px-4 pb-24 pt-28 sm:px-6">
      <PanelChrome onClose={closePanel} title={panel.title}>
        {panel.render({
          onClose: closePanel,
          payload: activePanel.payload,
          snapshot,
        })}
      </PanelChrome>
    </div>
  );
}
