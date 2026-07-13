"use server";

import { revalidatePath } from "next/cache";

import { upgradeProductionLine } from "@/features/investment/services/upgrade-production-line";
import type { UpgradeProductionLineResult } from "@/features/investment/types";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";

export async function upgradeProductionLineAction(
  _previousState: UpgradeProductionLineResult | null,
  formData: FormData,
): Promise<UpgradeProductionLineResult> {
  void _previousState;

  const user = await getCurrentUser();

  if (!user) return { code: "UNAUTHORIZED", ok: false };

  const factoryId = readIdentifier(formData, "factoryId");
  const factoryProductionLineId = readIdentifier(
    formData,
    "factoryProductionLineId",
  );
  const targetProductionLineTemplateId = readIdentifier(
    formData,
    "targetProductionLineTemplateId",
  );
  const requestId = readIdentifier(formData, "requestId");

  if (
    !factoryId ||
    !factoryProductionLineId ||
    !targetProductionLineTemplateId ||
    !requestId
  ) {
    return { code: "INVALID_REQUEST", ok: false };
  }

  try {
    const result = await upgradeProductionLine({
      prisma: getPrisma(),
      upgrade: {
        factoryId,
        factoryProductionLineId,
        requestId,
        targetProductionLineTemplateId,
      },
      userId: user.id,
    });

    if (result.ok) revalidatePath("/game");

    return result;
  } catch (error) {
    console.error("Production line upgrade failed.", error);
    return { code: "UNKNOWN_ERROR", ok: false };
  }
}

function readIdentifier(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") return null;

  const normalized = value.trim();

  return normalized.length > 0 && normalized.length <= 200
    ? normalized
    : null;
}
