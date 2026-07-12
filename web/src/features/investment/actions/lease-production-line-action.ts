"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";

import { leaseProductionLine } from "../services/lease-production-line";
import type { LeaseProductionLineResult } from "../types";

export async function leaseProductionLineAction(
  _previousState: LeaseProductionLineResult | null,
  formData: FormData,
): Promise<LeaseProductionLineResult> {
  void _previousState;
  const user = await getCurrentUser();

  if (!user) return { code: "UNAUTHORIZED", ok: false };

  const factoryId = readIdentifier(formData, "factoryId");
  const productionLineTemplateId = readIdentifier(
    formData,
    "productionLineTemplateId",
  );
  const leasingOfferId = readIdentifier(formData, "leasingOfferId");
  const requestId = readIdentifier(formData, "requestId");

  if (
    !factoryId ||
    !productionLineTemplateId ||
    !leasingOfferId ||
    !requestId
  ) {
    return { code: "INVALID_REQUEST", ok: false };
  }

  try {
    const result = await leaseProductionLine({
      lease: {
        factoryId,
        leasingOfferId,
        productionLineTemplateId,
        requestId,
      },
      prisma: getPrisma(),
      userId: user.id,
    });

    if (result.ok) revalidatePath("/game");

    return result;
  } catch (error) {
    console.error("Production line leasing failed.", error);
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
