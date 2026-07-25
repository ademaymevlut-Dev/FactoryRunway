import { redirect } from "next/navigation";

import { USER_ROLES } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { GameShell } from "@/features/game/components/game-shell";
import { getGameSnapshot } from "@/features/game/services/game-snapshot";
import { getPlayerGameRedirect } from "@/features/game/services/player-game-gate";
import { getPlayerPreferredLocale } from "@/lib/i18n/player-locale";

export default async function GamePage() {
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

  const locale = await getPlayerPreferredLocale(user.id);
  const snapshot = await getGameSnapshot({
    displayName: user.name ?? user.email,
    locale,
    userId: user.id,
  });

  if (!snapshot) {
    redirect("/onboarding");
  }

  return <GameShell initialSnapshot={snapshot} />;
}
