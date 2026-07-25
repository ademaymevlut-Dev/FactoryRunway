"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { USER_ROLES } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";
import { normalizeLocale } from "@/lib/i18n/locales";
import { ensureMarketOfferForFactory } from "@/features/orders/services/market-offer-generator";

import { simulateFactoryDay } from "../services/day-simulation";
import {
  getLatestShiftPlayback,
  getShiftPlaybackById,
} from "../services/shift-playback-view";
import {
  retrySerializableTransaction,
  SHIFT_TRANSACTION_OPTIONS,
  ShiftClaimConflictError,
} from "../services/shift-transaction";
import type { AdvanceFactoryDayActionResult } from "../types";
import { shiftPlaybackCopy } from "../shift-playback-copy";

export async function advanceFactoryDayAction(
  _previousState: AdvanceFactoryDayActionResult | null,
  _formData: FormData,
): Promise<AdvanceFactoryDayActionResult> {
  void _previousState;
  void _formData;

  const auth = await getCurrentUser();

  if (!auth) redirect("/");
  if (auth.role === USER_ROLES.ADMIN || auth.role === USER_ROLES.SUPER_ADMIN) {
    redirect("/admin");
  }

  const prisma = getPrisma();
  const playerProfile = await prisma.playerProfile.findUnique({
    where: { userId: auth.id },
    select: {
      preferredLocale: true,
      factories: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true },
      },
    },
  });
  const factory = playerProfile?.factories[0];
  const locale = normalizeLocale(playerProfile?.preferredLocale);
  const copy = shiftPlaybackCopy[locale].actions;

  if (!factory) {
    redirect("/onboarding");
  }

  let execution:
    | Awaited<ReturnType<typeof simulateFactoryDay>>
    | {
        outcome: "IDEMPOTENT_REPLAY";
        playback: NonNullable<
          Awaited<ReturnType<typeof getLatestShiftPlayback>>
        >;
      };

  try {
    execution = await retrySerializableTransaction(() =>
      prisma.$transaction(
        (tx) =>
          simulateFactoryDay({
            factoryId: factory.id,
            prisma: tx,
          }),
        SHIFT_TRANSACTION_OPTIONS,
      ),
    );
  } catch (error) {
    if (!(error instanceof ShiftClaimConflictError)) {
      console.error("Factory shift start failed.", { factoryId: factory.id }, error);

      return {
        code: "SHIFT_START_FAILED",
        message: copy.errors.SHIFT_START_FAILED,
        ok: false,
      };
    }

    const playback = await getLatestShiftPlayback({
      factoryId: error.factoryId,
      locale,
      prisma,
    });

    if (!playback || playback.simulatedGameDay !== error.simulatedGameDay) {
      return {
        code: "SHIFT_RESULT_NOT_FOUND",
        message: copy.errors.SHIFT_RESULT_NOT_FOUND_AFTER_START,
        ok: false,
      };
    }

    execution = {
      outcome: "IDEMPOTENT_REPLAY",
      playback,
    };
  }

  const playback =
    execution.outcome === "IDEMPOTENT_REPLAY"
      ? execution.playback
      : await getShiftPlaybackById({
          locale,
          now:
            execution.outcome === "STARTED"
              ? execution.playbackStartedAt
              : undefined,
          prisma,
          shiftId: execution.shiftId,
        });
  const expectedSimulatedGameDay =
    execution.outcome === "IDEMPOTENT_REPLAY"
      ? execution.playback.simulatedGameDay
      : execution.simulatedGameDay;

  if (!playback || playback.simulatedGameDay !== expectedSimulatedGameDay) {
    return {
      code: "SHIFT_RESULT_NOT_FOUND",
      message: copy.errors.SHIFT_RESULT_NOT_FOUND_AFTER_COMPLETION,
      ok: false,
    };
  }

  let warning: string | undefined;

  if (execution.outcome === "STARTED") {
    try {
      await ensureMarketOfferForFactory(factory.id);
    } catch (error) {
      console.error("Shift completed but next market offer could not be ensured.", error);
      warning = copy.warnings.NEXT_MARKET_OFFER_DELAYED;
    }
  }

  revalidatePath("/game");

  return {
    ok: true,
    outcome: execution.outcome,
    playback,
    ...(warning ? { warning } : {}),
  };
}
