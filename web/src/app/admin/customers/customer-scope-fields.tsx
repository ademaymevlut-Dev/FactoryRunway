"use client";

import { useState } from "react";

import { Field, Select } from "../form-ui";

export type CustomerScopeOption = {
  id: string;
  sectorId: string;
  label: string;
};

type SectorOption = {
  id: string;
  label: string;
};

export function CustomerScopeFields({
  sectors,
  segments,
  volumeClasses,
  operatingStages,
  initialSectorId,
  initialSegmentId,
  initialVolumeClassId,
  initialMinOperatingStageId,
  initialMaxOperatingStageId,
}: {
  sectors: SectorOption[];
  segments: CustomerScopeOption[];
  volumeClasses: CustomerScopeOption[];
  operatingStages: CustomerScopeOption[];
  initialSectorId?: string;
  initialSegmentId?: string;
  initialVolumeClassId?: string;
  initialMinOperatingStageId?: string | null;
  initialMaxOperatingStageId?: string | null;
}) {
  const firstUsableSectorId =
    initialSectorId ??
    sectors.find(
      (sector) =>
        segments.some((segment) => segment.sectorId === sector.id) &&
        volumeClasses.some((volumeClass) => volumeClass.sectorId === sector.id),
    )?.id ??
    "";
  const [sectorId, setSectorId] = useState(firstUsableSectorId);
  const availableSegments = segments.filter((item) => item.sectorId === sectorId);
  const availableVolumeClasses = volumeClasses.filter(
    (item) => item.sectorId === sectorId,
  );
  const availableStages = operatingStages.filter(
    (item) => item.sectorId === sectorId,
  );

  return (
    <>
      <Field label="Sektör">
        <Select
          name="sectorId"
          onChange={(event) => setSectorId(event.target.value)}
          required
          value={sectorId}
        >
          {sectors
            .filter(
              (sector) =>
                segments.some((segment) => segment.sectorId === sector.id) &&
                volumeClasses.some(
                  (volumeClass) => volumeClass.sectorId === sector.id,
                ),
            )
            .map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.label}
              </option>
            ))}
        </Select>
      </Field>
      <Field label="Müşteri segmenti">
        <Select
          defaultValue={
            availableSegments.some((item) => item.id === initialSegmentId)
              ? initialSegmentId
              : availableSegments[0]?.id
          }
          key={`${sectorId}:segment`}
          name="customerSegmentId"
          required
        >
          {availableSegments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Hacim sınıfı">
        <Select
          defaultValue={
            availableVolumeClasses.some(
              (item) => item.id === initialVolumeClassId,
            )
              ? initialVolumeClassId
              : availableVolumeClasses[0]?.id
          }
          key={`${sectorId}:volume`}
          name="customerVolumeClassId"
          required
        >
          {availableVolumeClasses.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Minimum işletme aşaması">
        <Select
          defaultValue={initialMinOperatingStageId ?? ""}
          key={`${sectorId}:min-stage`}
          name="minOperatingStageId"
        >
          <option value="">Sınır yok</option>
          {availableStages.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Maksimum işletme aşaması">
        <Select
          defaultValue={initialMaxOperatingStageId ?? ""}
          key={`${sectorId}:max-stage`}
          name="maxOperatingStageId"
        >
          <option value="">Sınır yok</option>
          {availableStages.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}
