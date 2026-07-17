"use server";

import { getGameReport } from "@/features/reports/services/game-reports";
import type {
  GameReportActionResult,
  GameReportTab,
} from "@/features/reports/types";
import { USER_ROLES } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";

const tabs = new Set<GameReportTab>(["customers", "staff"]);

export async function getGameReportAction(input: {
  factoryId: string;
  tab: GameReportTab;
}): Promise<GameReportActionResult> {
  const user = await getCurrentUser();

  if (
    !user ||
    user.role === USER_ROLES.ADMIN ||
    user.role === USER_ROLES.SUPER_ADMIN
  ) {
    return { code: "UNAUTHORIZED", ok: false };
  }

  if (!tabs.has(input.tab)) {
    return { code: "INVALID_TAB", ok: false };
  }

  try {
    const prisma = getPrisma();
    const factory = await prisma.factory.findFirst({
      where: {
        id: input.factoryId,
        playerProfile: { userId: user.id },
      },
      select: { id: true },
    });

    if (!factory) {
      return { code: "FACTORY_NOT_FOUND", ok: false };
    }

    const report = await getGameReport({
      factoryId: factory.id,
      prisma,
      tab: input.tab,
    });

    if (!report) {
      return { code: "FACTORY_NOT_FOUND", ok: false };
    }

    return { ok: true, report };
  } catch (error) {
    console.error("Game report loading failed.", error);

    return { code: "UNKNOWN_ERROR", ok: false };
  }
}
