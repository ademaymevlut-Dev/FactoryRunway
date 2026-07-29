import { getPrisma } from "@/lib/db";
import { normalizeLocale, type SupportedLocale } from "./locales";

const defaultPlayerLocale: SupportedLocale = "en";

export async function getPlayerPreferredLocale(
  userId: string,
): Promise<SupportedLocale> {
  const playerProfile = await getPrisma().playerProfile.findUnique({
    where: { userId },
    select: { preferredLocale: true },
  });

  return playerProfile?.preferredLocale
    ? normalizeLocale(playerProfile.preferredLocale)
    : defaultPlayerLocale;
}
