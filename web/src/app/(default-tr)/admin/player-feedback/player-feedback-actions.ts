"use server"

import { revalidatePath } from "next/cache"

import { PlayerFeedbackStatus } from "@/generated/prisma/enums"
import {
  moderatePlayerFeedbackPost,
  PlayerFeedbackServiceError,
} from "@/features/player-feedback/services/player-feedback-service"

import { requireAdminUser } from "../admin-auth"
import type { AdminActionState } from "../product-form-state"

const PAGE_PATH = "/admin/player-feedback"

export async function moderatePlayerFeedbackAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdminUser()
  const postId = String(formData.get("postId") ?? "")
  const requestedStatus = String(formData.get("status") ?? "")
  const moderationNote = String(formData.get("moderationNote") ?? "")
  const status =
    requestedStatus === PlayerFeedbackStatus.HIDDEN
      ? PlayerFeedbackStatus.HIDDEN
      : requestedStatus === PlayerFeedbackStatus.PUBLISHED
        ? PlayerFeedbackStatus.PUBLISHED
        : null

  if (!status) {
    return {
      message: "Geçersiz moderasyon işlemi.",
      status: "error",
    }
  }

  try {
    await moderatePlayerFeedbackPost({
      adminUserId: admin.id,
      moderationNote,
      postId,
      status,
    })
    revalidatePath(PAGE_PATH)

    return {
      entityId: postId,
      message:
        status === PlayerFeedbackStatus.HIDDEN
          ? "Fikir oyuncu panelinden gizlendi."
          : "Fikir yeniden yayınlandı.",
      status: "success",
    }
  } catch (error) {
    if (error instanceof PlayerFeedbackServiceError) {
      return {
        message:
          error.code === "NOT_FOUND"
            ? "Fikir bulunamadı veya durumu daha önce değiştirilmiş."
            : "Moderasyon işlemi tamamlanamadı.",
        status: "error",
      }
    }

    console.error("Player feedback moderation failed.", error)

    return {
      message: "Moderasyon işlemi tamamlanamadı.",
      status: "error",
    }
  }
}
