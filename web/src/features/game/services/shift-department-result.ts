import type { Prisma } from "@/generated/prisma/client";

export const SHIFT_GAME_DURATION_MINUTES = 540;

export type QueueSnapshotRow = {
  completedQuantity: number;
  departmentId: string;
  inOutsourceQuantity: number;
  inputReadyQuantity: number;
  plannedQuantity: number;
};

export type DepartmentLineResult = {
  departmentId: string;
  effectivePointCapacity: number;
  line: { id: string };
  producedQuantity: number;
  usedPoints: number;
};

export function buildDepartmentQueueSnapshot(rows: QueueSnapshotRow[]) {
  const snapshot = new Map<string, number>();

  for (const row of rows) {
    const availableQuantity = getAvailableQuantity(row);

    if (availableQuantity <= 0) continue;

    snapshot.set(
      row.departmentId,
      (snapshot.get(row.departmentId) ?? 0) + availableQuantity,
    );
  }

  return snapshot;
}

export function getAvailableQuantity(input: {
  completedQuantity: number;
  inOutsourceQuantity: number;
  inputReadyQuantity: number;
  plannedQuantity: number;
}) {
  return Math.max(
    0,
    Math.min(
      input.plannedQuantity - input.completedQuantity,
      input.inputReadyQuantity -
        input.completedQuantity -
        input.inOutsourceQuantity,
    ),
  );
}

export function addDepartmentQueueEntry(
  queueEnteredByDepartmentId: Map<string, number>,
  departmentId: string,
  quantity: number,
) {
  if (quantity <= 0) return;

  queueEnteredByDepartmentId.set(
    departmentId,
    (queueEnteredByDepartmentId.get(departmentId) ?? 0) + quantity,
  );
}

export function buildShiftDepartmentResultRows(input: {
  endingQueueByDepartmentId: Map<string, number>;
  factoryId: string;
  lineResults: DepartmentLineResult[];
  queueEnteredByDepartmentId: Map<string, number>;
  shiftSimulationId: string;
  startingQueueByDepartmentId: Map<string, number>;
}): Prisma.ShiftDepartmentResultCreateManyInput[] {
  const lineTotals = buildDepartmentLineTotals(input.lineResults);
  const departmentIds = new Set([
    ...input.startingQueueByDepartmentId.keys(),
    ...input.queueEnteredByDepartmentId.keys(),
    ...input.endingQueueByDepartmentId.keys(),
    ...lineTotals.keys(),
  ]);

  return Array.from(departmentIds)
    .map((departmentId) => {
      const lineTotal = lineTotals.get(departmentId);
      const startingQueueQuantity =
        input.startingQueueByDepartmentId.get(departmentId) ?? 0;
      const queueEnteredQuantity =
        input.queueEnteredByDepartmentId.get(departmentId) ?? 0;
      const producedQuantity = lineTotal?.producedQuantity ?? 0;
      const endingQueueQuantity =
        input.endingQueueByDepartmentId.get(departmentId) ?? 0;

      return {
        activeLineCount: lineTotal?.activeLineCount ?? 0,
        departmentId,
        endingQueueQuantity,
        factoryId: input.factoryId,
        producedQuantity,
        productionEndMinute: lineTotal?.productionEndMinute ?? null,
        productionStartMinute: producedQuantity > 0 ? 0 : null,
        queueEnteredQuantity,
        shiftSimulationId: input.shiftSimulationId,
        startingQueueQuantity,
      } satisfies Prisma.ShiftDepartmentResultCreateManyInput;
    })
    .filter(
      (result) =>
        result.startingQueueQuantity > 0 ||
        result.queueEnteredQuantity > 0 ||
        result.producedQuantity > 0 ||
        result.endingQueueQuantity > 0,
    );
}

function buildDepartmentLineTotals(lineResults: DepartmentLineResult[]) {
  const departments = new Map<
    string,
    {
      activeLineIds: Set<string>;
      lineCapacity: Map<string, number>;
      lineUsedPoints: Map<string, number>;
      producedQuantity: number;
    }
  >();

  for (const result of lineResults) {
    const department = departments.get(result.departmentId) ?? {
      activeLineIds: new Set<string>(),
      lineCapacity: new Map<string, number>(),
      lineUsedPoints: new Map<string, number>(),
      producedQuantity: 0,
    };
    const lineId = result.line.id;

    department.lineCapacity.set(
      lineId,
      (department.lineCapacity.get(lineId) ?? 0) +
        Math.max(0, result.effectivePointCapacity),
    );
    department.lineUsedPoints.set(
      lineId,
      (department.lineUsedPoints.get(lineId) ?? 0) +
        Math.max(0, result.usedPoints),
    );
    department.producedQuantity += Math.max(0, result.producedQuantity);

    if (result.producedQuantity > 0) {
      department.activeLineIds.add(lineId);
    }

    departments.set(result.departmentId, department);
  }

  return new Map(
    Array.from(departments.entries()).map(([departmentId, department]) => {
      const longestActiveLineRatio = Array.from(department.activeLineIds).reduce(
        (maximum, lineId) => {
          const capacity = department.lineCapacity.get(lineId) ?? 0;
          const usedPoints = department.lineUsedPoints.get(lineId) ?? 0;
          const ratio = capacity > 0 ? Math.min(1, usedPoints / capacity) : 1;

          return Math.max(maximum, ratio);
        },
        0,
      );
      const productionEndMinute =
        department.producedQuantity > 0
          ? Math.max(
              1,
              Math.min(
                SHIFT_GAME_DURATION_MINUTES,
                Math.ceil(longestActiveLineRatio * SHIFT_GAME_DURATION_MINUTES),
              ),
            )
          : null;

      return [
        departmentId,
        {
          activeLineCount: department.activeLineIds.size,
          producedQuantity: department.producedQuantity,
          productionEndMinute,
        },
      ];
    }),
  );
}
