import assert from "node:assert/strict"
import test from "node:test"

import { productionQueueCopy } from "../production-queue-copy"
import {
  getProductionQueueUpstreamWaitKind,
  isWaitingForUpstreamInput,
} from "./queue-upstream-wait"

test("baskı ve nakış kesimi, yıkama ve boyama dikimi bekler", () => {
  assert.equal(getProductionQueueUpstreamWaitKind("printing", 1), "cutting")
  assert.equal(getProductionQueueUpstreamWaitKind("embroidery", 2), "cutting")
  assert.equal(getProductionQueueUpstreamWaitKind("washing", 1), "sewing")
  assert.equal(getProductionQueueUpstreamWaitKind("dyeing", 3), "sewing")
})

test("uyarı olmayan veya desteklenmeyen departman genel boş durumu kullanır", () => {
  assert.equal(getProductionQueueUpstreamWaitKind("printing", 0), null)
  assert.equal(getProductionQueueUpstreamWaitKind("sewing", 1), null)
  assert.equal(getProductionQueueUpstreamWaitKind("ironing_packing", 1), null)
})

test("yalnızca girdisi tükenmiş ve fasonda olmayan iş üst süreci bekler", () => {
  const waitingInput = {
    completedQuantity: 0,
    inOutsourceQuantity: 0,
    inputReadyQuantity: 0,
    internalAvailableQuantity: 0,
    remainingQuantity: 100,
  }

  assert.equal(isWaitingForUpstreamInput(waitingInput), true)
  assert.equal(
    isWaitingForUpstreamInput({
      ...waitingInput,
      inputReadyQuantity: 100,
      internalAvailableQuantity: 100,
    }),
    false,
  )
  assert.equal(
    isWaitingForUpstreamInput({
      ...waitingInput,
      inOutsourceQuantity: 100,
      inputReadyQuantity: 100,
    }),
    false,
  )
  assert.equal(
    isWaitingForUpstreamInput({
      ...waitingInput,
      remainingQuantity: 0,
    }),
    false,
  )
})

test("bekleme mesajları iki dilde doğru süreci açıklar", () => {
  assert.equal(
    productionQueueCopy.tr.ui.empty.upstreamWait.cutting.title,
    "Ürünlerin kesimi bekleniyor",
  )
  assert.equal(
    productionQueueCopy.tr.ui.empty.upstreamWait.sewing.title,
    "Ürünlerin dikimi bekleniyor",
  )
  assert.equal(
    productionQueueCopy.en.ui.empty.upstreamWait.cutting.title,
    "Waiting for cutting to finish",
  )
  assert.equal(
    productionQueueCopy.en.ui.empty.upstreamWait.sewing.title,
    "Waiting for sewing to finish",
  )
})

test("İngilizce ütü-paket başlama etiketi kolona sığacak şekilde kısadır", () => {
  const actionLabel =
    productionQueueCopy.en.service.actionLabel.ironing_packing

  assert.equal(actionLabel, "IR & Pack")
  assert.equal(
    productionQueueCopy.en.service.queueStart.today(actionLabel),
    "IR & Pack today",
  )
  assert.equal(
    productionQueueCopy.en.service.queueStart.later(actionLabel, 2),
    "IR & Pack in 2 days",
  )
})
