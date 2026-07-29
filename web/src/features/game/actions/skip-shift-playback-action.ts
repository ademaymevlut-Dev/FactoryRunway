"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ShiftSimulationStatus } from "@/generated/prisma/client";
import { USER_ROLES } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";
import { normalizeLocale } from "@/lib/i18n/locales";

import { shiftPlaybackCopy } from "../shift-playback-copy";
import { SKIPPED_SHIFT_PLAYBACK_DURATION_SECONDS } from "../shift-playback";

export type SkipShiftPlaybackActionResult =
  | { ok: true }
  | {
      ok: false;
      code: "SHIFT_SKIP_FAILED";
      message: string;
    };

export async function skipShiftPlaybackAction(
  shiftIdInput: string,
): Promise<SkipShiftPlaybackActionResult> {
  const auth = await getCurrentUser();

  if (!auth) redirect("/");
  if (auth.role === USER_ROLES.ADMIN || auth.role === USER_ROLES.SUPER_ADMIN) {
    redirect("/admin");
  }

  const shiftId = shiftIdInput.trim();
  const prisma = getPrisma();
  const playerProfile = await prisma.playerProfile.findUnique({
    where: { userId: auth.id },
    select: {
      preferredLocale: true,
      factories: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          currentDay: true,
          id: true,
        },
      },
    },
  });
  const locale = normalizeLocale(playerProfile?.preferredLocale);
  const copy = shiftPlaybackCopy[locale].actions;
  const factory = playerProfile?.factories[0];

  if (!factory || !shiftId) {
    return {
      code: "SHIFT_SKIP_FAILED",
      message: copy.errors.SHIFT_SKIP_FAILED,
      ok: false,
    };
  }

  try {
    const update = await prisma.shiftSimulation.updateMany({
      where: {
        completedAt: { not: null },
        factoryId: factory.id,
        gameDay: factory.currentDay - 1,
        id: shiftId,
        status: ShiftSimulationStatus.COMPLETED,
      },
      data: {
        simulationDurationSeconds: SKIPPED_SHIFT_PLAYBACK_DURATION_SECONDS,
      },
    });

    if (update.count !== 1) {
      return {
        code: "SHIFT_SKIP_FAILED",
        message: copy.errors.SHIFT_SKIP_FAILED,
        ok: false,
      };
    }

    revalidatePath("/game");

    return { ok: true };
  } catch (error) {
    console.error("Shift playback skip failed.", {
      factoryId: factory.id,
      shiftId,
    }, error);

    return {
      code: "SHIFT_SKIP_FAILED",
      message: copy.errors.SHIFT_SKIP_FAILED,
      ok: false,
    };
  }
}
