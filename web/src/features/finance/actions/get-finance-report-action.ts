"use server";

import { getFinanceReport } from "@/features/finance/services/finance-report";
import type {
  FinanceReportActionResult,
  FinanceReportTab,
} from "@/features/finance/types";
import { USER_ROLES } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";

const tabs = new Set<FinanceReportTab>([
  "overview",
  "profit",
  "cash",
  "investment",
  "expenses",
]);

export async function getFinanceReportAction(input: {
  factoryId: string;
  periodIndex?: number | null;
  tab: FinanceReportTab;
}): Promise<FinanceReportActionResult> {
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

    const report = await getFinanceReport({
      factoryId: factory.id,
      periodIndex: normalizePeriodIndex(input.periodIndex),
      prisma,
      tab: input.tab,
    });

    if (!report) {
      return { code: "FACTORY_NOT_FOUND", ok: false };
    }

    return { ok: true, report };
  } catch (error) {
    console.error("Finance report loading failed.", error);
    return { code: "UNKNOWN_ERROR", ok: false };
  }
}

function normalizePeriodIndex(periodIndex: number | null | undefined) {
  if (typeof periodIndex !== "number" || !Number.isFinite(periodIndex)) {
    return null;
  }

  return Math.max(1, Math.trunc(periodIndex));
}
