import assert from "node:assert/strict"
import test from "node:test"

import {
  countPlayerFeedbackCharacters,
  isValidPlayerFeedbackClientRequestId,
  normalizePlayerFeedbackBody,
  PLAYER_FEEDBACK_MAX_CHARACTERS,
  validatePlayerFeedbackBody,
} from "./player-feedback-validation"

test("oyuncu fikri boşlukları ve kontrol karakterlerini güvenli biçimde temizler", () => {
  assert.equal(
    normalizePlayerFeedbackBody("  İlk satır\r\n\r\n\r\n\r\nİkinci\u0000  "),
    "İlk satır\n\n\nİkinci",
  )
})

test("emoji bir karakter olarak sayılır ve iki karakterlik mesaj kabul edilir", () => {
  assert.equal(countPlayerFeedbackCharacters("💡"), 1)
  assert.deepEqual(validatePlayerFeedbackBody("💡👍"), {
    body: "💡👍",
    characterCount: 2,
    ok: true,
  })
})

test("kısa ve 600 karakteri aşan mesajlar reddedilir", () => {
  assert.deepEqual(validatePlayerFeedbackBody("a"), {
    characterCount: 1,
    code: "MESSAGE_TOO_SHORT",
    ok: false,
  })

  const tooLong = "a".repeat(PLAYER_FEEDBACK_MAX_CHARACTERS + 1)
  assert.deepEqual(validatePlayerFeedbackBody(tooLong), {
    characterCount: PLAYER_FEEDBACK_MAX_CHARACTERS + 1,
    code: "MESSAGE_TOO_LONG",
    ok: false,
  })
})

test("istemci istek anahtarı idempotency için sınırlı ve güvenlidir", () => {
  assert.equal(isValidPlayerFeedbackClientRequestId("request_123"), true)
  assert.equal(isValidPlayerFeedbackClientRequestId("short"), false)
  assert.equal(isValidPlayerFeedbackClientRequestId("request 123"), false)
})
