import {
  Boxes,
  Factory,
  Users,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FinancePanel } from "@/features/finance/components/finance-panel";
import { OrdersPanel } from "@/features/orders/components/orders-panel";
import { DepartmentQueuePanel } from "@/features/production-queue/components/department-queue-panel";
import { ReportsPanel } from "@/features/reports/components/reports-panel";
import { WarehousePanel } from "@/features/warehouse/components/warehouse-panel";
import { ProductionLineInvestmentPanel } from "@/features/investment/components/production-line-investment-panel";
import { UpgradeProductionLinePanel } from "@/features/investment/components/upgrade-production-line-panel";
import type { ProductionLineInvestmentTemplate } from "@/features/investment/types";
import { TasksPanel } from "@/features/tasks/components/tasks-panel";
import { cn } from "@/lib/utils";

import type { FactoryMapItem, GamePanelKey, GameSnapshot } from "../types";

type PanelContext = {
  payload?: Record<string, string | number | boolean | null>;
  snapshot: GameSnapshot;
  onClose: () => void;
};

type PanelLayout = "center" | "dock" | "side";

type PanelDefinition = {
  backdrop?: boolean;
  layout?: PanelLayout;
  size?: "adaptive" | "compact" | "wide";
  title: string;
  render: (context: PanelContext) => ReactNode;
};

export const panelRegistry: Record<GamePanelKey, PanelDefinition> = {
  orders: {
    layout: "center",
    title: "Siparişler",
    render: ({ snapshot }) => <OrdersPanel orderMarket={snapshot.orders} />,
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
  tasks: {
    layout: "dock",
    size: "compact",
    title: "Görevler",
    render: ({ snapshot }) => (
      <TasksPanel
        currencyCode={snapshot.factory.currencyCode}
        tasks={snapshot.tasks}
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
    backdrop: true,
    layout: "center",
    size: "compact",
    title: "Finans",
    render: ({ snapshot }) => (
      <FinancePanel
        cashBalanceCents={snapshot.factory.cashBalanceCents}
        currencyCode={snapshot.factory.currencyCode}
        currentDay={snapshot.factory.currentDay}
        factoryId={snapshot.factory.id}
      />
    ),
  },
  reports: {
    layout: "center",
    size: "wide",
    title: "Raporlar",
    render: ({ snapshot }) => (
      <ReportsPanel
        currencyCode={snapshot.factory.currencyCode}
        currentDay={snapshot.factory.currentDay}
        factoryId={snapshot.factory.id}
      />
    ),
  },
  warehouse: {
    layout: "center",
    size: "compact",
    title: "Depo",
    render: ({ snapshot }) => <WarehousePanel warehouse={snapshot.warehouse} />,
  },
  departmentQueue: {
    layout: "center",
    size: "adaptive",
    title: "Üretim Kuyruğu",
    render: ({ payload, snapshot }) => {
      const dockItem = findDockItem(snapshot, String(payload?.dockItemId ?? ""));
      const departmentKey = findDepartmentKey(
        snapshot,
        String(payload?.departmentId ?? ""),
      );

      return (
        <DepartmentQueuePanel
          departmentKeys={
            dockItem?.departmentKeys ?? (departmentKey ? [departmentKey] : [])
          }
          investmentDepartmentIds={snapshot.investment.departments
            .filter((department) => department.templates.length > 0)
            .map((department) => department.id)}
          queues={snapshot.productionQueues}
        />
      );
    },
  },
  cutting: {
    layout: "center",
    size: "adaptive",
    title: "Kesim",
    render: ({ snapshot }) => (
      <DepartmentQueuePanel
        departmentKeys={["cutting"]}
        investmentDepartmentIds={snapshot.investment.departments
          .filter((department) => department.templates.length > 0)
          .map((department) => department.id)}
        queues={snapshot.productionQueues}
      />
    ),
  },
  lineDetail: {
    title: "Production Line Upgrade",
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
        <UpgradeProductionLinePanel
          currencyCode={snapshot.factory.currencyCode}
          factoryId={snapshot.factory.id}
          line={line}
          nextTemplate={findNextUpgradeTemplate(snapshot, line)}
        />
      );
    },
  },
  investment: {
    layout: "center",
    size: "adaptive",
    title: "Üretim Hattı Yatırımı",
    render: ({ payload, snapshot }) => (
      <ProductionLineInvestmentPanel
        initialDepartmentId={String(payload?.departmentId ?? "")}
        sectionId={String(payload?.sectionId ?? "")}
        snapshot={snapshot}
      />
    ),
  },
  departmentDetail: {
    title: "Departman",
    render: ({ payload, snapshot }) => {
      const dockItem = findDockItem(snapshot, String(payload?.dockItemId ?? ""));

      if (!dockItem) {
        return (
          <PanelScaffold
            icon={<Factory size={18} />}
            title="Departman"
            value="-"
            body="Seçili departman bulunamadı."
          />
        );
      }

      return (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                {dockItem.kind}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">{dockItem.label}</h2>
            </div>
            {dockItem.badge ? (
              <Badge variant="outline">
                {dockItem.badge.label}: {dockItem.badge.count}
              </Badge>
            ) : (
              <Badge variant="secondary">Temiz</Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <PanelDatum label="Dock ID" value={dockItem.id.replace("dock:", "")} />
            <PanelDatum label="Departman" value={dockItem.departmentKeys.join(", ")} />
            <PanelDatum label="Sıra" value={dockItem.sortOrder.toString()} />
            <PanelDatum label="İkon" value={dockItem.iconKey} />
          </div>
        </div>
      );
    },
  },
};

export function PanelChrome({
  children,
  layout = "side",
  onClose,
  size = "wide",
  title,
}: {
  children: ReactNode;
  layout?: PanelLayout;
  onClose: () => void;
  size?: "adaptive" | "compact" | "wide";
  title: string;
}) {
  return (
    <aside
      className={cn(
        "pointer-events-auto flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-lg border border-white/10 text-card-foreground shadow-2xl backdrop-blur",
        layout === "center" &&
          size === "wide" &&
          "h-[min(780px,calc(100dvh-8rem))] w-[min(1380px,calc(100vw-2rem))] bg-background p-4 sm:w-[min(1380px,calc(100vw-7rem))]",
        layout === "center" &&
          size === "adaptive" &&
          "h-[min(720px,calc(100dvh-8rem))] w-[min(1080px,calc(100vw-2rem))] bg-background p-3 sm:w-[min(1080px,calc(100vw-5rem))]",
        layout === "center" &&
          size === "compact" &&
          "h-[min(760px,calc(100dvh-8rem))] w-[min(880px,calc(100vw-2rem))] bg-background p-4 sm:w-[min(880px,calc(100vw-5rem))]",
        layout === "side" &&
          "max-h-[calc(100dvh-8rem)] w-[min(420px,calc(100vw-2rem))] bg-card/95 p-4",
        layout === "dock" &&
          "max-h-[min(620px,calc(100dvh-7rem))] w-[min(400px,calc(100vw-7rem))] bg-background p-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-8 motion-safe:duration-300",
      )}
    >
      <div className="mb-3 flex shrink-0 items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h2>
        <Button aria-label="Paneli kapat" onClick={onClose} size="icon-sm" type="button" variant="ghost">
          <X size={16} />
        </Button>
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overscroll-contain",
          layout === "center" ? "overflow-hidden" : "overflow-y-auto",
        )}
      >
        {children}
      </div>
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

function findNextUpgradeTemplate(
  snapshot: GameSnapshot,
  line: Extract<FactoryMapItem, { kind: "productionLine" }>,
): ProductionLineInvestmentTemplate | null {
  const nextGrade = getNextGrade(line.grade);

  if (!nextGrade) return null;

  const department = snapshot.investment.departments.find(
    (item) => item.id === line.departmentId,
  );

  return (
    department?.templates.find((template) => template.grade === nextGrade) ??
    null
  );
}

function getNextGrade(
  grade: Extract<FactoryMapItem, { kind: "productionLine" }>["grade"],
) {
  const gradeOrder = ["WORKSHOP", "INDUSTRIAL", "PRECISION", "SMART"] as const;
  const index = gradeOrder.indexOf(grade);

  return index >= 0 ? (gradeOrder[index + 1] ?? null) : null;
}

function findDockItem(snapshot: GameSnapshot, dockItemId: string) {
  return snapshot.dock.items.find((item) => item.id === dockItemId) ?? null;
}

function findDepartmentKey(snapshot: GameSnapshot, departmentId: string) {
  if (!departmentId) return null;

  return (
    snapshot.productionQueues.queues.find(
      (queue) => queue.departmentId === departmentId,
    )?.departmentKey ?? null
  );
}
