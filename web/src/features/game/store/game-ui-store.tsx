"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { isShiftPlaybackActive } from "../shift-playback";
import type { GamePanelKey, ShiftPlayback } from "../types";

const DISMISSED_SHIFT_PLAYBACK_STORAGE_KEY = "factory-runway:dismissed-shift-playback";
const GAME_STORAGE_EVENT = "factory-runway:storage";

type OpenPanelState = {
  key: GamePanelKey;
  payload?: Record<string, string | number | boolean | null>;
};

type MapPan = {
  x: number;
  y: number;
};

type TasksView = "active" | "history";

type GameUiStore = {
  activePanel: OpenPanelState | null;
  hoveredDepartmentId: string | null;
  mapPan: MapPan;
  mapZoom: number;
  selectedDockDepartmentIds: string[];
  selectedLineId: string | null;
  activeShiftPlayback: ShiftPlayback | null;
  isShiftPlaybackActive: boolean;
  shiftPlaybackNowMs: number;
  tasksView: TasksView;
  closePanel: () => void;
  openPanel: (
    key: GamePanelKey,
    payload?: Record<string, string | number | boolean | null>,
  ) => void;
  setSelectedDockDepartmentIds: (departmentIds: string[]) => void;
  selectLine: (lineId: string | null) => void;
  setHoveredDepartmentId: (departmentId: string | null) => void;
  setMapPan: (pan: MapPan) => void;
  setMapZoom: (zoom: number) => void;
  setActiveShiftPlayback: (playback: ShiftPlayback | null) => void;
  setTasksView: (view: TasksView) => void;
};

const GameUiStoreContext = createContext<GameUiStore | null>(null);

export function GameUiProvider({
  children,
  initialShiftPlayback,
}: {
  children: ReactNode;
  initialShiftPlayback: ShiftPlayback | null;
}) {
  const [activePanel, setActivePanel] = useState<OpenPanelState | null>(null);
  const [hoveredDepartmentId, setHoveredDepartmentId] = useState<string | null>(null);
  const [mapPan, setMapPan] = useState<MapPan>({ x: 0, y: 0 });
  const [mapZoom, setMapZoom] = useState(1);
  const [selectedDockDepartmentIds, setSelectedDockDepartmentIds] = useState<string[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [tasksView, setTasksView] = useState<TasksView>("active");
  const [activeShiftPlayback, setActiveShiftPlaybackState] =
    useState<ShiftPlayback | null>(initialShiftPlayback);
  const dismissedShiftId = useStoredString(DISMISSED_SHIFT_PLAYBACK_STORAGE_KEY);
  const visibleShiftPlayback =
    activeShiftPlayback?.shiftId === dismissedShiftId ? null : activeShiftPlayback;
  const [shiftPlaybackNowMs, setShiftPlaybackNowMs] = useState(() =>
    getInitialShiftPlaybackNowMs(initialShiftPlayback),
  );
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visibleShiftPlayback) return;

    let lastUpdateMs = 0;

    const updateClock = (frameTimeMs: number) => {
      const nowMs = Date.now();

      if (frameTimeMs - lastUpdateMs >= 100) {
        setShiftPlaybackNowMs(nowMs);
        lastUpdateMs = frameTimeMs;
      }

      if (isShiftPlaybackActive(visibleShiftPlayback, nowMs)) {
        animationFrameRef.current = window.requestAnimationFrame(updateClock);
      } else {
        setShiftPlaybackNowMs(Date.parse(visibleShiftPlayback.playbackEndsAt));
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(updateClock);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [visibleShiftPlayback]);

  const shiftPlaybackIsActive = useMemo(
    () =>
      Boolean(
        visibleShiftPlayback &&
          isShiftPlaybackActive(visibleShiftPlayback, shiftPlaybackNowMs),
      ),
    [visibleShiftPlayback, shiftPlaybackNowMs],
  );

  const openPanel = useCallback<GameUiStore["openPanel"]>((key, payload) => {
    setActivePanel({ key, payload });
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel(null);
    setSelectedDockDepartmentIds([]);
  }, []);

  const selectLine = useCallback((lineId: string | null) => {
    setSelectedLineId(lineId);
  }, []);
  const setActiveShiftPlayback = useCallback((playback: ShiftPlayback | null) => {
    setActiveShiftPlaybackState(playback);
    setShiftPlaybackNowMs(getInitialShiftPlaybackNowMs(playback));
  }, []);

  const value = useMemo<GameUiStore>(
    () => ({
      activePanel,
      activeShiftPlayback: visibleShiftPlayback,
      closePanel,
      hoveredDepartmentId,
      mapPan,
      mapZoom,
      isShiftPlaybackActive: shiftPlaybackIsActive,
      openPanel,
      selectedDockDepartmentIds,
      selectedLineId,
      selectLine,
      setHoveredDepartmentId,
      setActiveShiftPlayback,
      setMapPan,
      setMapZoom,
      setSelectedDockDepartmentIds,
      setTasksView,
      shiftPlaybackNowMs,
      tasksView,
    }),
    [
      activePanel,
      closePanel,
      visibleShiftPlayback,
      hoveredDepartmentId,
      shiftPlaybackIsActive,
      mapPan,
      mapZoom,
      openPanel,
      selectedDockDepartmentIds,
      selectedLineId,
      selectLine,
      setActiveShiftPlayback,
      shiftPlaybackNowMs,
      tasksView,
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

export function dismissShiftPlayback(playback: ShiftPlayback) {
  setStoredString(DISMISSED_SHIFT_PLAYBACK_STORAGE_KEY, playback.shiftId);
}

export function useStoredString(key: string) {
  return useSyncExternalStore(
    subscribeToStorage,
    () => readStoredString(key),
    () => null,
  );
}

export function setStoredString(key: string, value: string) {
  window.localStorage.setItem(key, value);
  window.dispatchEvent(new Event(GAME_STORAGE_EVENT));
}

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(GAME_STORAGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(GAME_STORAGE_EVENT, callback);
  };
}

function readStoredString(key: string) {
  return window.localStorage.getItem(key);
}

function getInitialShiftPlaybackNowMs(playback: ShiftPlayback | null) {
  if (!playback) return 0;
  if (!playback.isActive) return Date.parse(playback.playbackEndsAt);

  return Date.parse(playback.playbackStartedAt);
}
