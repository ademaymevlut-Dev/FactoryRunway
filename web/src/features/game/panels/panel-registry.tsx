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
import { RankingPanel } from "@/features/ranking/components/ranking-panel";
import { PlayerFeedbackPanel } from "@/features/player-feedback/components/player-feedback-panel";
import { localeUpper, type SupportedLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

import { gameCopy } from "../game-copy";
import type { FactoryMapItem, GamePanelKey, GameSnapshot } from "../types";

type PanelContext = {
  payload?: Record<string, string | number | boolean | null>;
  snapshot: GameSnapshot;
  onClose: () => void;
};

type PanelLayout = "center" | "dock" | "rightDrawer" | "side";

type PanelDefinition = {
  backdrop?: boolean;
  layout?: PanelLayout;
  size?: "adaptive" | "compact" | "investment" | "wide";
  titleKey: GamePanelKey;
  render: (context: PanelContext) => ReactNode;
};

export const panelRegistry: Record<GamePanelKey, PanelDefinition> = {
  orders: {
    layout: "center",
    titleKey: "orders",
    render: ({ snapshot }) => (
      <OrdersPanel locale={snapshot.locale} orderMarket={snapshot.orders} />
    ),
  },
  production: {
    titleKey: "production",
    render: ({ snapshot }) => {
      const copy = gameCopy[snapshot.locale].panels.production;

      return (
        <PanelScaffold
          icon={<Boxes size={18} />}
          title={copy.title}
          value={copy.value(snapshot.map.totals.productionLineCount)}
          body={copy.body}
        />
      );
    },
  },
  tasks: {
    layout: "dock",
    size: "compact",
    titleKey: "tasks",
    render: ({ snapshot }) => (
      <TasksPanel
        currencyCode={snapshot.factory.currencyCode}
        locale={snapshot.locale}
        tasks={snapshot.tasks}
      />
    ),
  },
  staff: {
    titleKey: "staff",
    render: ({ snapshot }) => {
      const copy = gameCopy[snapshot.locale].panels.staff;

      return (
        <PanelScaffold
          icon={<Users size={18} />}
          title={copy.title}
          value={`${snapshot.map.totals.assignedStaff}/${snapshot.map.totals.idealStaff}`}
          body={copy.body}
        />
      );
    },
  },
  finance: {
    backdrop: true,
    layout: "center",
    size: "compact",
    titleKey: "finance",
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
    titleKey: "reports",
    render: ({ snapshot }) => (
      <ReportsPanel
        currencyCode={snapshot.factory.currencyCode}
        currentDay={snapshot.factory.currentDay}
        factoryId={snapshot.factory.id}
      />
    ),
  },
  ranking: {
    backdrop: true,
    layout: "center",
    size: "adaptive",
    titleKey: "ranking",
    render: ({ snapshot }) => <RankingPanel locale={snapshot.locale} />,
  },
  playerFeedback: {
    backdrop: true,
    layout: "rightDrawer",
    titleKey: "playerFeedback",
    render: ({ snapshot }) => (
      <PlayerFeedbackPanel locale={snapshot.locale} />
    ),
  },
  warehouse: {
    layout: "center",
    size: "compact",
    titleKey: "warehouse",
    render: ({ snapshot }) => <WarehousePanel warehouse={snapshot.warehouse} />,
  },
  departmentQueue: {
    layout: "center",
    size: "adaptive",
    titleKey: "departmentQueue",
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
          locale={snapshot.locale}
          queues={snapshot.productionQueues}
        />
      );
    },
  },
  cutting: {
    layout: "center",
    size: "adaptive",
    titleKey: "cutting",
    render: ({ snapshot }) => (
      <DepartmentQueuePanel
        departmentKeys={["cutting"]}
        investmentDepartmentIds={snapshot.investment.departments
          .filter((department) => department.templates.length > 0)
          .map((department) => department.id)}
        locale={snapshot.locale}
        queues={snapshot.productionQueues}
      />
    ),
  },
  lineDetail: {
    titleKey: "lineDetail",
    render: ({ payload, snapshot }) => {
      const line = findLine(snapshot, String(payload?.lineId ?? ""));

      if (!line) {
        const copy = gameCopy[snapshot.locale].panels.lineMissing;

        return (
          <PanelScaffold
            icon={<Factory size={18} />}
            title={copy.title}
            value="-"
            body={copy.body}
          />
        );
      }

      return (
        <UpgradeProductionLinePanel
          currencyCode={snapshot.factory.currencyCode}
          factoryId={snapshot.factory.id}
          line={line}
          locale={snapshot.locale}
          nextTemplate={findNextUpgradeTemplate(snapshot, line)}
        />
      );
    },
  },
  investment: {
    layout: "center",
    size: "investment",
    titleKey: "investment",
    render: ({ payload, snapshot }) => (
      <ProductionLineInvestmentPanel
        initialDepartmentId={String(payload?.departmentId ?? "")}
        sectionId={String(payload?.sectionId ?? "")}
        snapshot={snapshot}
      />
    ),
  },
  departmentDetail: {
    titleKey: "departmentDetail",
    render: ({ payload, snapshot }) => {
      const dockItem = findDockItem(snapshot, String(payload?.dockItemId ?? ""));
      const panelCopy = gameCopy[snapshot.locale].panels;

      if (!dockItem) {
        const copy = panelCopy.departmentMissing;

        return (
          <PanelScaffold
            icon={<Factory size={18} />}
            title={copy.title}
            value="-"
            body={copy.body}
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
              <Badge variant="secondary">{panelCopy.departmentClean}</Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <PanelDatum
              label={panelCopy.departmentDatum.dockId}
              value={dockItem.id.replace("dock:", "")}
            />
            <PanelDatum
              label={panelCopy.departmentDatum.department}
              value={dockItem.departmentKeys.join(", ")}
            />
            <PanelDatum
              label={panelCopy.departmentDatum.order}
              value={dockItem.sortOrder.toString()}
            />
            <PanelDatum
              label={panelCopy.departmentDatum.icon}
              value={dockItem.iconKey}
            />
          </div>
        </div>
      );
    },
  },
};

export function PanelChrome({
  children,
  closeAria,
  layout = "side",
  locale,
  onClose,
  size = "wide",
  title,
}: {
  children: ReactNode;
  closeAria: string;
  layout?: PanelLayout;
  locale: SupportedLocale;
  onClose: () => void;
  size?: "adaptive" | "compact" | "investment" | "wide";
  title: string;
}) {
  return (
    <aside
      className={cn(
        "pointer-events-auto relative flex flex-col overflow-hidden border border-white/10 text-card-foreground shadow-2xl backdrop-blur",
        layout !== "rightDrawer" &&
          "max-h-[calc(100dvh-2rem)] rounded-lg",
        layout === "center" &&
          size === "wide" &&
          "h-[min(780px,calc(100dvh-8rem))] w-[min(1380px,calc(100vw-2rem))] bg-background p-4 sm:w-[min(1380px,calc(100vw-7rem))]",
        layout === "center" &&
          size === "adaptive" &&
          "h-[min(720px,calc(100dvh-13rem))] w-[min(1080px,calc(100vw-2rem))] bg-background p-3 sm:w-[min(1080px,calc(100vw-5rem))]",
        layout === "center" &&
          size === "compact" &&
          "h-[min(760px,calc(100dvh-8rem))] w-[min(880px,calc(100vw-2rem))] bg-background p-4 sm:w-[min(880px,calc(100vw-5rem))]",
        layout === "center" &&
          size === "investment" &&
          "h-[min(680px,calc(100dvh-13rem))] w-[min(920px,calc(100vw-2rem))] bg-background p-3 sm:w-[min(920px,calc(100vw-5rem))]",
        layout === "side" &&
          "max-h-[calc(100dvh-8rem)] w-[min(420px,calc(100vw-2rem))] bg-card/95 p-4",
        layout === "dock" &&
          "max-h-[min(620px,calc(100dvh-12rem))] w-[min(400px,calc(100vw-7rem))] bg-background p-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-8 motion-safe:duration-300",
        layout === "rightDrawer" &&
          "h-dvh w-full rounded-none bg-background p-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-8 motion-safe:duration-300 sm:h-[calc(100dvh-1rem)] sm:w-[min(560px,calc(100vw-1rem))] sm:rounded-lg sm:p-4",
      )}
    >
      {title ? (
        <div
          className={cn(
            "flex shrink-0 items-center justify-between gap-4",
            size === "investment" ? "mb-2" : "mb-3",
          )}
        >
          <h2 className="text-sm font-semibold tracking-widest text-muted-foreground">
            {localeUpper(title, locale)}
          </h2>
          <Button
            aria-label={closeAria}
            onClick={onClose}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <X size={16} />
          </Button>
        </div>
      ) : (
        <Button
          aria-label={closeAria}
          className="absolute right-2 top-2 z-20"
          onClick={onClose}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <X size={16} />
        </Button>
      )}
      <div
        className={cn(
          "min-h-0 flex-1 overscroll-contain",
          layout === "center" || layout === "rightDrawer"
            ? "overflow-hidden"
            : "overflow-y-auto",
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
