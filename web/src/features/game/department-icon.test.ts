import assert from "node:assert/strict";
import test from "node:test";

import { resolveDepartmentIconKey } from "./department-icon";

test("departman anahtarlarını mevcut dock SVG ikonlarına çözer", () => {
  assert.equal(
    resolveDepartmentIconKey({ departmentKey: "cutting" }),
    "scissors",
  );
  assert.equal(
    resolveDepartmentIconKey({ departmentKey: "sewing" }),
    "shirt",
  );
  assert.equal(
    resolveDepartmentIconKey({ departmentKey: "ironing_packing" }),
    "package_check",
  );
});

test("yönetimden gelen özel ikon anahtarını normalize ederek korur", () => {
  assert.equal(
    resolveDepartmentIconKey({
      configuredIconKey: "Paint-Bucket",
      departmentKey: "dyeing",
    }),
    "paint_bucket",
  );
});

test("bilinmeyen departmanda güvenli warehouse ikonuna düşer", () => {
  assert.equal(
    resolveDepartmentIconKey({ departmentKey: "future_department" }),
    "warehouse",
  );
});
