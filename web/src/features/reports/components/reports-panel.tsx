"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Loader2,
  RefreshCcw,
  Users,
  UserRoundCog,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getGameReportAction } from "@/features/reports/actions/get-game-report-action";
import type {
  CustomersReport,
  GameReport,
  GameReportTab,
  StaffReport,
} from "@/features/reports/types";
import type { CurrencyCode } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

type ReportsPanelProps = {
  currencyCode: CurrencyCode;
  currentDay: number;
  factoryId: string;
};

const reportTabs: Array<{
  icon: LucideIcon;
  label: string;
  value: GameReportTab;
}> = [
  { icon: Users, label: "Müşteriler", value: "customers" },
  { icon: UserRoundCog, label: "Personel", value: "staff" },
];

type CustomerSortKey =
  | "averageUnitPriceCents"
  | "customerName"
  | "orderCount"
  | "productCount"
  | "totalQuantity"
  | "totalRevenueCents";
type SortDirection = "asc" | "desc";

const customerTableColumns: Array<{
  align?: "left" | "right";
  key: CustomerSortKey;
  label: string;
}> = [
  { key: "customerName", label: "Müşteri" },
  { align: "right", key: "orderCount", label: "Sipariş" },
  { align: "right", key: "productCount", label: "Ürün" },
  { align: "right", key: "totalQuantity", label: "Adet" },
  { align: "right", key: "totalRevenueCents", label: "Ciro" },
  { align: "right", key: "averageUnitPriceCents", label: "Birim Fiyat" },
];

export function ReportsPanel({
  currencyCode,
  currentDay,
  factoryId,
}: ReportsPanelProps) {
  const [activeTab, setActiveTab] = useState<GameReportTab>("customers");
  const [reports, setReports] = useState<Partial<Record<GameReportTab, GameReport>>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeReport = reports[activeTab];
  const loadReport = useCallback((tab: GameReportTab) => {
    startTransition(async () => {
      const result = await getGameReportAction({ factoryId, tab });

      if (!result.ok) {
        setError(result.code);
        return;
      }

      setReports((current) => ({
        ...current,
        [result.report.tab]: result.report,
      }));
    });
  }, [factoryId]);
  const handleTabChange = useCallback((value: string) => {
    setError(null);
    setActiveTab(value as GameReportTab);
  }, []);
  const handleRetry = useCallback(() => {
    setError(null);
    loadReport(activeTab);
  }, [activeTab, loadReport]);

  useEffect(() => {
    if (reports[activeTab] || isPending || error) return;

    loadReport(activeTab);
  }, [activeTab, error, isPending, loadReport, reports]);

  return (
    <section className="flex h-full min-h-0 flex-col gap-3">
      <div className="shrink-0 rounded-lg border border-border bg-card/70 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Fabrika Raporları
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              Operasyon özeti
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Kabul edilen siparişler ve aktif personel yapısı tab bazlı yüklenir.
            </p>
          </div>
          <Badge className="shrink-0" variant="secondary">
            {currentDay}. gün
          </Badge>
        </div>
      </div>

      <Tabs className="shrink-0" onValueChange={handleTabChange} value={activeTab}>
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-lg bg-card/70 p-1">
          {reportTabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <TabsTrigger
                className="h-8 shrink-0 rounded-md px-3 text-xs"
                key={tab.value}
                value={tab.value}
              >
                <Icon size={14} />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {!activeReport && isPending ? (
          <ReportLoadingState />
        ) : error ? (
          <ReportErrorState onRetry={handleRetry} />
        ) : activeReport ? (
          <ReportContent
            currencyCode={activeReport.currencyCode ?? currencyCode}
            report={activeReport}
          />
        ) : (
          <ReportLoadingState />
        )}
      </div>
    </section>
  );
}

function ReportContent({
  currencyCode,
  report,
}: {
  currencyCode: CurrencyCode;
  report: GameReport;
}) {
  if (report.tab === "staff") {
    return <StaffReportContent currencyCode={currencyCode} report={report} />;
  }

  return <CustomersReportContent currencyCode={currencyCode} report={report} />;
}

function CustomersReportContent({
  currencyCode,
  report,
}: {
  currencyCode: CurrencyCode;
  report: CustomersReport;
}) {
  const [sort, setSort] = useState<{
    direction: SortDirection;
    key: CustomerSortKey;
  }>({ direction: "desc", key: "orderCount" });
  const sortedRows = useMemo(() => {
    return [...report.rows].sort((first, second) => {
      const result = compareCustomerRows(first, second, sort.key);

      if (result !== 0) {
        return sort.direction === "asc" ? result : -result;
      }

      return first.customerName.localeCompare(second.customerName, "tr");
    });
  }, [report.rows, sort.direction, sort.key]);
  const handleSort = useCallback((key: CustomerSortKey) => {
    setSort((current) => {
      if (current.key === key) {
        return {
          direction: current.direction === "asc" ? "desc" : "asc",
          key,
        };
      }

      return {
        direction: key === "customerName" ? "asc" : "desc",
        key,
      };
    });
  }, []);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-4">
        <SummaryCard label="Müşteri" value={formatNumber(report.summary.customerCount)} />
        <SummaryCard label="Sipariş" value={formatNumber(report.summary.orderCount)} />
        <SummaryCard label="Toplam Adet" value={formatNumber(report.summary.totalQuantity)} />
        <SummaryCard
          label="Toplam Ciro"
          tone="profit"
          value={formatMoney(report.summary.totalRevenueCents, currencyCode)}
        />
      </div>

      <ReportTableShell
        emptyText="Henüz kabul edilmiş müşteri siparişi yok."
        hasRows={report.rows.length > 0}
      >
        <table className="min-w-full text-left text-xs">
          <thead className="sticky top-0 z-10 bg-card/95 text-[10px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
            <tr>
              {customerTableColumns.map((column) => (
                <th
                  className={cn(
                    "px-3 py-2 font-semibold",
                    column.align === "right" && "text-right",
                  )}
                  key={column.key}
                >
                  <SortableHeaderButton
                    active={sort.key === column.key}
                    align={column.align}
                    direction={sort.direction}
                    label={column.label}
                    onClick={() => handleSort(column.key)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedRows.map((row) => (
              <tr className="hover:bg-background/45" key={row.customerId}>
                <td className="px-3 py-2">
                  <span className="block font-medium text-foreground">
                    {row.customerName}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {formatNumber(row.orderCount)}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {formatNumber(row.productCount)}
                </td>
                <td className="px-3 py-2 text-right font-medium text-foreground">
                  {formatNumber(row.totalQuantity)}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-primary">
                  {formatMoney(row.totalRevenueCents, currencyCode)}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-foreground">
                  {formatMoney(row.averageUnitPriceCents, currencyCode)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportTableShell>
    </div>
  );
}

function SortableHeaderButton({
  active,
  align = "left",
  direction,
  label,
  onClick,
}: {
  active: boolean;
  align?: "left" | "right";
  direction: SortDirection;
  label: string;
  onClick: () => void;
}) {
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <button
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors hover:bg-background/70 hover:text-foreground",
        active && "text-foreground",
        align === "right" && "ml-auto justify-end",
      )}
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <Icon className="size-3 shrink-0" />
    </button>
  );
}

function StaffReportContent({
  currencyCode,
  report,
}: {
  currencyCode: CurrencyCode;
  report: StaffReport;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-4">
        <SummaryCard label="Personel" value={formatNumber(report.summary.totalStaff)} />
        <SummaryCard label="Departman" value={formatNumber(report.summary.departmentCount)} />
        <SummaryCard label="Görev" value={formatNumber(report.summary.roleCount)} />
        <SummaryCard
          label="Aylık Maaş"
          tone="cost"
          value={formatMoney(report.summary.totalMonthlySalaryCents, currencyCode)}
        />
      </div>

      <ReportTableShell
        emptyText="Aktif personel ataması bulunmuyor."
        hasRows={report.rows.length > 0}
      >
        <table className="min-w-full text-left text-xs">
          <thead className="sticky top-0 z-10 bg-card/95 text-[10px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
            <tr>
              <th className="px-3 py-2 font-semibold">Departman</th>
              <th className="px-3 py-2 font-semibold">Görev</th>
              <th className="px-3 py-2 text-right font-semibold">Kişi</th>
              <th className="px-3 py-2 text-right font-semibold">Birim Maaş</th>
              <th className="px-3 py-2 text-right font-semibold">Toplam Maaş</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {report.rows.map((row) => (
              <tr
                className="hover:bg-background/45"
                key={`${row.departmentKey}:${row.roleKey}`}
              >
                <td className="px-3 py-2">
                  <span className="block font-medium text-foreground">
                    {row.departmentName}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    {formatStaffType(row.staffType)}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {row.roleName}
                </td>
                <td className="px-3 py-2 text-right font-medium text-foreground">
                  {formatNumber(row.quantity)}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {formatMoney(row.monthlySalaryCents, currencyCode)}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-primary">
                  {formatMoney(row.totalMonthlySalaryCents, currencyCode)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportTableShell>
    </div>
  );
}

function SummaryCard({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "cost" | "default" | "profit";
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/70 p-3">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <strong
        className={cn(
          "mt-2 block truncate text-lg font-semibold",
          tone === "profit" && "text-emerald-300",
          tone === "cost" && "text-amber-300",
          tone === "default" && "text-foreground",
        )}
      >
        {value}
      </strong>
    </div>
  );
}

function ReportTableShell({
  children,
  emptyText,
  hasRows,
}: {
  children: ReactNode;
  emptyText: string;
  hasRows: boolean;
}) {
  if (!hasRows) {
    return (
      <div className="grid min-h-[260px] place-items-center rounded-lg border border-dashed border-border bg-card/50 p-6 text-center">
        <div>
          <BarChart3 className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">{emptyText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card/70">
      <div className="max-h-[430px] overflow-auto">{children}</div>
    </div>
  );
}

function ReportLoadingState() {
  return (
    <div className="grid min-h-[320px] place-items-center rounded-lg border border-border bg-card/55">
      <div className="text-center">
        <Loader2 className="mx-auto size-7 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Rapor hazırlanıyor...</p>
      </div>
    </div>
  );
}

function ReportErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid min-h-[320px] place-items-center rounded-lg border border-destructive/35 bg-card/55 p-6 text-center">
      <div>
        <p className="text-sm font-medium text-foreground">
          Rapor yüklenemedi.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Yetki, bağlantı ya da geçici veri sorunu olabilir.
        </p>
        <Button className="mt-4" onClick={onRetry} size="sm" type="button">
          <RefreshCcw size={14} />
          Tekrar Dene
        </Button>
      </div>
    </div>
  );
}

function formatMoney(cents: string, currencyCode: CurrencyCode) {
  const value = Number(cents) / 100;

  return new Intl.NumberFormat("tr-TR", {
    currency: currencyCode,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Number.isFinite(value) ? value : 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function compareCustomerRows(
  first: CustomersReport["rows"][number],
  second: CustomersReport["rows"][number],
  key: CustomerSortKey,
) {
  switch (key) {
    case "averageUnitPriceCents":
      return compareCents(first.averageUnitPriceCents, second.averageUnitPriceCents);
    case "customerName":
      return first.customerName.localeCompare(second.customerName, "tr");
    case "orderCount":
      return first.orderCount - second.orderCount;
    case "productCount":
      return first.productCount - second.productCount;
    case "totalQuantity":
      return first.totalQuantity - second.totalQuantity;
    case "totalRevenueCents":
      return compareCents(first.totalRevenueCents, second.totalRevenueCents);
  }
}

function compareCents(first: string, second: string) {
  const firstValue = BigInt(first);
  const secondValue = BigInt(second);

  if (firstValue === secondValue) return 0;

  return firstValue > secondValue ? 1 : -1;
}

function formatStaffType(value: string) {
  switch (value) {
    case "DIRECT_PRODUCTION":
      return "Üretim";
    case "MANAGEMENT":
      return "Yönetim";
    case "SUPPORT":
      return "Destek";
    default:
      return value;
  }
}
