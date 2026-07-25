"use client";

import { useState } from "react";

import { Field, Select } from "../form-ui";

export type ProductScopeOption = {
  id: string;
  key: string;
  name: string;
  sectorId?: string;
  categoryId?: string;
};

export function ProductScopeFields({
  categories,
  defaults,
  productTypes,
  sectors,
}: {
  categories: ProductScopeOption[];
  defaults?: {
    sectorId?: string;
    categoryId?: string;
    productTypeId?: string;
  };
  productTypes: ProductScopeOption[];
  sectors: ProductScopeOption[];
}) {
  const initialSectorId =
    defaults?.sectorId ?? productTypes[0]?.sectorId ?? sectors[0]?.id ?? "";
  const initialCategories = categories.filter(
    (category) => category.sectorId === initialSectorId,
  );
  const [sectorId, setSectorId] = useState(initialSectorId);
  const [categoryId, setCategoryId] = useState(
    defaults?.categoryId ??
      productTypes.find((productType) => productType.sectorId === initialSectorId)
        ?.categoryId ??
      initialCategories[0]?.id ??
      "",
  );

  const visibleCategories = categories.filter(
    (category) => category.sectorId === sectorId,
  );
  const visibleProductTypes = productTypes.filter(
    (productType) =>
      productType.sectorId === sectorId &&
      productType.categoryId === categoryId,
  );

  function changeSector(nextSectorId: string) {
    setSectorId(nextSectorId);
    const nextCategoryId =
      productTypes.find(
        (productType) => productType.sectorId === nextSectorId,
      )?.categoryId ??
      categories.find((category) => category.sectorId === nextSectorId)?.id ??
      "";
    setCategoryId(nextCategoryId);
  }

  return (
    <>
      <Field label="Sektör">
        <Select
          name="sectorId"
          onChange={(event) => changeSector(event.target.value)}
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
      <Field label="Kategori">
        <Select
          name="categoryId"
          onChange={(event) => setCategoryId(event.target.value)}
          required
          value={categoryId}
        >
          {visibleCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Ürün tipi">
        <Select
          defaultValue={defaults?.productTypeId}
          key={`${sectorId}:${categoryId}`}
          name="productTypeId"
          required
        >
          {visibleProductTypes.map((productType) => (
            <option key={productType.id} value={productType.id}>
              {productType.name}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}
