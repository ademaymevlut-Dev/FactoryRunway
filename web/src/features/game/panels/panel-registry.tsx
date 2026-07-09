import {
  Banknote,
  Boxes,
  ClipboardList,
  Factory,
  Hammer,
  PackageCheck,
  Users,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { FactoryMapItem, GamePanelKey, GameSnapshot } from "../types";

type PanelContext = {
  payload?: Record<string, string | number | boolean | null>;
  snapshot: GameSnapshot;
  onClose: () => void;
};

type PanelDefinition = {
  title: string;
  render: (context: PanelContext) => ReactNode;
};

export const panelRegistry: Record<GamePanelKey, PanelDefinition> = {
  orders: {
    title: "Siparişler",
    render: ({ snapshot }) => (
      <PanelScaffold
        icon={<ClipboardList size={18} />}
        title="Siparişler"
        value={snapshot.metrics.find((metric) => metric.id === "orders")?.value ?? "0"}
        body={`${snapshot.factory.name} için açık sipariş yükü takipte.`}
      />
    ),
  },
  production: {
    title: "Üretim",
    render: ({ snapshot }) => (
      <PanelScaffold
        icon={<Boxes size={18} />}
        title="Üretim"
        value={`${snapshot.map.totals.productionLineCount} hat`}
        body="Kurulu üretim alanları haritada hazır."
      />
    ),
  },
  staff: {
    title: "Personel",
    render: ({ snapshot }) => (
      <PanelScaffold
        icon={<Users size={18} />}
        title="Personel"
        value={`${snapshot.map.totals.assignedStaff}/${snapshot.map.totals.idealStaff}`}
        body="Ekip planı ayrı panelde takip edilecek."
      />
    ),
  },
  finance: {
    title: "Finans",
    render: ({ snapshot }) => (
      <PanelScaffold
        icon={<Banknote size={18} />}
        title="Finans"
        value={snapshot.metrics.find((metric) => metric.id === "cash")?.value ?? "-"}
        body={`${snapshot.factory.currentFinancePeriod}. finans dönemi açık.`}
      />
    ),
  },
  reports: {
    title: "Raporlar",
    render: ({ snapshot }) => (
      <PanelScaffold
        icon={<PackageCheck size={18} />}
        title="Raporlar"
        value={`${snapshot.factory.currentDay}. gün`}
        body="Günün üretim görünümü hazır."
      />
    ),
  },
  lineDetail: {
    title: "Hat Detayı",
    render: ({ payload, snapshot }) => {
      const line = findLine(snapshot, String(payload?.lineId ?? ""));

      if (!line) {
        return (
          <PanelScaffold
            icon={<Factory size={18} />}
            title="Hat Detayı"
            value="-"
            body="Seçili üretim hattı bulunamadı."
          />
        );
      }

      return (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                {line.departmentName}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">{line.title}</h2>
            </div>
            <Badge variant="outline">{line.code}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <PanelDatum label="Durum" value={line.status} />
            <PanelDatum label="Standart" value={line.grade} />
            <PanelDatum label="Hat Kodu" value={line.code} />
            <PanelDatum label="Departman" value={line.departmentName} />
          </div>
        </div>
      );
    },
  },
  investment: {
    title: "Yatırım",
    render: () => (
      <PanelScaffold
        icon={<Hammer size={18} />}
        title="Yatırım"
        value="Hazır"
        body="Bir sonraki hat kararı yatırım sırasında."
      />
    ),
  },
};

export function PanelChrome({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <aside className="pointer-events-auto w-[min(420px,calc(100vw-2rem))] rounded-lg border border-white/10 bg-card/95 p-4 text-card-foreground shadow-2xl backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h2>
        <Button aria-label="Paneli kapat" onClick={onClose} size="icon-sm" type="button" variant="ghost">
          <X size={16} />
        </Button>
      </div>
      {children}
    </aside>
  );
}

function PanelScaffold({
  body,
  icon,
  title,
  value,
}: {
  body: string;
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
          <strong className="text-2xl text-white">{value}</strong>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

function PanelDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-background/60 p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold text-white">{value}</dd>
    </div>
  );
}

function findLine(snapshot: GameSnapshot, lineId: string) {
  for (const section of snapshot.map.sections) {
    const line = section.items.find(
      (item): item is Extract<FactoryMapItem, { kind: "productionLine" }> =>
        item.kind === "productionLine" && item.lineId === lineId,
    );

    if (line) return line;
  }

  return null;
}
