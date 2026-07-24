import type {
  ProductionQueueSceneData,
  ProductionQueueTarget,
} from "./production-queue-scene-types";

export type ProductionQueueSceneStatus =
  | "completed"
  | "idle"
  | "playing"
  | "reordering"
  | "updated";

export type ProductionQueueSceneState = {
  activeTarget: ProductionQueueTarget | null;
  isNotificationVisible: boolean;
  liveMessage: string;
  plannedProductionByItemId: Readonly<Record<string, number>>;
  queueOrder: readonly string[];
  status: ProductionQueueSceneStatus;
};

export type ProductionQueueSceneAction =
  | { type: "complete" }
  | { type: "finish-reorder" }
  | { data: ProductionQueueSceneData; type: "reorder" }
  | { data: ProductionQueueSceneData; type: "replay" }
  | { target: ProductionQueueTarget; type: "select-target" }
  | { type: "play" }
  | { type: "start-reorder" }
  | {
      data: ProductionQueueSceneData;
      liveMessage: string;
      type: "show-reduced-motion-result";
    }
  | { liveMessage: string; type: "show-update" };

function getPlannedProduction(
  data: ProductionQueueSceneData,
  phase: "initial" | "reordered",
) {
  return Object.fromEntries(
    data.items.map((item) => [
      item.id,
      phase === "initial"
        ? item.initialPlannedProduction
        : item.reorderedPlannedProduction,
    ]),
  );
}

export function createInitialProductionQueueSceneState(
  data: ProductionQueueSceneData,
): ProductionQueueSceneState {
  return {
    activeTarget: null,
    isNotificationVisible: false,
    liveMessage: "",
    plannedProductionByItemId: getPlannedProduction(data, "initial"),
    queueOrder: [...data.initialOrder],
    status: "idle",
  };
}

function hasReorderedQueue(
  state: ProductionQueueSceneState,
  data: ProductionQueueSceneData,
) {
  return (
    state.queueOrder.length === data.reorderedOrder.length &&
    state.queueOrder.every(
      (itemId, index) => itemId === data.reorderedOrder[index],
    )
  );
}

export function reduceProductionQueueScene(
  state: ProductionQueueSceneState,
  action: ProductionQueueSceneAction,
): ProductionQueueSceneState {
  switch (action.type) {
    case "play":
      if (state.status !== "idle") return state;
      return { ...state, status: "playing" };
    case "select-target":
      return {
        ...state,
        activeTarget: action.target,
        status: state.status === "idle" ? "playing" : state.status,
      };
    case "start-reorder":
      if (state.status === "reordering" || state.status === "updated") {
        return state;
      }
      return { ...state, status: "reordering" };
    case "reorder":
      if (hasReorderedQueue(state, action.data)) return state;
      return {
        ...state,
        plannedProductionByItemId: getPlannedProduction(
          action.data,
          "reordered",
        ),
        queueOrder: [...action.data.reorderedOrder],
        status: "reordering",
      };
    case "finish-reorder":
      if (state.status !== "reordering") return state;
      return { ...state, status: "updated" };
    case "show-update":
      return {
        ...state,
        activeTarget: "queue-updated-plan",
        isNotificationVisible: true,
        liveMessage: action.liveMessage,
        status: "updated",
      };
    case "complete":
      if (state.status === "completed") return state;
      return { ...state, status: "completed" };
    case "show-reduced-motion-result":
      return {
        activeTarget: "queue-updated-plan",
        isNotificationVisible: true,
        liveMessage: action.liveMessage,
        plannedProductionByItemId: getPlannedProduction(
          action.data,
          "reordered",
        ),
        queueOrder: [...action.data.reorderedOrder],
        status: "completed",
      };
    case "replay":
      return createInitialProductionQueueSceneState(action.data);
  }
}
