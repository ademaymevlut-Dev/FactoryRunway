"use client";

import {
  Check,
  Hourglass,
  TriangleAlert,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";

import {
  SHIPMENT_MAXIMUM_AVAILABLE_ASSET_LEVEL,
  SHIPMENT_SCENE_ASSET_BY_LEVEL,
} from "../shipment-scene-config";
import type {
  ShipmentMapView,
  ShipmentSceneLevel,
  ShipmentTileStatus,
} from "../types";

import styles from "./shipment-map-area.module.css";

type AvailableSceneAssetLevel = keyof typeof SHIPMENT_SCENE_ASSET_BY_LEVEL;

export type ShipmentMapAreaStatusLabels = {
  delayed: string;
  completed: string;
  inProgress: string;
};

export type ShipmentMapAreaProps = {
  ariaLabel: string;
  className?: string;
  emptyStateLabel: string;
  levelLabel: (level: ShipmentSceneLevel) => string;
  onActivate?: () => void;
  statusLabels: ShipmentMapAreaStatusLabels;
  summaryLabel: (readyQuantity: number, palletCount: number) => string;
  title: string;
  view: ShipmentMapView;
};

const statusIconByStatus = {
  COMPLETED: Check,
  DELAYED: TriangleAlert,
  IN_PROGRESS: Hourglass,
} satisfies Record<ShipmentTileStatus, LucideIcon>;

const statusClassByStatus = {
  COMPLETED: styles.completed,
  DELAYED: styles.delayed,
  IN_PROGRESS: styles.inProgress,
} satisfies Record<ShipmentTileStatus, string>;

const statusLabelKeyByStatus = {
  COMPLETED: "completed",
  DELAYED: "delayed",
  IN_PROGRESS: "inProgress",
} satisfies Record<
  ShipmentTileStatus,
  keyof ShipmentMapAreaStatusLabels
>;

export function ShipmentMapArea({
  ariaLabel,
  className,
  emptyStateLabel,
  levelLabel,
  onActivate,
  statusLabels,
  summaryLabel,
  title,
  view,
}: ShipmentMapAreaProps) {
  const sceneAsset =
    view.sceneLevel === null ? null : getSceneAsset(view.sceneLevel);
  const rootClassName = [
    styles.root,
    onActivate ? styles.interactive : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      aria-label={ariaLabel}
      className={rootClassName}
      data-shipment-map-area
    >
      <header className={styles.header}>
        <div className={styles.title}>
          <Warehouse aria-hidden="true" size={16} strokeWidth={2.2} />
          <h2>{title}</h2>
        </div>

        <div className={styles.headerMeta}>
          {view.status ? (
            <ShipmentStatusBadge
              label={statusLabels[statusLabelKeyByStatus[view.status]]}
              status={view.status}
            />
          ) : null}
          {view.sceneLevel ? (
            <span className={styles.level}>
              {levelLabel(view.sceneLevel)}
            </span>
          ) : null}
        </div>
      </header>

      <div
        className={styles.scene}
        data-shipment-scene
        data-shipment-scene-asset-level={sceneAsset?.level}
        style={
          sceneAsset
            ? ({
                "--shipment-scene-scale": sceneAsset.scale,
              } as CSSProperties)
            : undefined
        }
      >
        {sceneAsset ? (
          <Image
            alt=""
            aria-hidden="true"
            className={styles.sceneImage}
            draggable={false}
            height={1024}
            sizes="(max-width: 1100px) 280px, 328px"
            src={sceneAsset.src}
            width={1536}
          />
        ) : (
          <p className={styles.emptyState}>{emptyStateLabel}</p>
        )}
      </div>

      <footer className={styles.footer}>
        {summaryLabel(view.readyQuantity, view.estimatedPalletCount)}
      </footer>

      {onActivate ? (
        <button
          aria-label={ariaLabel}
          className={styles.activationButton}
          data-shipment-map-activation
          onClick={onActivate}
          type="button"
        />
      ) : null}
    </section>
  );
}

function getSceneAsset(sceneLevel: ShipmentSceneLevel) {
  const level = Math.min(
    sceneLevel,
    SHIPMENT_MAXIMUM_AVAILABLE_ASSET_LEVEL,
  ) as AvailableSceneAssetLevel;

  return {
    level,
    ...SHIPMENT_SCENE_ASSET_BY_LEVEL[level],
  };
}

function ShipmentStatusBadge({
  label,
  status,
}: {
  label: string;
  status: ShipmentTileStatus;
}) {
  const StatusIcon = statusIconByStatus[status];

  return (
    <span
      aria-label={label}
      className={`${styles.badge} ${statusClassByStatus[status]}`}
      role="img"
    >
      <StatusIcon aria-hidden="true" size={12} strokeWidth={2.5} />
    </span>
  );
}
