"use client";

import { Building2 } from "lucide-react";
import Image from "next/image";

import {
  OFFICE_MANAGEMENT_AREA_WIDTH,
  OFFICE_MANAGEMENT_SCENE_WIDTH,
  getOfficeManagementSceneHeight,
  getOfficeManagementSceneScale,
  type OfficeManagementSceneAsset,
} from "../office-management-scene";
import { FACTORY_MAP_DEPARTMENT_AREA_HEIGHT } from "../factory-map-layout";

import styles from "./office-management-map-area.module.css";

type OfficeManagementMapAreaProps = {
  ariaLabel: string;
  asset: OfficeManagementSceneAsset;
  onActivate: () => void;
  operatingStageKey: string;
  title: string;
};

export function OfficeManagementMapArea({
  ariaLabel,
  asset,
  onActivate,
  operatingStageKey,
  title,
}: OfficeManagementMapAreaProps) {
  const imageScale = getOfficeManagementSceneScale(asset);
  const sceneHeight = getOfficeManagementSceneHeight(asset);

  return (
    <section
      aria-label={ariaLabel}
      className={`factory-department-block blue ${styles.root}`}
      data-office-management-map-area
      data-office-management-phase={asset.phase}
      data-office-management-stage={operatingStageKey}
      style={{
        height: FACTORY_MAP_DEPARTMENT_AREA_HEIGHT,
        width: OFFICE_MANAGEMENT_AREA_WIDTH,
      }}
    >
      <header className={styles.header}>
        <div className={styles.headerPill}>
          <span className={styles.icon}>
            <Building2 aria-hidden="true" size={16} strokeWidth={2.2} />
          </span>
          <h2 className={styles.title}>{title}</h2>
        </div>
      </header>

      <div
        aria-hidden="true"
        className={styles.scene}
        style={{
          bottom: 14,
          height: sceneHeight,
          left: "50%",
          position: "absolute",
          transform: "translateX(-50%)",
          width: OFFICE_MANAGEMENT_SCENE_WIDTH,
        }}
      >
        <Image
          alt=""
          className={styles.image}
          draggable={false}
          height={asset.sourceHeight}
          priority
          sizes={`${OFFICE_MANAGEMENT_SCENE_WIDTH}px`}
          src={asset.src}
          style={{
            height: asset.sourceHeight * imageScale,
            left: 0,
            maxWidth: "none",
            position: "absolute",
            top: 0,
            width: OFFICE_MANAGEMENT_SCENE_WIDTH,
          }}
          width={asset.sourceWidth}
        />
      </div>

      <button
        aria-label={ariaLabel}
        className={styles.activationButton}
        data-office-management-map-activation
        onClick={onActivate}
        style={{ inset: 0, position: "absolute" }}
        type="button"
      />
    </section>
  );
}
