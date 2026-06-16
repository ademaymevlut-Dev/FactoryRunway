import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowRight, ClipboardList, Factory, LogOut, ShieldCheck, UserCog } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/session";
import { USER_ROLES } from "@/lib/auth/roles";

import { logoutAction } from "../user-actions";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  if (user.role !== USER_ROLES.ADMIN && user.role !== USER_ROLES.SUPER_ADMIN) {
    redirect("/player");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--fr-bg)] text-[var(--fr-cream)]">
      <div className="factory-backdrop" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="game-topbar">
          <div className="flex items-center gap-3">
            <div className="game-mark">
              <UserCog size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--fr-cyan)]">
                Admin Dashboard
              </p>
              <h1 className="text-xl font-semibold sm:text-2xl">Factory Runway Yönetim</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link className="game-button-primary" href="/">
              Ana Ekran
              <ArrowRight size={17} />
            </Link>
            <form action={logoutAction}>
              <button className="game-button-ghost" type="submit">
                <LogOut size={17} />
                Logout
              </button>
            </form>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-5 py-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <p className="game-pill w-fit">
              <ShieldCheck size={16} />
              Admin oluşturuldu
            </p>
            <h2 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-6xl">
              Hoş geldin, {user.name ?? user.email}.
            </h2>
            <p className="max-w-xl text-base leading-7 text-[var(--fr-muted)] sm:text-lg">
              Session aktif. Buraya ürün süreleri, makine upgrade katsayıları ve oyun ayarları için admin panellerini ekleyeceğiz.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricPreview icon={<Factory size={18} />} label="Ürün" value="Yakında" />
            <MetricPreview icon={<ClipboardList size={18} />} label="Süreler" value="Yakında" />
            <MetricPreview icon={<ShieldCheck size={18} />} label="Yetki" value="Aktif" />
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricPreview({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="game-card p-5">
      <div className="metric-icon">{icon}</div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fr-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
