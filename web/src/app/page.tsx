"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Factory,
  Gauge,
  Layers3,
  PackageCheck,
  Sparkles,
  TrendingUp,
  Warehouse,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { AccountCreateTabs } from "./account-create-tabs";

type TabKey = "login" | "ui";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "login", label: "Kullanıcı" },
  { key: "ui", label: "UI Hazırlık" },
];

const departments = [
  { name: "Kesim", queue: "4.2 gün", status: "İdeal", value: 72 },
  { name: "Dikim", queue: "1.1 gün", status: "Düşük", value: 38 },
  { name: "Ütü", queue: "8.0 gün", status: "Yatırım", value: 91 },
  { name: "Paket", queue: "6.4 gün", status: "İzle", value: 78 },
];

const feed = [
  { time: "09:20", tone: "warning", text: "Line 2 kesim kuyruğu bekliyor." },
  { time: "10:40", tone: "danger", text: "Paketleme tarafında yığılma başladı." },
  { time: "12:15", tone: "success", text: "Cameo için 24 adet sevkiyata hazır." },
  { time: "15:30", tone: "info", text: "Baskıdan dönen parçalar dikim kuyruğunda." },
];

const orders = [
  { code: "FW.BSH.21", product: "Cameo", tier: "Basic / Printed", risk: "Orta", qty: "1.420", due: "4 gün" },
  { code: "FW.TSH.57", product: "Manama", tier: "Basic / Plain", risk: "Güvenli", qty: "380", due: "2 gün" },
  { code: "FW.HDY.09", product: "Solenne", tier: "Premium", risk: "Riskli", qty: "760", due: "6 gün" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("login");

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--fr-bg)] text-[var(--fr-cream)]">
      <div className="factory-backdrop" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="game-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <div className="game-mark">
              <Factory size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--fr-cyan)]">
                Factory Runway
              </p>
              <h1 className="truncate text-xl font-semibold text-[var(--fr-cream)] sm:text-2xl">
                Textile Command UI Lab
              </h1>
            </div>
          </div>

          <div className="game-tabs" role="tablist" aria-label="Factory Runway ana sekmeler">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={activeTab === tab.key ? "game-tab is-active" : "game-tab"}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {activeTab === "login" ? <LoginPanel /> : <UiPreparationPanel />}
      </div>
    </main>
  );
}

function LoginPanel() {
  return (
    <section className="grid flex-1 items-center gap-5 py-8 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-5">
        <div className="game-pill w-fit">
          <Sparkles size={16} />
          Dark navy game interface
        </div>
        <div className="max-w-2xl space-y-4">
          <h2 className="text-4xl font-semibold leading-tight text-[var(--fr-cream)] sm:text-6xl">
            Atölyeni planla, vardiyayı başlat, rapordan öğren.
          </h2>
          <p className="max-w-xl text-base leading-7 text-[var(--fr-muted)] sm:text-lg">
            Bu ekran artık ilk kullanıcı oluşturma akışını da test ediyor. Player ve Admin hesapları normal form ile açılır, şifreler hashlenir.
          </p>
        </div>

        <div className="grid max-w-xl gap-3 sm:grid-cols-3">
          <MetricCard icon={<Gauge size={18} />} label="Randıman" value="%78" tone="cyan" />
          <MetricCard icon={<PackageCheck size={18} />} label="Sevkiyat" value="150" tone="green" />
          <MetricCard icon={<AlertTriangle size={18} />} label="Risk" value="Orta" tone="amber" />
        </div>
      </div>

      <div className="game-card mx-auto w-full max-w-md p-5 sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--fr-muted)]">Factory account</p>
            <h3 className="text-2xl font-semibold">Kullanıcı Oluştur</h3>
          </div>
          <div className="game-icon-button">
            <Factory size={20} />
          </div>
        </div>

        <AccountCreateTabs />

        <div className="mt-5 rounded-[8px] border border-[var(--fr-border)] bg-white/[0.03] p-4">
          <div className="flex items-start gap-3">
            <div className="status-dot bg-[var(--fr-green)]" />
            <p className="text-sm leading-6 text-[var(--fr-muted)]">
              Login/session bir sonraki adım. Bu aşamada kullanıcı kayıtlarının veritabanına doğru yazılmasını netleştiriyoruz.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function UiPreparationPanel() {
  return (
    <section className="grid gap-5 py-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-5">
        <div className="game-card p-5">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--fr-cyan)]">
                UI Hazırlık
              </p>
              <h2 className="mt-1 text-2xl font-semibold">Factory Runway Component Board</h2>
            </div>
            <Link className="game-button-primary" href="/shift">
              <Zap size={18} />
              Vardiyayı Başlat
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard icon={<Warehouse size={18} />} label="CUT_READY" value="4.2g" tone="cyan" />
            <MetricCard icon={<Layers3 size={18} />} label="SEWN_READY" value="1.1g" tone="amber" />
            <MetricCard icon={<PackageCheck size={18} />} label="SHIP_READY" value="150" tone="green" />
            <MetricCard icon={<Clock3 size={18} />} label="Boş Line" value="74dk" tone="red" />
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <div className="game-card p-5">
            <SectionTitle icon={<Boxes size={18} />} title="Departman Kartları" />
            <div className="mt-4 space-y-3">
              {departments.map((department) => (
                <div className="department-row" key={department.name}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{department.name}</span>
                      <Badge tone={department.value > 85 ? "red" : department.value > 70 ? "amber" : "cyan"}>
                        {department.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--fr-muted)]">
                      Kuyruk güvenliği: {department.queue}
                    </p>
                  </div>
                  <Progress value={department.value} />
                </div>
              ))}
            </div>
          </div>

          <div className="game-card p-5">
            <SectionTitle icon={<AlertTriangle size={18} />} title="Uyarı Renkleri" />
            <div className="mt-4 space-y-3">
              <AlertRow tone="success" title="Başarılı" text="Sevkiyat tamamlandı, ödeme alındı." />
              <AlertRow tone="warning" title="Dikkat" text="Ütü önünde 7+ günlük kuyruk oluştu." />
              <AlertRow tone="danger" title="Kritik" text="Bu sipariş teslim tarihine yetişmeyebilir." />
              <AlertRow tone="info" title="Bilgi" text="Baskıdan dönen parçalar dikim kuyruğunda." />
            </div>
          </div>
        </div>

        <div className="game-card p-5">
          <SectionTitle icon={<CalendarDays size={18} />} title="Sipariş Tablosu" />
          <div className="mt-4 overflow-hidden rounded-[8px] border border-[var(--fr-border)]">
            <div className="grid grid-cols-[1fr_0.9fr_0.8fr_0.65fr] bg-white/[0.04] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fr-muted)]">
              <span>Ürün</span>
              <span>Katman</span>
              <span>Kalan</span>
              <span>Risk</span>
            </div>
            {orders.map((order) => (
              <div
                className="grid grid-cols-[1fr_0.9fr_0.8fr_0.65fr] items-center border-t border-[var(--fr-border)] px-4 py-3 text-sm"
                key={order.code}
              >
                <div className="min-w-0">
                  <p className="font-semibold">{order.product}</p>
                  <p className="text-xs text-[var(--fr-muted)]">{order.code}</p>
                </div>
                <span className="text-[var(--fr-soft)]">{order.tier}</span>
                <span>{order.qty}</span>
                <Badge tone={order.risk === "Riskli" ? "red" : order.risk === "Orta" ? "amber" : "green"}>
                  {order.risk}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="game-card overflow-hidden p-5">
          <div className="gradient-sample mb-5">
            <div className="flex h-full flex-col justify-between p-5">
              <div className="flex items-center justify-between">
                <Badge tone="dark">Premium glow</Badge>
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-sm text-white/80">Theme sample</p>
                <h3 className="text-2xl font-semibold text-white">Dark navy + neon accent</h3>
              </div>
            </div>
          </div>
          <SectionTitle icon={<Sparkles size={18} />} title="Buton Seti" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="game-button-primary" type="button">
              Primary
              <ArrowRight size={17} />
            </button>
            <button className="game-button-amber" type="button">
              Upgrade
              <TrendingUp size={17} />
            </button>
            <button className="game-button-danger" type="button">
              Risk
              <AlertTriangle size={17} />
            </button>
            <button className="game-button-ghost" type="button">
              Detay
              <ChevronRight size={17} />
            </button>
          </div>
        </div>

        <div className="game-card p-5">
          <SectionTitle icon={<Clock3 size={18} />} title="Vardiya Akışı" />
          <div className="mt-4 space-y-3">
            {feed.map((item) => (
              <div className="feed-row" key={`${item.time}-${item.text}`}>
                <span className="w-12 text-xs font-semibold text-[var(--fr-muted)]">{item.time}</span>
                <span className={`feed-dot ${item.tone}`} />
                <p className="text-sm text-[var(--fr-soft)]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="game-card p-5">
          <SectionTitle icon={<CheckCircle2 size={18} />} title="Tavsiye Kartı" />
          <div className="mt-4 rounded-[8px] border border-[var(--fr-amber-border)] bg-[var(--fr-amber-soft)] p-4">
            <p className="text-sm font-semibold text-[var(--fr-amber)]">Yatırım önerisi</p>
            <p className="mt-2 text-sm leading-6 text-[var(--fr-soft)]">
              Paketleme önünde 7 günlük ürün birikti. Paketleme kapasitesini artırmak nakit akışını hızlandırabilir.
            </p>
            <button className="mt-4 game-button-amber" type="button">
              Yatırımı İncele
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </aside>
    </section>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-[var(--fr-cream)]">
      <div className="section-icon">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "cyan" | "green" | "amber" | "red";
}) {
  return (
    <div className={`metric-card ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="metric-icon">{icon}</span>
        <span className="text-right text-2xl font-semibold">{value}</span>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fr-muted)]">{label}</p>
    </div>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "cyan" | "green" | "amber" | "red" | "dark" }) {
  return <span className={`game-badge ${tone}`}>{children}</span>;
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--fr-cyan),var(--fr-green))]" style={{ width: `${value}%` }} />
    </div>
  );
}

function AlertRow({ tone, title, text }: { tone: "success" | "warning" | "danger" | "info"; title: string; text: string }) {
  return (
    <div className={`alert-row ${tone}`}>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm text-[var(--fr-muted)]">{text}</p>
      </div>
    </div>
  );
}
