import { FACTORY_MAP_OFFICE_AREA_WIDTH } from "./factory-map-layout";

export const OFFICE_MANAGEMENT_AREA_WIDTH =
  FACTORY_MAP_OFFICE_AREA_WIDTH;
export const OFFICE_MANAGEMENT_SCENE_HORIZONTAL_INSET = 14;
export const OFFICE_MANAGEMENT_SCENE_WIDTH =
  OFFICE_MANAGEMENT_AREA_WIDTH -
  OFFICE_MANAGEMENT_SCENE_HORIZONTAL_INSET * 2;

type OfficeManagementSceneAsset = {
  bottomTransparentPx: number;
  phase: number;
  sourceHeight: number;
  sourceWidth: number;
  src: string;
};

const officeManagementSceneByStageKey: Record<
  string,
  OfficeManagementSceneAsset
> = {
  micro_workshop: {
    bottomTransparentPx: 172,
    phase: 1,
    sourceHeight: 1_536,
    sourceWidth: 1_024,
    src: "/office-area/micro-atolye-faz1.webp",
  },
  small_workshop: {
    bottomTransparentPx: 259,
    phase: 2,
    sourceHeight: 1_536,
    sourceWidth: 1_024,
    src: "/office-area/kucukatolye-faz2.webp",
  },
  stable_workshop: {
    bottomTransparentPx: 160,
    phase: 3,
    sourceHeight: 1_536,
    sourceWidth: 1_024,
    src: "/office-area/dengeli-atolye-faz3.webp",
  },
  growing_factory: {
    bottomTransparentPx: 106,
    phase: 4,
    sourceHeight: 1_536,
    sourceWidth: 1_024,
    src: "/office-area/buyuyen-fabrika-faz4.webp",
  },
  mass_factory: {
    bottomTransparentPx: 153,
    phase: 5,
    sourceHeight: 1_536,
    sourceWidth: 1_024,
    src: "/office-area/seri-uretim-fabrikasi-faz5.webp",
  },
  large_factory: {
    bottomTransparentPx: 153,
    phase: 6,
    sourceHeight: 1_536,
    sourceWidth: 1_024,
    src: "/office-area/seri-uretim-fabrikasi-faz5.webp",
  },
  enterprise_factory: {
    bottomTransparentPx: 153,
    phase: 7,
    sourceHeight: 1_536,
    sourceWidth: 1_024,
    src: "/office-area/seri-uretim-fabrikasi-faz5.webp",
  },
};

const fallbackOfficeManagementScene =
  officeManagementSceneByStageKey.mass_factory;

export function getOfficeManagementSceneAsset(
  operatingStageKey: string | null | undefined,
) {
  return (
    (operatingStageKey
      ? officeManagementSceneByStageKey[operatingStageKey]
      : undefined) ?? fallbackOfficeManagementScene
  );
}

export function getOfficeManagementSceneScale(
  asset: OfficeManagementSceneAsset,
) {
  return OFFICE_MANAGEMENT_SCENE_WIDTH / asset.sourceWidth;
}

export function getOfficeManagementSceneHeight(
  asset: OfficeManagementSceneAsset,
) {
  return Math.ceil(
    (asset.sourceHeight - asset.bottomTransparentPx) *
      getOfficeManagementSceneScale(asset),
  );
}

export type { OfficeManagementSceneAsset };
