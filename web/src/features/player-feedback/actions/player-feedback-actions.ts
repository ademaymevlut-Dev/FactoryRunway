"use server"

import { USER_ROLES } from "@/lib/auth/roles"
import { getCurrentUser } from "@/lib/auth/session"
import { normalizeLocale, type SupportedLocale } from "@/lib/i18n/locales"

import {
  createPlayerFeedbackPost,
  deleteOwnPlayerFeedbackPost,
  PlayerFeedbackServiceError,
} from "../services/player-feedback-service"
import type {
  CreatePlayerFeedbackActionResult,
  DeletePlayerFeedbackActionResult,
} from "../types"

export async function createPlayerFeedbackAction(input: {
  body: string
  clientRequestId: string
  locale?: SupportedLocale
}): Promise<CreatePlayerFeedbackActionResult> {
  const auth = await getCurrentUser()

  if (!auth || auth.role !== USER_ROLES.PLAYER) {
    return {
      code: "UNAUTHORIZED",
      ok: false,
    }
  }

  try {
    const post = await createPlayerFeedbackPost({
      body: input.body,
      clientRequestId: input.clientRequestId,
      locale: normalizeLocale(input.locale),
      userId: auth.id,
    })

    return {
      ok: true,
      post,
    }
  } catch (error) {
    if (error instanceof PlayerFeedbackServiceError) {
      return {
        code: error.code,
        ok: false,
      }
    }

    console.error("Player feedback post could not be created.", error)

    return {
      code: "UNKNOWN_ERROR",
      ok: false,
    }
  }
}

export async function deletePlayerFeedbackAction(
  postId: string,
): Promise<DeletePlayerFeedbackActionResult> {
  const auth = await getCurrentUser()

  if (!auth || auth.role !== USER_ROLES.PLAYER) {
    return {
      code: "UNAUTHORIZED",
      ok: false,
    }
  }

  try {
    await deleteOwnPlayerFeedbackPost({
      postId,
      userId: auth.id,
    })

    return {
      ok: true,
      postId,
    }
  } catch (error) {
    if (error instanceof PlayerFeedbackServiceError) {
      return {
        code: error.code,
        ok: false,
      }
    }

    console.error("Player feedback post could not be deleted.", error)

    return {
      code: "UNKNOWN_ERROR",
      ok: false,
    }
  }
}
