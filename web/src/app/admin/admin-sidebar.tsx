"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronRight,
  ClipboardList,
  Contact,
  Factory,
  Gauge,
  Handshake,
  Home,
  Layers3,
  LogOut,
  PackageSearch,
  PackagePlus,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";

import { logoutAction } from "../user-actions";

type AdminSidebarProps = {
  user: {
    email: string;
    name: string | null;
    role: string;
  };
};

type NavItem = {
  href?: string;
  label: string;
  icon: typeof Home;
  status?: "next";
};

const navSections: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Yönetim",
    items: [
      { href: "/admin", label: "Genel Bakış", icon: Home },
      { label: "Kurulum Merkezi", icon: Sparkles, status: "next" },
    ],
  },
  {
    label: "Tanımlamalar",
    items: [
      { href: "/admin/sectors", label: "Sektörler", icon: Building2 },
      {
        href: "/admin/definitions/departments",
        label: "Departmanlar",
        icon: Layers3,
      },
      {
        href: "/admin/definitions/products",
        label: "Ürün Tanımları",
        icon: PackageSearch,
      },
      {
        href: "/admin/definitions/staff",
        label: "Personel Rolleri",
        icon: Users,
      },
      {
        href: "/admin/definitions/outsource-businesses",
        label: "Fason İşletmeler",
        icon: Handshake,
      },
    ],
  },
  {
    label: "Kataloglar",
    items: [
      {
        href: "/admin/products",
        label: "Ürün Kataloğu",
        icon: PackagePlus,
      },
      {
        href: "/admin/production-lines",
        label: "Üretim Hattı Kataloğu",
        icon: Factory,
      },
    ],
  },
  {
    label: "Pazar ve Simülasyon",
    items: [
      { href: "/admin/customers", label: "Müşteriler", icon: Contact },
      { label: "Market Ayarları", icon: SlidersHorizontal, status: "next" },
      {
        href: "/admin/simulation-config",
        label: "Simülasyon Ayarları",
        icon: Gauge,
      },
      {
        href: "/admin/starting-templates",
        label: "Başlangıç Kadrosu",
        icon: UserCog,
      },
    ],
  },
  {
    label: "Operasyon",
    items: [
      { label: "Üretim Emirleri", icon: ClipboardList, status: "next" },
      { label: "Canlı Fabrikalar", icon: Factory, status: "next" },
    ],
  },
  {
    label: "Sistem",
    items: [
      { label: "Kullanıcılar", icon: Users, status: "next" },
      { label: "Genel Ayarlar", icon: Settings2, status: "next" },
    ],
  },
];

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="game-card h-fit overflow-y-auto p-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:min-h-[calc(100vh-2rem)]">
      <div className="flex items-center gap-3 p-2">
        <div className="game-mark">
          <UserCog size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Admin</p>
          <h1 className="truncate text-lg font-semibold text-foreground">Factory Runway</h1>
        </div>
      </div>

      <nav className="mt-5 grid gap-4" aria-label="Admin menü">
        {navSections.map((section) => (
          <div className="grid gap-1" key={section.label}>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              {section.label}
            </p>
            {section.items.map((item) => (
              <AdminNavItem item={item} key={`${section.label}:${item.label}`} pathname={pathname} />
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-5 border-t border-border pt-4">
        <div className="rounded-lg border border-border bg-card p-3 text-card-foreground">
          <p className="truncate text-sm font-semibold text-secondary-foreground">{user.name ?? "Admin"}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
          <span className="game-badge cyan mt-3">{user.role}</span>
        </div>

        <form action={logoutAction} className="mt-3">
          <button className="game-button-ghost w-full" type="submit">
            <LogOut size={17} />
            Çıkış Yap
          </button>
        </form>
      </div>
    </aside>
  );
}

function AdminNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;

  if (!item.href) {
    return (
      <div
        aria-disabled="true"
        className="flex min-h-10 items-center gap-3 rounded-[8px] border border-transparent px-3 text-sm font-medium text-muted-foreground/55"
        title="Sonraki admin paneli aşamasında eklenecek"
      >
        <Icon size={16} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <span className="rounded border border-border/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
          Sonra
        </span>
      </div>
    );
  }

  const isActive =
    item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={[
        "flex min-h-10 items-center gap-3 rounded-[8px] border px-3 text-sm font-semibold transition",
        isActive
          ? "border-primary/35 bg-primary/10 text-foreground shadow-md"
          : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
      ].join(" ")}
      href={item.href}
    >
      <Icon size={16} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      <ChevronRight className={isActive ? "text-primary" : "text-muted-foreground/50"} size={14} />
    </Link>
  );
}
