"use client";

import { useState } from "react";

import { Field, Select } from "./form-ui";

type Option = {
  id: string;
  key: string;
  name?: string;
  sectorId?: string;
  categoryId?: string;
};

export function ProductRelationSelects({
  sectors,
  categories,
  productTypes,
  valueAddCategories,
  certifications,
  defaults,
  selectedCertificationIds,
}: {
  sectors: Option[];
  categories: Option[];
  productTypes: Option[];
  valueAddCategories: Option[];
  certifications: Option[];
  defaults: { sectorId?: string; categoryId?: string; productTypeId?: string; valueAddCategoryId?: string };
  selectedCertificationIds: string[];
}) {
  const [sectorId, setSectorId] = useState(defaults.sectorId || sectors[0]?.id || "");
  const availableCategories = categories.filter((item) => item.sectorId === sectorId);
  const firstCategoryWithType = availableCategories.find((category) =>
    productTypes.some((productType) =>
      productType.sectorId === sectorId && productType.categoryId === category.id,
    ),
  );
  const initialCategory = availableCategories.some((item) => item.id === defaults.categoryId)
    ? defaults.categoryId!
    : firstCategoryWithType?.id || availableCategories[0]?.id || "";
  const [categoryId, setCategoryId] = useState(initialCategory);
  const effectiveCategoryId = availableCategories.some((item) => item.id === categoryId) ? categoryId : initialCategory;
  const availableTypes = productTypes.filter((item) => item.sectorId === sectorId && item.categoryId === effectiveCategoryId);
  const availableValueAddCategories = valueAddCategories.filter((item) => item.sectorId === sectorId);
  const availableCertifications = certifications.filter((item) => item.sectorId === sectorId);

  return <>
    <Field label="Sector"><Select name="sectorId" onChange={(event) => { setSectorId(event.target.value); setCategoryId(""); }} required value={sectorId}>{sectors.map((x) => <option key={x.id} value={x.id}>{x.key}</option>)}</Select></Field>
    <Field label="Category"><Select name="categoryId" onChange={(event) => setCategoryId(event.target.value)} required value={effectiveCategoryId}>{availableCategories.map((x) => {
      const hasProductType = productTypes.some((productType) =>
        productType.sectorId === sectorId && productType.categoryId === x.id,
      );
      return <option key={x.id} value={x.id}>{x.key}{hasProductType ? "" : " — ürün tipi yok"}</option>;
    })}</Select></Field>
    <Field label="Product type"><Select defaultValue={availableTypes.some((item) => item.id === defaults.productTypeId) ? defaults.productTypeId : availableTypes[0]?.id ?? ""} key={`${sectorId}:${effectiveCategoryId}`} name="productTypeId" required>
      {availableTypes.length
        ? availableTypes.map((x) => <option key={x.id} value={x.id}>{x.key}</option>)
        : <option disabled value="">Bu kategoride ürün tipi tanımlı değil</option>}
    </Select></Field>
    <Field label="Katma değer kategorisi"><Select defaultValue={availableValueAddCategories.some((item) => item.id === defaults.valueAddCategoryId) ? defaults.valueAddCategoryId : availableValueAddCategories[0]?.id ?? ""} key={`value-add:${sectorId}`} name="valueAddCategoryId" required>
      {availableValueAddCategories.length
        ? availableValueAddCategories.map((item) => <option key={item.id} value={item.id}>{item.key}</option>)
        : <option disabled value="">Bu sektörde katma değer tanımlı değil</option>}
    </Select></Field>
    <fieldset className="grid gap-2 md:col-span-2 xl:col-span-3"><legend className="mb-2 font-semibold">Sertifikalar</legend>{availableCertifications.map((cert) => <label className="text-sm" key={cert.id}><input defaultChecked={selectedCertificationIds.includes(cert.id)} name="certificationIds" type="checkbox" value={cert.id} /> {cert.key}</label>)}</fieldset>
  </>;
}

export function SectorDepartmentSelects({
  sectors,
  departments,
  defaults,
}: {
  sectors: Option[];
  departments: Option[];
  defaults: { sectorId?: string; departmentId?: string };
}) {
  const [sectorId, setSectorId] = useState(defaults.sectorId || sectors[0]?.id || "");
  const available = departments.filter((item) => item.sectorId === sectorId);
  return <>
    <Field label="Sektör"><Select name="sectorId" onChange={(event) => setSectorId(event.target.value)} required value={sectorId}>{sectors.map((x) => <option key={x.id} value={x.id}>{x.name ?? x.key}</option>)}</Select></Field>
    <Field label="Departman"><Select defaultValue={available.some((item) => item.id === defaults.departmentId) ? defaults.departmentId : available[0]?.id} key={sectorId} name="departmentId" required>{available.map((x) => <option key={x.id} value={x.id}>{x.name ?? x.key}</option>)}</Select></Field>
  </>;
}
