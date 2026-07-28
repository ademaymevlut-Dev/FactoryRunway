export const PLAYER_FEEDBACK_MIN_CHARACTERS = 2
export const PLAYER_FEEDBACK_MAX_CHARACTERS = 600
export const PLAYER_FEEDBACK_CLIENT_REQUEST_ID_MAX_LENGTH = 100

export type PlayerFeedbackValidationResult =
  | {
      ok: true
      body: string
      characterCount: number
    }
  | {
      ok: false
      code: "MESSAGE_TOO_SHORT" | "MESSAGE_TOO_LONG"
      characterCount: number
    }

export function normalizePlayerFeedbackBody(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .normalize("NFC")
}

export function countPlayerFeedbackCharacters(value: string) {
  return Array.from(value).length
}

export function validatePlayerFeedbackBody(
  value: string,
): PlayerFeedbackValidationResult {
  const body = normalizePlayerFeedbackBody(value)
  const characterCount = countPlayerFeedbackCharacters(body)

  if (characterCount < PLAYER_FEEDBACK_MIN_CHARACTERS) {
    return {
      characterCount,
      code: "MESSAGE_TOO_SHORT",
      ok: false,
    }
  }

  if (characterCount > PLAYER_FEEDBACK_MAX_CHARACTERS) {
    return {
      characterCount,
      code: "MESSAGE_TOO_LONG",
      ok: false,
    }
  }

  return {
    body,
    characterCount,
    ok: true,
  }
}

export function isValidPlayerFeedbackClientRequestId(value: string) {
  return (
    value.length >= 8 &&
    value.length <= PLAYER_FEEDBACK_CLIENT_REQUEST_ID_MAX_LENGTH &&
    /^[a-zA-Z0-9_-]+$/.test(value)
  )
}
