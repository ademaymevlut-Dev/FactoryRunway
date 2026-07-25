import { getPrisma } from "@/lib/db";
import { normalizeLocale, type SupportedLocale } from "./locales";

export async function getPlayerPreferredLocale(
  userId: string,
): Promise<SupportedLocale> {
  const playerProfile = await getPrisma().playerProfile.findUnique({
    where: { userId },
    select: { preferredLocale: true },
  });

  return normalizeLocale(playerProfile?.preferredLocale);
}
