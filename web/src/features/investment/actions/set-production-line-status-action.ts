"use server";

import { revalidatePath } from "next/cache";

import { setProductionLineStatus } from "@/features/investment/services/set-production-line-status";
import type {
  ProductionLineStatusChangeMode,
  SetProductionLineStatusResult,
} from "@/features/investment/types";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";

export async function setProductionLineStatusAction(
  _previousState: SetProductionLineStatusResult | null,
  formData: FormData,
): Promise<SetProductionLineStatusResult> {
  void _previousState;

  const user = await getCurrentUser();

  if (!user) return { code: "UNAUTHORIZED", ok: false };

  const factoryId = readIdentifier(formData, "factoryId");
  const factoryProductionLineId = readIdentifier(
    formData,
    "factoryProductionLineId",
  );
  const requestId = readIdentifier(formData, "requestId");
  const mode = readMode(formData);

  if (!factoryId || !factoryProductionLineId || !requestId || !mode) {
    return { code: "INVALID_REQUEST", ok: false };
  }

  try {
    const result = await setProductionLineStatus({
      prisma: getPrisma(),
      statusChange: {
        factoryId,
        factoryProductionLineId,
        mode,
        requestId,
      },
      userId: user.id,
    });

    if (result.ok) revalidatePath("/game");

    return result;
  } catch (error) {
    console.error("Production line status change failed.", error);
    return { code: "UNKNOWN_ERROR", ok: false };
  }
}

function readMode(formData: FormData): ProductionLineStatusChangeMode | null {
  const value = formData.get("mode");

  return value === "activate" || value === "disable" ? value : null;
}

function readIdentifier(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") return null;

  const normalized = value.trim();

  return normalized.length > 0 && normalized.length <= 200
    ? normalized
    : null;
}
