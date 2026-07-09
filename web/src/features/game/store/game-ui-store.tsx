"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { GamePanelKey } from "../types";

type OpenPanelState = {
  key: GamePanelKey;
  payload?: Record<string, string | number | boolean | null>;
};

type MapPan = {
  x: number;
  y: number;
};

type GameUiStore = {
  activePanel: OpenPanelState | null;
  hoveredDepartmentId: string | null;
  mapPan: MapPan;
  mapZoom: number;
  selectedLineId: string | null;
  closePanel: () => void;
  openPanel: (
    key: GamePanelKey,
    payload?: Record<string, string | number | boolean | null>,
  ) => void;
  selectLine: (lineId: string | null) => void;
  setHoveredDepartmentId: (departmentId: string | null) => void;
  setMapPan: (pan: MapPan) => void;
  setMapZoom: (zoom: number) => void;
};

const GameUiStoreContext = createContext<GameUiStore | null>(null);

export function GameUiProvider({ children }: { children: ReactNode }) {
  const [activePanel, setActivePanel] = useState<OpenPanelState | null>(null);
  const [hoveredDepartmentId, setHoveredDepartmentId] = useState<string | null>(null);
  const [mapPan, setMapPan] = useState<MapPan>({ x: 0, y: 0 });
  const [mapZoom, setMapZoom] = useState(1);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);

  const openPanel = useCallback<GameUiStore["openPanel"]>((key, payload) => {
    setActivePanel({ key, payload });
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  const selectLine = useCallback((lineId: string | null) => {
    setSelectedLineId(lineId);
  }, []);

  const value = useMemo<GameUiStore>(
    () => ({
      activePanel,
      closePanel,
      hoveredDepartmentId,
      mapPan,
      mapZoom,
      openPanel,
      selectedLineId,
      selectLine,
      setHoveredDepartmentId,
      setMapPan,
      setMapZoom,
    }),
    [
      activePanel,
      closePanel,
      hoveredDepartmentId,
      mapPan,
      mapZoom,
      openPanel,
      selectedLineId,
      selectLine,
    ],
  );

  return (
    <GameUiStoreContext.Provider value={value}>
      {children}
    </GameUiStoreContext.Provider>
  );
}

export function useGameUiStore() {
  const store = useContext(GameUiStoreContext);

  if (!store) {
    throw new Error("useGameUiStore must be used inside GameUiProvider.");
  }

  return store;
}
