"use client";

import { useState } from "react";

import { Field, Select } from "../form-ui";

type SectorOption = {
  id: string;
  key: string;
  name: string;
};

type GroupOption = {
  id: string;
  sectorId: string;
  name: string;
};

type CategoryOption = {
  id: string;
  sectorId: string;
  name: string;
};

export function DepartmentScopeFields({
  sectors,
  groups,
}: {
  sectors: SectorOption[];
  groups: GroupOption[];
}) {
  const [sectorId, setSectorId] = useState(sectors[0]?.id ?? "");
  const availableGroups = groups.filter((group) => group.sectorId === sectorId);

  return (
    <>
      <Field label="Sektör">
        <Select
          name="sectorId"
          onChange={(event) => setSectorId(event.target.value)}
          required
          value={sectorId}
        >
          {sectors.map((sector) => (
            <option key={sector.id} value={sector.id}>
              {sector.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Departman grubu">
        <Select defaultValue="" key={sectorId} name="departmentGroupId">
          <option value="">Grupsuz</option>
          {availableGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}

export function ProductTypeScopeFields({
  sectors,
  categories,
}: {
  sectors: SectorOption[];
  categories: CategoryOption[];
}) {
  const firstSectorId =
    sectors.find((sector) =>
      categories.some((category) => category.sectorId === sector.id),
    )?.id ?? "";
  const [sectorId, setSectorId] = useState(firstSectorId);
  const availableCategories = categories.filter(
    (category) => category.sectorId === sectorId,
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
            .filter((sector) =>
              categories.some((category) => category.sectorId === sector.id),
            )
            .map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
              </option>
            ))}
        </Select>
      </Field>
      <Field label="Kategori">
        <Select key={sectorId} name="categoryId" required>
          {availableCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}
