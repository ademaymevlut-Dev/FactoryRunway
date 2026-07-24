import type { OrderAcceptanceTarget } from "./order-acceptance-scene-types";

export type OrderAcceptanceSceneStatus =
  | "accepted"
  | "completed"
  | "idle"
  | "playing";

export type OrderAcceptanceSceneState = {
  activeTarget: OrderAcceptanceTarget | null;
  isNotificationVisible: boolean;
  selectedOfferId: string;
  status: OrderAcceptanceSceneStatus;
};

export type OrderAcceptanceSceneAction =
  | { type: "accept" }
  | { type: "complete" }
  | { target: OrderAcceptanceTarget; type: "select-target" }
  | { type: "play" }
  | { selectedOfferId: string; type: "replay" }
  | { type: "show-reduced-motion-result" };

export function createInitialOrderAcceptanceSceneState(
  selectedOfferId: string,
): OrderAcceptanceSceneState {
  return {
    activeTarget: null,
    isNotificationVisible: false,
    selectedOfferId,
    status: "idle",
  };
}

export function isOrderAcceptanceAccepted(
  state: OrderAcceptanceSceneState,
): boolean {
  return state.status === "accepted" || state.status === "completed";
}

export function reduceOrderAcceptanceScene(
  state: OrderAcceptanceSceneState,
  action: OrderAcceptanceSceneAction,
): OrderAcceptanceSceneState {
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
    case "accept":
      if (isOrderAcceptanceAccepted(state)) return state;
      return {
        ...state,
        activeTarget: "order-accept",
        isNotificationVisible: true,
        status: "accepted",
      };
    case "complete":
      if (state.status === "completed") return state;
      return {
        ...state,
        isNotificationVisible: true,
        status: "completed",
      };
    case "show-reduced-motion-result":
      return {
        ...state,
        activeTarget: "order-accept",
        isNotificationVisible: true,
        status: "completed",
      };
    case "replay":
      return createInitialOrderAcceptanceSceneState(action.selectedOfferId);
  }
}
