import type {
  ShiftSimulationSceneData,
  ShiftSimulationTarget,
} from "./shift-simulation-scene-types";

export type ShiftSimulationSceneStatus =
  | "completed"
  | "event_active"
  | "idle"
  | "playing"
  | "summary_open";

export type ShiftSimulationSceneState = {
  activeTarget: ShiftSimulationTarget | null;
  actualQuantityByDepartment: Readonly<Record<string, number>>;
  displayTime: string;
  isNotificationVisible: boolean;
  isSummaryOpen: boolean;
  liveMessage: string;
  progress: number;
  status: ShiftSimulationSceneStatus;
  visibleEventIds: readonly string[];
};

export type ShiftSimulationSceneAction =
  | {
      completionMessage: string;
      data: ShiftSimulationSceneData;
      type: "complete";
    }
  | { eventId: string; liveMessage: string; type: "show-event" }
  | { type: "highlight-bottleneck" }
  | { completionMessage: string; type: "open-summary" }
  | { data: ShiftSimulationSceneData; type: "replay" }
  | { target: ShiftSimulationTarget; type: "select-target" }
  | { type: "start" }
  | {
      completionMessage: string;
      data: ShiftSimulationSceneData;
      type: "show-reduced-motion-result";
    };

function getInitialActualQuantities(data: ShiftSimulationSceneData) {
  return Object.fromEntries(
    data.departments.map((department) => [department.departmentKey, 0]),
  );
}

function getFinalActualQuantities(data: ShiftSimulationSceneData) {
  return Object.fromEntries(
    data.departments.map((department) => [
      department.departmentKey,
      department.actualQuantity,
    ]),
  );
}

export function createInitialShiftSimulationSceneState(
  data: ShiftSimulationSceneData,
): ShiftSimulationSceneState {
  return {
    activeTarget: null,
    actualQuantityByDepartment: getInitialActualQuantities(data),
    displayTime: data.shift.startTime,
    isNotificationVisible: false,
    isSummaryOpen: false,
    liveMessage: "",
    progress: 0,
    status: "idle",
    visibleEventIds: [],
  };
}

export function reduceShiftSimulationScene(
  state: ShiftSimulationSceneState,
  action: ShiftSimulationSceneAction,
): ShiftSimulationSceneState {
  switch (action.type) {
    case "start":
      if (state.status !== "idle") return state;
      return {
        ...state,
        activeTarget: "shift-start",
        status: "playing",
      };
    case "select-target":
      return { ...state, activeTarget: action.target };
    case "show-event":
      if (state.visibleEventIds.includes(action.eventId)) return state;
      return {
        ...state,
        activeTarget: "shift-event",
        liveMessage: action.liveMessage,
        status: "event_active",
        visibleEventIds: [...state.visibleEventIds, action.eventId],
      };
    case "highlight-bottleneck":
      return { ...state, activeTarget: "shift-bottleneck" };
    case "complete":
      if (state.status === "completed" || state.status === "summary_open") {
        return state;
      }
      return {
        ...state,
        actualQuantityByDepartment: getFinalActualQuantities(action.data),
        displayTime: action.data.shift.endTime,
        liveMessage: action.completionMessage,
        progress: 1,
        status: "completed",
        visibleEventIds: action.data.events.map((event) => event.id),
      };
    case "open-summary":
      if (state.status === "summary_open") return state;
      return {
        ...state,
        activeTarget: "shift-summary",
        isNotificationVisible: true,
        isSummaryOpen: true,
        liveMessage: action.completionMessage,
        status: "summary_open",
      };
    case "show-reduced-motion-result":
      return {
        activeTarget: "shift-summary",
        actualQuantityByDepartment: getFinalActualQuantities(action.data),
        displayTime: action.data.shift.endTime,
        isNotificationVisible: true,
        isSummaryOpen: true,
        liveMessage: action.completionMessage,
        progress: 1,
        status: "summary_open",
        visibleEventIds: action.data.events.map((event) => event.id),
      };
    case "replay":
      return createInitialShiftSimulationSceneState(action.data);
  }
}
