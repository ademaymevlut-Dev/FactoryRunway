import { resolveLocalizedShowcaseProduct } from "../../catalog-resolver";
import type {
  ResolvedShiftSimulationDepartment,
  ShiftSimulationLocale,
  ShiftSimulationSceneCopy,
  ShiftSimulationSceneData,
  ShiftSimulationSceneModel,
} from "./shift-simulation-scene-types";

function assertUnique(values: readonly string[], field: string) {
  if (new Set(values).size !== values.length) {
    throw new Error(`${field} değerleri benzersiz olmalı.`);
  }
}

function assertNonNegativeInteger(value: number, field: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} pozitif veya sıfır tam sayı olmalı.`);
  }
}

function validateCallouts(copy: ShiftSimulationSceneCopy) {
  assertUnique(
    copy.callouts.map((callout) => callout.id),
    "Callout id",
  );
  assertUnique(
    copy.callouts.map((callout) => callout.target),
    "Callout target",
  );
}

export function createShiftSimulationSceneModel(
  data: ShiftSimulationSceneData,
  locale: ShiftSimulationLocale,
  copy: ShiftSimulationSceneCopy,
): ShiftSimulationSceneModel {
  if (data.productKey !== "backham_blazer") {
    throw new Error("Shift showcase ana ürünü backham_blazer olmalı.");
  }

  if (data.shift.playbackDurationMs <= 0) {
    throw new Error("Shift playback süresi pozitif olmalı.");
  }

  if (data.departments.length !== 3) {
    throw new Error("Shift showcase tam olarak üç departman içermeli.");
  }

  assertUnique(
    data.departments.map((department) => department.departmentKey),
    "Department key",
  );
  assertUnique(
    data.events.map((event) => event.id),
    "Event id",
  );
  validateCallouts(copy);

  const product = resolveLocalizedShowcaseProduct(data.productKey, locale);
  const departments = data.departments.map<ResolvedShiftSimulationDepartment>(
    (department) => {
      assertNonNegativeInteger(
        department.inputQuantity,
        `${department.departmentKey}.inputQuantity`,
      );
      assertNonNegativeInteger(
        department.plannedQuantity,
        `${department.departmentKey}.plannedQuantity`,
      );
      assertNonNegativeInteger(
        department.actualQuantity,
        `${department.departmentKey}.actualQuantity`,
      );

      if (
        department.utilizationPercent < 0 ||
        department.utilizationPercent > 100
      ) {
        throw new Error(
          `${department.departmentKey}.utilizationPercent 0-100 aralığında olmalı.`,
        );
      }

      const resolvedProduct = resolveLocalizedShowcaseProduct(
        department.productKey,
        locale,
      );
      const routeStep = resolvedProduct.route.find(
        (step) => step.departmentKey === department.departmentKey,
      );

      if (!routeStep) {
        throw new Error(
          `Shift department route bulunamadı: ${department.productKey}/${department.departmentKey}/${locale}`,
        );
      }

      if (
        department.status === "on_plan" &&
        department.actualQuantity !== department.plannedQuantity
      ) {
        throw new Error(
          `Planla uyumlu departman sonucu eşleşmiyor: ${department.departmentKey}`,
        );
      }

      if (
        department.status === "bottleneck" &&
        department.actualQuantity >= department.plannedQuantity
      ) {
        throw new Error(
          `Darboğaz sonucu planın altında olmalı: ${department.departmentKey}`,
        );
      }

      return {
        ...department,
        achievementPercent:
          department.plannedQuantity === 0
            ? 0
            : Math.round(
                (department.actualQuantity / department.plannedQuantity) * 100,
              ),
        departmentName: routeStep.label,
        difference:
          department.actualQuantity - department.plannedQuantity,
        product: resolvedProduct,
        routeStep,
      };
    },
  );
  const departmentsByKey = Object.fromEntries(
    departments.map((department) => [
      department.departmentKey,
      department,
    ]),
  ) as Record<string, ResolvedShiftSimulationDepartment>;
  const events = data.events.map((event) => {
    const department = departmentsByKey[event.departmentKey];
    const eventCopy = copy.eventCopies[event.code];

    if (!department) {
      throw new Error(`Shift event departmanı bulunamadı: ${event.id}`);
    }

    if (!eventCopy) {
      throw new Error(`Shift event copy bulunamadı: ${event.code}`);
    }

    if (event.triggerProgress < 0 || event.triggerProgress > 1) {
      throw new Error(`Shift event progress geçersiz: ${event.id}`);
    }

    if (
      event.impactPercent !== undefined &&
      (event.impactPercent < 0 || event.impactPercent > 100)
    ) {
      throw new Error(`Shift event impact geçersiz: ${event.id}`);
    }

    return {
      ...event,
      copy: eventCopy,
      departmentName: department.departmentName,
    };
  });
  const finishedGoods = data.finishedGoods.map((item) => ({
    ...item,
    product: resolveLocalizedShowcaseProduct(item.productKey, locale),
  }));
  const ironingResult = departmentsByKey.ironing_packing;

  if (
    finishedGoods.length !== 1 ||
    finishedGoods[0]?.productKey !== data.productKey ||
    finishedGoods[0].quantity !== ironingResult?.actualQuantity
  ) {
    throw new Error(
      "Finished goods yalnızca Ütü-Paket gerçekleşen çıktısıyla eşleşmeli.",
    );
  }

  return {
    departments,
    departmentsByKey,
    events,
    finishedGoods,
    product,
    totalWorkload: product.route.reduce(
      (total, step) => total + step.workloadPointsPerUnit,
      0,
    ),
  };
}
