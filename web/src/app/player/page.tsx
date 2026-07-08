import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Factory, Gauge, LogOut, PackageCheck, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { getCurrentUser } from "@/lib/auth/session";
import { USER_ROLES } from "@/lib/auth/roles";
import { getPrisma } from "@/lib/db";

import { logoutAction } from "../user-actions";

export default async function PlayerDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN) {
    redirect("/admin");
  }

  const playerProfile = await getPrisma().playerProfile.findUnique({
    where: { userId: user.id },
    select: {
      _count: {
        select: { factories: true },
      },
    },
  });

  if (!playerProfile || playerProfile._count.factories === 0) {
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="factory-backdrop" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="game-topbar">
          <div className="flex items-center gap-3">
            <div className="game-mark">
              <UserRound size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                Player Dashboard
              </p>
              <h1 className="text-xl font-semibold sm:text-2xl">Factory Runway</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link className="game-button-primary" href="/shift">
              Fabrikaya Git
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
              <Factory size={16} />
              Oyuncu oluşturuldu
            </p>
            <h2 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-6xl">
              Hoş geldin, {user.name ?? user.email}.
            </h2>
            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Session aktif. Bir sonraki adımda bu ekranı oyuncunun gerçek fabrika verileriyle dolduracağız.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricPreview icon={<Factory size={18} />} label="Fabrika" value="Başladı" />
            <MetricPreview icon={<Gauge size={18} />} label="Verim" value="%0" />
            <MetricPreview icon={<PackageCheck size={18} />} label="Sipariş" value="0" />
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
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
