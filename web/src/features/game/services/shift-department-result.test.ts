import assert from "node:assert/strict";
import test from "node:test";

import {
  addDepartmentQueueEntry,
  buildDepartmentQueueSnapshot,
  buildShiftDepartmentResultRows,
} from "./shift-department-result";

function buildRows(input: {
  ending?: number;
  entered?: number;
  lineResults?: Parameters<typeof buildShiftDepartmentResultRows>[0]["lineResults"];
  starting?: number;
}) {
  return buildShiftDepartmentResultRows({
    endingQueueByDepartmentId: new Map([["sewing", input.ending ?? 0]]),
    factoryId: "factory-1",
    lineResults: input.lineResults ?? [],
    queueEnteredByDepartmentId: new Map([["sewing", input.entered ?? 0]]),
    shiftSimulationId: "shift-1",
    startingQueueByDepartmentId: new Map([["sewing", input.starting ?? 0]]),
  });
}

test("800 başlangıç kuyruğundan 650 üretildiğinde 150 kalan kaydeder", () => {
  const [result] = buildRows({
    ending: 150,
    lineResults: [
      {
        departmentId: "sewing",
        effectivePointCapacity: 800,
        line: { id: "line-1" },
        producedQuantity: 650,
        usedPoints: 650,
      },
    ],
    starting: 800,
  });

  assert.equal(result?.startingQueueQuantity, 800);
  assert.equal(result?.queueEnteredQuantity, 0);
  assert.equal(result?.producedQuantity, 650);
  assert.equal(result?.endingQueueQuantity, 150);
  assert.ok((result?.productionEndMinute ?? 540) < 540);
});

test("boş başlangıç kuyruğuna giren 650 ürün aynı gün üretilmeden kalır", () => {
  const [result] = buildRows({ ending: 650, entered: 650 });

  assert.equal(result?.startingQueueQuantity, 0);
  assert.equal(result?.queueEnteredQuantity, 650);
  assert.equal(result?.producedQuantity, 0);
  assert.equal(result?.endingQueueQuantity, 650);
  assert.equal(result?.productionEndMinute, null);
});

test("gerçek kuyruk mutasyonlarını departman bazında biriktirir", () => {
  const entries = new Map<string, number>();

  addDepartmentQueueEntry(entries, "packing", 400);
  addDepartmentQueueEntry(entries, "packing", 250);
  addDepartmentQueueEntry(entries, "packing", 0);

  assert.equal(entries.get("packing"), 650);
});

test("birden fazla aktif hattı toplar ve tam kullanılan hattı 540 dakikada bitirir", () => {
  const [result] = buildRows({
    ending: 0,
    lineResults: [
      {
        departmentId: "sewing",
        effectivePointCapacity: 500,
        line: { id: "line-1" },
        producedQuantity: 50,
        usedPoints: 500,
      },
      {
        departmentId: "sewing",
        effectivePointCapacity: 500,
        line: { id: "line-2" },
        producedQuantity: 100,
        usedPoints: 400,
      },
    ],
    starting: 150,
  });

  assert.equal(result?.activeLineCount, 2);
  assert.equal(result?.producedQuantity, 150);
  assert.equal(result?.productionEndMinute, 540);
});

test("farklı iş yükleri üretilen adet toplamını bozmaz", () => {
  const [result] = buildRows({
    lineResults: [
      {
        departmentId: "sewing",
        effectivePointCapacity: 300,
        line: { id: "line-1" },
        producedQuantity: 100,
        usedPoints: 300,
      },
      {
        departmentId: "sewing",
        effectivePointCapacity: 700,
        line: { id: "line-1" },
        producedQuantity: 50,
        usedPoints: 200,
      },
    ],
    starting: 150,
  });

  assert.equal(result?.producedQuantity, 150);
  assert.equal(result?.activeLineCount, 1);
  assert.equal(result?.productionEndMinute, 270);
});

test("tamamen sıfır departman sonucunu HUD veri setine almaz", () => {
  assert.deepEqual(buildRows({}), []);
});

test("kümülatif route kayıtlarından yalnızca gerçek hazır kuyruğu snapshot eder", () => {
  const snapshot = buildDepartmentQueueSnapshot([
    {
      completedQuantity: 200,
      departmentId: "cutting",
      inOutsourceQuantity: 50,
      inputReadyQuantity: 800,
      plannedQuantity: 1_000,
    },
    {
      completedQuantity: 0,
      departmentId: "cutting",
      inOutsourceQuantity: 0,
      inputReadyQuantity: 100,
      plannedQuantity: 100,
    },
  ]);

  assert.equal(snapshot.get("cutting"), 650);
});
