"use server";

import { revalidatePath } from "next/cache";

import { USER_ROLES } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";
import { normalizeLocale, type SupportedLocale } from "@/lib/i18n/locales";

export async function updatePlayerPreferredLocaleAction(
  locale: SupportedLocale,
) {
  const user = await getCurrentUser();

  if (!user || user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN) {
    return { ok: false as const };
  }

  await getPrisma().playerProfile.update({
    where: { userId: user.id },
    data: { preferredLocale: normalizeLocale(locale) },
  });

  revalidatePath("/onboarding");
  revalidatePath("/player");
  revalidatePath("/player/first-order");
  revalidatePath("/player/first-order/simulation");
  revalidatePath("/game");

  return { ok: true as const };
}
