import type { ReactNode } from "react";

import { AdminSidebar } from "./admin-sidebar";
import { requireAdminUser } from "./admin-auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdminUser();

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="factory-backdrop" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-[96rem] gap-4 px-4 py-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <AdminSidebar user={user} />
        <section className="min-w-0 pb-8">{children}</section>
      </div>
    </main>
  );
}
