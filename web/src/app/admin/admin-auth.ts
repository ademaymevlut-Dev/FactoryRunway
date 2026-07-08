import { redirect } from "next/navigation";

import { USER_ROLES } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";

const ADMIN_ROLES = new Set<string>([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]);

export async function requireAdminUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  if (!ADMIN_ROLES.has(user.role)) {
    redirect("/player");
  }

  return user;
}
