"use server";

import { revalidatePath } from "next/cache";

import { purchaseProductionLine } from "@/features/investment/services/purchase-production-line";
import type { PurchaseProductionLineResult } from "@/features/investment/types";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";

export async function purchaseProductionLineAction(
  _previousState: PurchaseProductionLineResult | null,
  formData: FormData,
): Promise<PurchaseProductionLineResult> {
  void _previousState;

  const user = await getCurrentUser();

  if (!user) return { code: "UNAUTHORIZED", ok: false };

  const factoryId = readIdentifier(formData, "factoryId");
  const productionLineTemplateId = readIdentifier(
    formData,
    "productionLineTemplateId",
  );
  const requestId = readIdentifier(formData, "requestId");

  if (!factoryId || !productionLineTemplateId || !requestId) {
    return { code: "INVALID_REQUEST", ok: false };
  }

  try {
    const result = await purchaseProductionLine({
      prisma: getPrisma(),
      purchase: {
        factoryId,
        productionLineTemplateId,
        requestId,
      },
      userId: user.id,
    });

    if (result.ok) revalidatePath("/game");

    return result;
  } catch (error) {
    console.error("Production line purchase failed.", error);
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
