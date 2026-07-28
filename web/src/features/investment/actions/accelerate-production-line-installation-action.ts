"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";

import { accelerateProductionLineInstallation } from "../services/accelerate-production-line-installation";
import type { AccelerateProductionLineInstallationResult } from "../types";

export async function accelerateProductionLineInstallationAction(
  _previousState: AccelerateProductionLineInstallationResult | null,
  formData: FormData,
): Promise<AccelerateProductionLineInstallationResult> {
  void _previousState;
  const user = await getCurrentUser();

  if (!user) return { code: "UNAUTHORIZED", ok: false };

  const factoryId = readIdentifier(formData, "factoryId");
  const factoryProductionLineId = readIdentifier(
    formData,
    "factoryProductionLineId",
  );
  const requestId = readIdentifier(formData, "requestId");
  const days = readPositiveInteger(formData, "days");

  if (!factoryId || !factoryProductionLineId || !requestId || !days) {
    return { code: "INVALID_REQUEST", ok: false };
  }

  try {
    const result = await accelerateProductionLineInstallation({
      acceleration: {
        days,
        factoryId,
        factoryProductionLineId,
        requestId,
      },
      prisma: getPrisma(),
      userId: user.id,
    });

    if (result.ok) revalidatePath("/game");

    return result;
  } catch (error) {
    console.error("Production line installation acceleration failed.", error);
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

function readPositiveInteger(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const number = Number(value);

  return Number.isSafeInteger(number) && number > 0 ? number : null;
}
