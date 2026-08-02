const DEFAULT_DEPARTMENT_ICON_KEYS: Readonly<Record<string, string>> = {
  accessory_warehouse: "warehouse",
  cutting: "scissors",
  dyeing: "paint_bucket",
  embroidery: "needle",
  fabric_warehouse: "warehouse",
  ironing_packing: "package_check",
  printing: "printer",
  product_warehouse: "warehouse",
  sewing: "shirt",
  shipping: "truck",
  warehouse: "warehouse",
  washing: "waves",
};

export function resolveDepartmentIconKey({
  configuredIconKey,
  departmentKey,
  groupKey = departmentKey,
}: {
  configuredIconKey?: string | null;
  departmentKey: string;
  groupKey?: string;
}) {
  const iconKey =
    configuredIconKey ??
    DEFAULT_DEPARTMENT_ICON_KEYS[groupKey] ??
    DEFAULT_DEPARTMENT_ICON_KEYS[departmentKey] ??
    "warehouse";

  return iconKey.trim().toLocaleLowerCase("en-US").replace(/-/g, "_");
}
