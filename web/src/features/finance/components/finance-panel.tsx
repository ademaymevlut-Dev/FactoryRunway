"use client";

import {
  Banknote,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Factory,
  Landmark,
  Loader2,
  RefreshCcw,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { getFinanceReportAction } from "@/features/finance/actions/get-finance-report-action";
import type {
  FinanceCashReport,
  FinanceCategoryBreakdown,
  FinanceDueItem,
  FinanceExpensesReport,
  FinanceInvestmentReport,
  FinanceOverviewReport,
  FinancePeriodView,
  FinanceProfitReport,
  FinanceReport,
  FinanceReportTab,
  FinanceTone,
  FinanceTransactionItem,
} from "@/features/finance/types";
import type { CurrencyCode } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type FinancePanelProps = {
  cashBalanceCents: string;
  currencyCode: CurrencyCode;
  currentDay: number;
  factoryId: string;
};

const reportTabs: Array<{
  icon: LucideIcon;
  label: string;
  value: FinanceReportTab;
}> = [
  { icon: Landmark, label: "Özet", value: "overview" },
  { icon: TrendingUp, label: "Kâr", value: "profit" },
  { icon: WalletCards, label: "Nakit", value: "cash" },
  { icon: Factory, label: "Yatırım", value: "investment" },
  { icon: BarChart3, label: "Gider", value: "expenses" },
];

export function FinancePanel({
  cashBalanceCents,
  currencyCode,
  currentDay,
  factoryId,
}: FinancePanelProps) {
  const [activeTab, setActiveTab] = useState<FinanceReportTab>("overview");
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number | null>(null);
  const [reports, setReports] = useState<Record<string, FinanceReport>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeReport = reports[getReportKey(activeTab, selectedPeriodIndex)];

  const loadReport = useCallback((tab: FinanceReportTab, periodIndex: number | null) => {
    startTransition(async () => {
      const result = await getFinanceReportAction({
        factoryId,
        periodIndex: tab === "investment" ? null : periodIndex,
        tab,
      });

      if (!result.ok) {
        setError(result.code);
        return;
      }

      setReports((current) => ({
        ...current,
        [getReportKey(
          result.report.tab,
          result.report.tab === "investment"
            ? null
            : result.report.period.periodIndex,
        )]: result.report,
      }));

      if (result.report.tab !== "investment") {
        setSelectedPeriodIndex(result.report.period.periodIndex);
      }
    });
  }, [factoryId]);
  const handleTabChange = useCallback((value: string) => {
    setError(null);
    setActiveTab(value as FinanceReportTab);
  }, []);
  const handleRetry = useCallback(() => {
    setError(null);
    loadReport(activeTab, selectedPeriodIndex);
  }, [activeTab, loadReport, selectedPeriodIndex]);
  const handlePeriodChange = useCallback((delta: -1 | 1) => {
    const report =
      activeReport?.tab === "investment" ? null : activeReport ?? null;
    const period = report?.period;

    if (!period) return;

    const nextPeriodIndex = Math.min(
      period.maxPeriodIndex,
      Math.max(1, period.periodIndex + delta),
    );

    if (nextPeriodIndex === period.periodIndex) return;

    setError(null);
    setSelectedPeriodIndex(nextPeriodIndex);

    if (!reports[getReportKey(activeTab, nextPeriodIndex)]) {
      loadReport(activeTab, nextPeriodIndex);
    }
  }, [activeReport, activeTab, loadReport, reports]);

  useEffect(() => {
    if (reports[getReportKey(activeTab, selectedPeriodIndex)]) return;

    loadReport(activeTab, selectedPeriodIndex);
  }, [activeTab, loadReport, reports, selectedPeriodIndex]);

  const headerReport = activeReport ?? reports[getReportKey("overview", selectedPeriodIndex)];
  const periodLabel = headerReport
    ? headerReport.tab === "investment"
      ? "Kuruluştan bugüne"
      : formatPeriodTitle(headerReport.period)
    : `${currentDay}. gün`;
  const headerPeriod =
    headerReport?.tab === "investment" ? null : headerReport?.period ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <section className="shrink-0 overflow-hidden rounded-lg border border-border bg-card/70">
        <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Finans Kontrol
            </p>
            <h2 className="mt-2 truncate text-2xl font-semibold text-foreground">
              Fabrika performansı
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">{periodLabel}</Badge>
              <Badge variant="secondary">
                {headerPeriod
                  ? `${headerPeriod.startDay}-${headerPeriod.endDay}. gün`
                  : headerReport?.tab === "investment"
                    ? "Tüm dönemler"
                  : `${currentDay}. gün`}
              </Badge>
            </div>
          </div>
          <div className="grid min-w-[220px] content-center rounded-lg border border-primary/20 bg-primary/10 p-3">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Banknote size={14} />
              Kasa
            </span>
            <strong className="mt-1 truncate font-mono text-2xl text-foreground">
              {formatMoney(
                headerReport?.cashBalanceCents ?? cashBalanceCents,
                headerReport?.currencyCode ?? currencyCode,
              )}
            </strong>
          </div>
        </div>
      </section>

      <Tabs
        className="shrink-0"
        onValueChange={handleTabChange}
        value={activeTab}
      >
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
      {activeTab !== "investment" ? (
        <PeriodNavigator
          disabled={isPending && !activeReport}
          onNext={() => handlePeriodChange(1)}
          onPrevious={() => handlePeriodChange(-1)}
          period={activeReport?.tab === "investment" ? null : activeReport?.period ?? null}
        />
      ) : (
        <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-border bg-card/70 px-3 py-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Kuruluştan bugüne
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Yatırım, leasing ve kalan borçlar aylık dönemle sınırlandırılmaz.
            </p>
          </div>
          <Badge variant="outline">Tüm yıllar</Badge>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {!activeReport && isPending ? (
          <FinanceLoadingState />
        ) : error ? (
          <FinanceErrorState onRetry={handleRetry} />
        ) : activeReport ? (
          <ReportContent report={activeReport} />
        ) : (
          <FinanceLoadingState />
        )}
      </div>
    </div>
  );
}

function ReportContent({ report }: { report: FinanceReport }) {
  if (report.tab === "overview") return <OverviewReport report={report} />;
  if (report.tab === "profit") return <ProfitReport report={report} />;
  if (report.tab === "cash") return <CashReport report={report} />;
  if (report.tab === "investment") return <InvestmentReport report={report} />;

  return <ExpensesReport report={report} />;
}

function PeriodNavigator({
  disabled,
  onNext,
  onPrevious,
  period,
}: {
  disabled: boolean;
  onNext: () => void;
  onPrevious: () => void;
  period: FinancePeriodView | null;
}) {
  const previousDisabled = disabled || !period || period.periodIndex <= 1;
  const nextDisabled =
    disabled || !period || period.periodIndex >= period.maxPeriodIndex;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-border bg-card/70 px-3 py-2">
      <Button
        aria-label="Önceki ay"
        disabled={previousDisabled}
        onClick={onPrevious}
        size="icon-sm"
        type="button"
        variant="outline"
      >
        <ChevronLeft size={16} />
      </Button>
      <div className="min-w-0 text-center">
        <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {period ? getMonthName(period.monthInYear) : "Dönem yükleniyor"}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {period
            ? `Fabrikanın ${period.yearIndex}. yılı · ${period.startDay}-${period.endDay}. gün`
            : "Finans takvimi hazırlanıyor"}
        </p>
      </div>
      <Button
        aria-label="Sonraki ay"
        disabled={nextDisabled}
        onClick={onNext}
        size="icon-sm"
        type="button"
        variant="outline"
      >
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}

function OverviewReport({ report }: { report: FinanceOverviewReport }) {
  return (
    <div className="space-y-3">
      <MetricGrid metrics={report.cards} currencyCode={report.currencyCode} />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PanelBlock title="Bekleyen hareketler">
          <div className="grid grid-cols-2 gap-2">
            <SmallMoney
              label="7 gün tahsilat"
              value={report.dueSummary.next7ReceivableCents}
              currencyCode={report.currencyCode}
              tone="positive"
            />
            <SmallMoney
              label="7 gün ödeme"
              value={report.dueSummary.next7PayableCents}
              currencyCode={report.currencyCode}
              tone="warning"
            />
            <SmallMoney
              label="Geciken tahsilat"
              value={report.dueSummary.overdueReceivableCents}
              currencyCode={report.currencyCode}
              tone="warning"
            />
            <SmallMoney
              label="Geciken ödeme"
              value={report.dueSummary.overduePayableCents}
              currencyCode={report.currencyCode}
              tone="negative"
            />
          </div>
        </PanelBlock>
        <PanelBlock title="En büyük gider">
          {report.topExpense ? (
            <BreakdownRow
              currencyCode={report.currencyCode}
              item={report.topExpense}
            />
          ) : (
            <EmptyLine text="Bu dönem gider kaydı yok." />
          )}
        </PanelBlock>
      </div>
      <PanelBlock title="Son kasa hareketleri">
        <TransactionList
          currencyCode={report.currencyCode}
          emptyText="Henüz finans hareketi yok."
          transactions={report.latestTransactions}
        />
      </PanelBlock>
    </div>
  );
}

function ProfitReport({ report }: { report: FinanceProfitReport }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          amountCents={report.completedProductionValueCents}
          caption={`${formatInteger(report.completedQuantity)} adet final üretim`}
          currencyCode={report.currencyCode}
          label="Üretimden oluşan değer"
          tone="positive"
        />
        <MetricCard
          amountCents={report.operationalProfitCents}
          caption={`${formatBps(report.operationalMarginBps)} operasyon marjı`}
          currencyCode={report.currencyCode}
          label="Operasyonel kâr"
          tone={moneyTone(report.operationalProfitCents)}
        />
        <MetricCard
          amountCents={report.shippedRevenueCents}
          caption="Bu ay sevk edilen sipariş"
          currencyCode={report.currencyCode}
          label="Sevk ciro"
          tone="info"
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <PanelBlock title="Final üretim değeri">
          {report.completionItems.length > 0 ? (
            <div className="space-y-2">
              {report.completionItems.map((item) => (
                <div
                  className="grid gap-2 rounded-lg border border-border bg-background/45 p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                  key={`${item.day}:${item.orderNo}:${item.productName}:${item.unitPriceCents}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.productName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.orderNo} · {item.day}. gün · {formatInteger(item.quantity)} adet
                    </p>
                  </div>
                  <strong className="font-mono text-sm text-foreground">
                    {formatMoney(item.amountCents, report.currencyCode)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyLine text="Bu finans ayında final üretim yok." />
          )}
        </PanelBlock>
        <PanelBlock title="Operasyonel gider">
          <div className="mb-3 rounded-lg border border-border bg-background/45 p-3">
            <p className="text-xs text-muted-foreground">Toplam dönem gideri</p>
            <strong className="mt-1 block font-mono text-xl text-foreground">
              {formatMoney(report.operationalExpenseCents, report.currencyCode)}
            </strong>
          </div>
          <BreakdownList
            currencyCode={report.currencyCode}
            items={report.expenseBreakdown}
          />
        </PanelBlock>
      </div>
    </div>
  );
}

function CashReport({ report }: { report: FinanceCashReport }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          amountCents={report.incomeCents}
          caption="Kasaya giren"
          currencyCode={report.currencyCode}
          label="Gelir"
          tone="positive"
        />
        <MetricCard
          amountCents={report.expenseCents}
          caption="Kasadan çıkan"
          currencyCode={report.currencyCode}
          label="Gider"
          tone="warning"
        />
        <MetricCard
          amountCents={report.netCashCents}
          caption="Gelir eksi gider"
          currencyCode={report.currencyCode}
          label="Net nakit"
          tone={moneyTone(report.netCashCents)}
        />
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PanelBlock title="Günlük nakit çizgisi">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
            {report.dailyNet.map((day) => (
              <div
                className="rounded-lg border border-border bg-background/45 p-2"
                key={day.day}
              >
                <p className="text-[11px] font-medium text-muted-foreground">
                  {day.day}. gün
                </p>
                <p className={cn("mt-1 truncate font-mono text-xs", toneTextClass(moneyTone(day.netCents)))}>
                  {formatSignedMoney(day.netCents, report.currencyCode)}
                </p>
              </div>
            ))}
          </div>
        </PanelBlock>
        <PanelBlock title="Açık vadeler">
          <DueList
            currencyCode={report.currencyCode}
            dues={report.openDues}
          />
        </PanelBlock>
      </div>
      <PanelBlock title="Kasa hareketleri">
        <TransactionList
          currencyCode={report.currencyCode}
          emptyText="Bu finans ayında kasa hareketi yok."
          transactions={report.transactions}
        />
      </PanelBlock>
    </div>
  );
}

function InvestmentReport({ report }: { report: FinanceInvestmentReport }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          amountCents={report.totalInvestedCashCents}
          caption="Kuruluştan bugüne kasadan çıkan"
          currencyCode={report.currencyCode}
          label="Yatırım nakdi"
          tone="warning"
        />
        <MetricCard
          amountCents={report.machinePurchaseCents}
          caption="Satın alma ve upgrade toplamı"
          currencyCode={report.currencyCode}
          label="Makine"
          tone="info"
        />
        <MetricCard
          amountCents={report.leasingPaidCents}
          caption="Bugüne kadar ödenen taksit"
          currencyCode={report.currencyCode}
          label="Leasing ödeme"
          tone="neutral"
        />
        <MetricCard
          amountCents={report.activeLeasingObligationCents}
          caption="Aktif kalan yük"
          currencyCode={report.currencyCode}
          label="Leasing borç"
          tone="negative"
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
        <PanelBlock title="Aktif leasing">
          {report.activeContracts.length > 0 ? (
            <div className="space-y-2">
              {report.activeContracts.map((contract) => (
                <div
                  className="rounded-lg border border-border bg-background/45 p-3"
                  key={contract.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {contract.lineName}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {contract.remainingInstallments} taksit kaldı
                      </p>
                    </div>
                    <Badge variant="outline">
                      {contract.nextDueDay ? `${contract.nextDueDay}. gün` : "Kapalı"}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <SmallMoney
                      currencyCode={report.currencyCode}
                      label="Taksit"
                      tone="neutral"
                      value={contract.monthlyPaymentCents}
                    />
                    <SmallMoney
                      currencyCode={report.currencyCode}
                      label="Kalan"
                      tone="negative"
                      value={contract.remainingAmountCents}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyLine text="Aktif leasing sözleşmesi yok." />
          )}
        </PanelBlock>
        <PanelBlock title="Yatırım hareketleri">
          <TransactionList
            currencyCode={report.currencyCode}
            emptyText="Yatırım hareketi yok."
            transactions={report.investmentTransactions}
          />
        </PanelBlock>
      </div>
    </div>
  );
}

function ExpensesReport({ report }: { report: FinanceExpensesReport }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          amountCents={report.totalExpenseCents}
          caption="Bu ay oluşan yük"
          currencyCode={report.currencyCode}
          label="Toplam gider"
          tone="warning"
        />
        <MetricCard
          amountCents={report.operatingExpenseCents}
          caption="İşçilik, kira, elektrik, fason"
          currencyCode={report.currencyCode}
          label="Operasyon"
          tone="neutral"
        />
        <MetricCard
          amountCents={report.investmentExpenseCents}
          caption="Makine ve leasing"
          currencyCode={report.currencyCode}
          label="Yatırım"
          tone="info"
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <PanelBlock title="Gider kırılımı">
          <BreakdownList
            currencyCode={report.currencyCode}
            items={report.breakdown}
          />
        </PanelBlock>
        <PanelBlock title="Son giderler">
          <TransactionList
            currencyCode={report.currencyCode}
            emptyText="Bu ay gider hareketi yok."
            transactions={report.recentExpenses}
          />
        </PanelBlock>
      </div>
    </div>
  );
}

function MetricGrid({
  currencyCode,
  metrics,
}: {
  currencyCode: CurrencyCode;
  metrics: FinanceOverviewReport["cards"];
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard
          amountCents={metric.amountCents}
          caption={metric.caption}
          currencyCode={currencyCode}
          key={metric.id}
          label={metric.label}
          tone={metric.tone}
          value={metric.value}
        />
      ))}
    </div>
  );
}

function MetricCard({
  amountCents,
  caption,
  currencyCode,
  label,
  tone,
  value,
}: {
  amountCents?: string;
  caption: string;
  currencyCode: CurrencyCode;
  label: string;
  tone: FinanceTone;
  value?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-card/70 p-3", toneBorderClass(tone))}>
      <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
      <strong className={cn("mt-2 block truncate font-mono text-xl", toneTextClass(tone))}>
        {amountCents ? formatMoney(amountCents, currencyCode) : value}
      </strong>
      <p className="mt-1 truncate text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}

function PanelBlock({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-card/70 p-3">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function BreakdownList({
  currencyCode,
  items,
}: {
  currencyCode: CurrencyCode;
  items: FinanceCategoryBreakdown[];
}) {
  if (items.length === 0) {
    return <EmptyLine text="Bu dönem kırılım yok." />;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <BreakdownRow
          currencyCode={currencyCode}
          item={item}
          key={item.category}
        />
      ))}
    </div>
  );
}

function BreakdownRow({
  currencyCode,
  item,
}: {
  currencyCode: CurrencyCode;
  item: FinanceCategoryBreakdown;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/45 p-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
        <strong className="shrink-0 font-mono text-sm text-foreground">
          {formatMoney(item.amountCents, currencyCode)}
        </strong>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", toneBarClass(item.tone))}
          style={{ width: `${Math.min(100, Math.max(0, item.shareBps / 100))}%` }}
        />
      </div>
    </div>
  );
}

function TransactionList({
  currencyCode,
  emptyText,
  transactions,
}: {
  currencyCode: CurrencyCode;
  emptyText: string;
  transactions: FinanceTransactionItem[];
}) {
  if (transactions.length === 0) {
    return <EmptyLine text={emptyText} />;
  }

  return (
    <div className="space-y-2">
      {transactions.map((transaction) => (
        <div
          className="grid gap-2 rounded-lg border border-border bg-background/45 p-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
          key={transaction.id}
        >
          <span className="grid size-8 place-items-center rounded-lg border border-border bg-card">
            {transaction.direction === "INCOME" ? (
              <CircleDollarSign className="text-emerald-300" size={15} />
            ) : (
              <WalletCards className="text-amber-300" size={15} />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {transaction.label}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {transaction.description} · {transaction.gameDay}. gün
            </p>
          </div>
          <strong className={cn("font-mono text-sm", transaction.direction === "INCOME" ? "text-emerald-300" : "text-amber-300")}>
            {transaction.direction === "INCOME" ? "+" : "-"}
            {formatMoney(transaction.amountCents, currencyCode)}
          </strong>
        </div>
      ))}
    </div>
  );
}

function DueList({
  currencyCode,
  dues,
}: {
  currencyCode: CurrencyCode;
  dues: FinanceDueItem[];
}) {
  if (dues.length === 0) {
    return <EmptyLine text="Yakın vadeli açık kayıt yok." />;
  }

  return (
    <div className="space-y-2">
      {dues.map((due) => {
        const remainingCents = BigInt(due.amountCents) - BigInt(due.settledAmountCents);

        return (
          <div
            className="rounded-lg border border-border bg-background/45 p-2.5"
            key={due.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{due.label}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {due.description}
                </p>
              </div>
              <Badge variant={due.status === "OVERDUE" ? "destructive" : "outline"}>
                {due.dueDay}. gün
              </Badge>
            </div>
            <p className={cn("mt-2 font-mono text-sm", due.direction === "INCOME" ? "text-emerald-300" : "text-amber-300")}>
              {due.direction === "INCOME" ? "+" : "-"}
              {formatMoney(remainingCents.toString(), currencyCode)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function SmallMoney({
  currencyCode,
  label,
  tone,
  value,
}: {
  currencyCode: CurrencyCode;
  label: string;
  tone: FinanceTone;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-background/45 p-2">
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate font-mono text-sm", toneTextClass(tone))}>
        {formatMoney(value, currencyCode)}
      </p>
    </div>
  );
}

function FinanceLoadingState() {
  return (
    <div className="grid min-h-[360px] place-items-center rounded-lg border border-border bg-card/60">
      <div className="text-center">
        <Loader2 className="mx-auto animate-spin text-primary" size={28} />
        <p className="mt-3 text-sm text-muted-foreground">Finans raporu hazırlanıyor</p>
      </div>
    </div>
  );
}

function FinanceErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid min-h-[360px] place-items-center rounded-lg border border-border bg-card/60 p-8 text-center">
      <div>
        <Clock3 className="mx-auto text-amber-300" size={30} />
        <h3 className="mt-3 text-lg font-semibold text-foreground">
          Rapor yüklenemedi
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Finans verisi alınırken beklenmeyen bir sorun oluştu.
        </p>
        <Button className="mt-4" onClick={onRetry} size="sm" type="button" variant="outline">
          <RefreshCcw size={14} />
          Yenile
        </Button>
      </div>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border bg-background/35 p-3 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function formatMoney(valueCents: bigint | number | string, currencyCode: CurrencyCode) {
  return new Intl.NumberFormat("tr-TR", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(BigInt(valueCents)) / 100);
}

function formatSignedMoney(valueCents: string, currencyCode: CurrencyCode) {
  const value = BigInt(valueCents);
  const prefix = value > BigInt(0) ? "+" : "";

  return `${prefix}${formatMoney(value, currencyCode)}`;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatBps(value: number) {
  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
  }).format(value / 100)}%`;
}

const monthNames = [
  "OCAK",
  "ŞUBAT",
  "MART",
  "NİSAN",
  "MAYIS",
  "HAZİRAN",
  "TEMMUZ",
  "AĞUSTOS",
  "EYLÜL",
  "EKİM",
  "KASIM",
  "ARALIK",
] as const;

function getMonthName(monthInYear: number) {
  return monthNames[Math.max(0, Math.min(11, monthInYear - 1))] ?? "OCAK";
}

function formatPeriodTitle(period: FinancePeriodView) {
  return `Fabrikanın ${period.yearIndex}. Yılı · ${getMonthName(period.monthInYear)}`;
}

function getReportKey(tab: FinanceReportTab, periodIndex: number | null) {
  if (tab === "investment") return "investment:all";

  return `${tab}:${periodIndex ?? "current"}`;
}

function moneyTone(valueCents: string): FinanceTone {
  const value = BigInt(valueCents);

  if (value > BigInt(0)) return "positive";
  if (value < BigInt(0)) return "negative";

  return "neutral";
}

function toneBorderClass(tone: FinanceTone) {
  const classes: Record<FinanceTone, string> = {
    info: "border-sky-400/25",
    negative: "border-rose-400/30",
    neutral: "border-border",
    positive: "border-emerald-400/30",
    warning: "border-amber-400/30",
  };

  return classes[tone];
}

function toneTextClass(tone: FinanceTone) {
  const classes: Record<FinanceTone, string> = {
    info: "text-sky-200",
    negative: "text-rose-300",
    neutral: "text-foreground",
    positive: "text-emerald-300",
    warning: "text-amber-300",
  };

  return classes[tone];
}

function toneBarClass(tone: FinanceTone) {
  const classes: Record<FinanceTone, string> = {
    info: "bg-sky-300",
    negative: "bg-rose-300",
    neutral: "bg-muted-foreground",
    positive: "bg-emerald-300",
    warning: "bg-amber-300",
  };

  return classes[tone];
}
