import { NextRequest, NextResponse } from "next/server"

import { USER_ROLES } from "@/lib/auth/roles"
import { getCurrentUser } from "@/lib/auth/session"
import {
  getPlayerFeedbackPage,
  PlayerFeedbackServiceError,
} from "@/features/player-feedback/services/player-feedback-service"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await getCurrentUser()

  if (!auth || auth.role !== USER_ROLES.PLAYER) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", ok: false },
      {
        headers: { "Cache-Control": "no-store" },
        status: 401,
      },
    )
  }

  try {
    const feedback = await getPlayerFeedbackPage({
      cursor: request.nextUrl.searchParams.get("cursor"),
      viewerUserId: auth.id,
    })

    return NextResponse.json(
      {
        feedback,
        ok: true,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    )
  } catch (error) {
    const code =
      error instanceof PlayerFeedbackServiceError
        ? error.code
        : "UNKNOWN_ERROR"

    if (!(error instanceof PlayerFeedbackServiceError)) {
      console.error("Player feedback feed could not be loaded.", error)
    }

    return NextResponse.json(
      { code, ok: false },
      {
        headers: { "Cache-Control": "no-store" },
        status: code === "INVALID_REQUEST" ? 400 : 500,
      },
    )
  }
}
