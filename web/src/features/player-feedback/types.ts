import type { PlayerFeedbackStatus } from "@/generated/prisma/enums"

export type PlayerFeedbackPostView = {
  id: string
  author: {
    displayName: string
    playerProfileId: string
  }
  body: string
  createdAt: string
  isOwn: boolean
  locale: string
}

export type PlayerFeedbackPageView = {
  entries: PlayerFeedbackPostView[]
  nextCursor: string | null
}

export type AdminPlayerFeedbackPostView = PlayerFeedbackPostView & {
  deletedAt: string | null
  moderatedAt: string | null
  moderationNote: string | null
  status: PlayerFeedbackStatus
}

export type PlayerFeedbackActionErrorCode =
  | "INVALID_REQUEST"
  | "MESSAGE_TOO_SHORT"
  | "MESSAGE_TOO_LONG"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "UNKNOWN_ERROR"

export type CreatePlayerFeedbackActionResult =
  | {
      ok: true
      post: PlayerFeedbackPostView
    }
  | {
      code: PlayerFeedbackActionErrorCode
      ok: false
    }

export type DeletePlayerFeedbackActionResult =
  | {
      ok: true
      postId: string
    }
  | {
      code: PlayerFeedbackActionErrorCode
      ok: false
    }
