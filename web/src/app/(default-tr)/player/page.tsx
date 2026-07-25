import { redirect } from "next/navigation";

import { USER_ROLES } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getPlayerGameRedirect } from "@/features/game/services/player-game-gate";

export default async function PlayerDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN) {
    redirect("/admin");
  }

  const redirectTo = await getPlayerGameRedirect(user.id);

  redirect(redirectTo ?? "/game");
}
