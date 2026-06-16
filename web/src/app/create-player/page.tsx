import Link from "next/link";
import { ArrowLeft, Database, Factory, KeyRound } from "lucide-react";
import type { ReactNode } from "react";

import { CreatePlayerForm } from "./create-player-form";

export default function CreatePlayerPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--fr-bg)] text-[var(--fr-cream)]">
      <div className="factory-backdrop" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid w-full gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="flex flex-col justify-between gap-8 rounded-[8px] border border-[var(--fr-border)] bg-white/[0.035] p-5 shadow-[var(--fr-shadow)] sm:p-7">
            <div className="space-y-5">
              <Link className="game-button-ghost w-fit" href="/">
                <ArrowLeft size={17} />
                UI Lab
              </Link>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--fr-cyan)]">
                  Factory Runway
                </p>
                <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
                  Yeni oyuncu fabrikasını başlat.
                </h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-[var(--fr-muted)]">
                  Bu ilk akış sosyal giriş olmadan çalışır. Player kullanıcısı oluşturulur, şifre hashlenir ve varsayılan fabrika profili açılır.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <InfoTile icon={<KeyRound size={18} />} label="Auth" value="Password hash" />
              <InfoTile icon={<Database size={18} />} label="Role" value="PLAYER" />
              <InfoTile icon={<Factory size={18} />} label="Start" value="₺12.500" />
            </div>
          </div>

          <div className="game-card p-5 sm:p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-[var(--fr-muted)]">CreatePlayer</p>
                <h2 className="text-2xl font-semibold">Player Kaydı</h2>
              </div>
              <div className="game-icon-button">
                <Factory size={20} />
              </div>
            </div>
            <CreatePlayerForm />
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[8px] border border-[var(--fr-border)] bg-black/20 p-4">
      <div className="mb-3 text-[var(--fr-cyan)]">{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fr-muted)]">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
