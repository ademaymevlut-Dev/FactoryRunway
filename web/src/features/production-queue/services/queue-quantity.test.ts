import assert from "node:assert/strict"
import test from "node:test"

import { calculateQueueQuantities } from "./queue-quantity"

test("departman kuyruğu yalnızca önceki aşamadan hazır gelen miktarı kalan gösterir", () => {
  assert.deepEqual(
    calculateQueueQuantities({
      completedQuantity: 600,
      inOutsourceQuantity: 0,
      inputReadyQuantity: 1_400,
      plannedQuantity: 4_500,
    }),
    {
      completedQuantity: 600,
      inputReadyQuantity: 1_400,
      queueRemainingQuantity: 800,
      remainingQuantity: 3_900,
    },
  )
})

test("fasona gönderilen miktar iç üretim kuyruğunda kalan sayılmaz", () => {
  assert.equal(
    calculateQueueQuantities({
      completedQuantity: 600,
      inOutsourceQuantity: 300,
      inputReadyQuantity: 1_400,
      plannedQuantity: 4_500,
    }).queueRemainingQuantity,
    500,
  )
})
