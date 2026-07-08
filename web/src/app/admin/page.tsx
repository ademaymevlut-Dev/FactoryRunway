import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ClipboardList, Factory, Layers3, PackagePlus, ShieldCheck, UserCog } from "lucide-react";

import { getPrisma } from "@/lib/db";

export default async function AdminDashboardPage() {
  const prisma = getPrisma();
  const [productCount, lineTemplateCount, installedLineCount] = await Promise.all([
    prisma.product.count(),
    prisma.productionLineTemplate.count(),
    prisma.factoryProductionLine.count(),
  ]);

  return (
    <div className="flex min-h-full flex-col gap-4">
      <header className="game-topbar">
        <div className="flex min-w-0 items-center gap-3">
          <div className="game-icon-button">
            <UserCog size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Admin Dashboard
            </p>
            <h1 className="truncate text-xl font-semibold sm:text-2xl">Factory Runway Yönetim</h1>
          </div>
        </div>
        <Link className="game-button-primary" href="/admin/definitions/products">
          <Layers3 size={17} />
          Ürün Tanımları
        </Link>
      </header>

      <section className="grid flex-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="game-card p-5 sm:p-6">
          <p className="game-pill w-fit">
            <ShieldCheck size={16} />
            Yönetim paneli aktif
          </p>
          <h2 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight sm:text-5xl">
            Tanımları, katalogları ve canlı oyun operasyonunu tek merkezden yöneteceğiz.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Ürün ve üretim hattında ana kaydı oluştur; ardından detay ekranındaki sekmelerden
            rota, kapasite, maliyet ve görsel bilgilerini tamamla.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="game-button-primary" href="/admin/definitions/products">
              Ürün Tanımlarına Git
              <ArrowRight size={17} />
            </Link>
            <Link className="game-button-ghost" href="/admin/definitions/departments">
              Departmanlar
              <Factory size={17} />
            </Link>
          </div>
        </div>

        <div className="grid content-start gap-3 sm:grid-cols-3">
          <MetricPreview icon={<PackagePlus size={18} />} label="Ürün" value={productCount.toString()} />
          <MetricPreview icon={<Factory size={18} />} label="Hat Şablonu" value={lineTemplateCount.toString()} />
          <MetricPreview icon={<ClipboardList size={18} />} label="Kurulu Hat" value={installedLineCount.toString()} />
        </div>
      </section>
    </div>
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
