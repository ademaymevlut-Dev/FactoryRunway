import assert from "node:assert/strict"
import test from "node:test"

import {
  calculateDueSettlement,
  calculateEffectiveShippingDay,
  calculateReceivableDueDay,
  calculateShippingState,
} from "./shipping-math"

test("hazır sipariş hedef gününde sevk edilir", () => {
  assert.deepEqual(
    calculateShippingState({
      completedQuantity: 4_500,
      currentDay: 20,
      shippedQuantity: 0,
      targetDeliveryDay: 20,
      totalQuantity: 4_500,
    }),
    {
      isDeliveryDayReached: true,
      isReadyToShip: true,
      lateDays: 0,
      quantityToShip: 4_500,
    },
  )
})

test("eksik üretim hedef günü gelse bile sevk edilmez", () => {
  assert.equal(
    calculateShippingState({
      completedQuantity: 4_000,
      currentDay: 20,
      shippedQuantity: 0,
      targetDeliveryDay: 20,
      totalQuantity: 4_500,
    }).quantityToShip,
    0,
  )
})

test("satış alacağı vade gününde kalan tutar kadar kasaya girer", () => {
  assert.equal(
    calculateReceivableDueDay({ paymentTermDays: 7, shippedDay: 20 }),
    27,
  )
  assert.deepEqual(
    calculateDueSettlement({
      amountCents: BigInt(100_000),
      balanceCents: BigInt(250_000),
      settledAmountCents: BigInt(25_000),
    }),
    {
      balanceAfterCents: BigInt(325_000),
      remainingAmountCents: BigInt(75_000),
    },
  )
})

test("geçmiş hazır siparişin sevk ve vade tarihi üretim geçmişinden geri kazanılır", () => {
  const shippedDay = calculateEffectiveShippingDay({
    completedDay: 13,
    currentDay: 29,
    targetDeliveryDay: 11,
  })

  assert.equal(shippedDay, 13)
  assert.equal(
    calculateReceivableDueDay({ paymentTermDays: 7, shippedDay }),
    20,
  )
})
