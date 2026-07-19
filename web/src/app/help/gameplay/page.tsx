import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GameplayGuide } from "@/features/game-guide/components/gameplay-guide";
import { getGameSnapshot } from "@/features/game/services/game-snapshot";
import { getPlayerGameRedirect } from "@/features/game/services/player-game-gate";
import { USER_ROLES } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Oyun Rehberi | Factory Runway",
  description:
    "Üretim rotalarını, fason operasyonlarını ve kuyruk mantığını görsel akışlarla inceleyin.",
};

export default async function GameplayGuidePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN) {
    redirect("/admin");
  }

  const redirectTo = await getPlayerGameRedirect(user.id);

  if (redirectTo) {
    redirect(redirectTo);
  }

  const snapshot = await getGameSnapshot({
    displayName: user.name ?? user.email,
    userId: user.id,
  });

  if (!snapshot) {
    redirect("/onboarding");
  }

  return <GameplayGuide snapshot={snapshot} />;
}
