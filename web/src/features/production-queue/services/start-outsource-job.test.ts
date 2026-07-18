import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ProductionOrderStatus,
  RouteProcessingMode,
  RouteProgressStatus,
} from "@/generated/prisma/client";

import { resolveOutsourceReservationState } from "./start-outsource-job";

test("aktif iç hat varken fasona ayrılmayan miktar üretim kuyruğunda kalır", () => {
  const state = resolveOutsourceReservationState({
    activeLineCount: 1,
    canOutsource: true,
    completedQuantity: 0,
    departmentId: "printing",
    inOutsourceQuantity: 0,
    inputReadyQuantity: 1_000,
    plannedQuantity: 1_000,
    reservedQuantity: 600,
  });

  assert.equal(state.quantities.internalAvailableQuantity, 400);
  assert.equal(state.processingMode, RouteProcessingMode.INTERNAL);
  assert.equal(state.routeStatus, RouteProgressStatus.READY);
  assert.equal(state.orderStatus, ProductionOrderStatus.IN_PROGRESS);
});

test("hazır miktarın tamamı fasona ayrılırsa rota fason dönüşünü bekler", () => {
  const state = resolveOutsourceReservationState({
    activeLineCount: 1,
    canOutsource: true,
    completedQuantity: 0,
    departmentId: "embroidery",
    inOutsourceQuantity: 0,
    inputReadyQuantity: 800,
    plannedQuantity: 800,
    reservedQuantity: 800,
  });

  assert.equal(state.quantities.internalAvailableQuantity, 0);
  assert.equal(state.processingMode, RouteProcessingMode.OUTSOURCE);
  assert.equal(state.routeStatus, RouteProgressStatus.WAITING_OUTSOURCE);
  assert.equal(state.orderStatus, ProductionOrderStatus.WAITING_OUTSOURCE);
});

test("fason servisi miktar rezervasyonu, vardiya kilidi ve idempotency anahtarı kullanır", () => {
  const source = readFileSync(new URL("./start-outsource-job.ts", import.meta.url), "utf8");

  assert.match(source, /isolationLevel: Prisma\.TransactionIsolationLevel\.Serializable/);
  assert.match(source, /status: ProductionPlanStatus\.LOCKED/);
  assert.match(source, /status: ShiftSimulationStatus\.RUNNING/);
  assert.match(source, /id: input\.job\.requestId/);
  assert.match(source, /inOutsourceQuantity: \{ increment: input\.job\.quantity \}/);
  assert.match(source, /input\.job\.quantity > quantities\.internalAvailableQuantity/);
});
