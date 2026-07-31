import type {
  ShipmentSceneLevel,
  ShipmentSceneThresholds,
} from "./types";

export const SHIPMENT_UNITS_PER_PALLET = 750;

export const DEFAULT_SHIPMENT_SCENE_THRESHOLDS = {
  level2Min: 4_001,
  level3Min: 9_001,
  level4Min: 15_001,
  level5Min: 20_001,
  level6Min: 30_001,
  level7Min: 45_001,
} satisfies ShipmentSceneThresholds;

export const SHIPMENT_MAXIMUM_AVAILABLE_ASSET_LEVEL = 7;

export const SHIPMENT_SCENE_ASSET_BY_LEVEL = {
  1: {
    scale: 1.12,
    src: "/shipment-area/shipment-level-1.webp",
  },
  2: {
    scale: 1.04,
    src: "/shipment-area/shipment-level-2.webp",
  },
  3: {
    scale: 0.96,
    src: "/shipment-area/shipment-level-3.webp",
  },
  4: {
    scale: 1,
    src: "/shipment-area/shipment-level-4.webp",
  },
  5: {
    scale: 1,
    src: "/shipment-area/shipment-level-5.webp",
  },
  6: {
    scale: 1,
    src: "/shipment-area/shipment-level-6.webp",
  },
  7: {
    scale: 1,
    src: "/shipment-area/shipment-level-7.webp",
  },
} as const satisfies Record<
  ShipmentSceneLevel,
  { scale: number; src: string }
>;
