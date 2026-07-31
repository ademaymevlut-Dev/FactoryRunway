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
import { financeCopy } from "@/features/finance/finance-copy";
import { FinanceCashCalendar } from "@/features/finance/components/finance-cash-calendar";
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
import { numberLocale, type SupportedLocale } from "@/lib/i18n/locales";

type FinancePanelProps = {
  cashBalanceCents: string;
  currencyCode: CurrencyCode;
  currentDay: number;
  factoryId: string;
  locale: SupportedLocale;
};

const reportTabs: Array<{
  icon: LucideIcon;
  value: FinanceReportTab;
}> = [
  { icon: Landmark, value: "overview" },
  { icon: TrendingUp, value: "profit" },
  { icon: WalletCards, value: "cash" },
  { icon: Factory, value: "investment" },
  { icon: BarChart3, value: "expenses" },
];

export function FinancePanel({
  cashBalanceCents,
  currencyCode,
  currentDay,
  factoryId,
  locale,
}: FinancePanelProps) {
  const copy = financeCopy[locale];
  const [activeTab, setActiveTab] = useState<FinanceReportTab>("overview");
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number | null>(null);
  const [reports, setReports] = useState<Record<string, FinanceReport>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeReport = reports[getReportKey(activeTab, selectedPeriodIndex, locale)];

  const loadReport = useCallback((tab: FinanceReportTab, periodIndex: number | null) => {
    startTransition(async () => {
      const result = await getFinanceReportAction({
        factoryId,
        locale,
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
          locale,
        )]: result.report,
      }));

      if (result.report.tab !== "investment") {
        setSelectedPeriodIndex(result.report.period.periodIndex);
      }
    });
  }, [factoryId, locale]);
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

    if (!reports[getReportKey(activeTab, nextPeriodIndex, locale)]) {
      loadReport(activeTab, nextPeriodIndex);
    }
  }, [activeReport, activeTab, loadReport, locale, reports]);

  useEffect(() => {
    if (reports[getReportKey(activeTab, selectedPeriodIndex, locale)]) return;

    loadReport(activeTab, selectedPeriodIndex);
  }, [activeTab, loadReport, locale, reports, selectedPeriodIndex]);

  const headerReport =
    activeReport ?? reports[getReportKey("overview", selectedPeriodIndex, locale)];
  const periodLabel = headerReport
    ? headerReport.tab === "investment"
      ? copy.header.sinceFounding
      : formatPeriodTitle(headerReport.period, locale)
    : copy.header.day(currentDay);
  const headerPeriod =
    headerReport?.tab === "investment" ? null : headerReport?.period ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <section className="shrink-0 overflow-hidden rounded-lg border border-border bg-card/70">
        <div className="grid gap-2 p-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              {copy.header.controlTitle}
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-foreground">
              {copy.header.factoryPerformance}
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline">{periodLabel}</Badge>
              <Badge variant="secondary">
                {headerPeriod
                  ? copy.header.range(headerPeriod.startDay, headerPeriod.endDay)
                  : headerReport?.tab === "investment"
                    ? copy.header.allPeriods
                  : copy.header.day(currentDay)}
              </Badge>
            </div>
          </div>
          <div className="grid min-w-[190px] content-center rounded-lg border border-primary/20 bg-primary/10 p-2.5">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              <Banknote size={14} />
              {copy.header.cash}
            </span>
            <strong className="mt-1 truncate font-mono text-lg text-foreground">
              {formatMoney(
                headerReport?.cashBalanceCents ?? cashBalanceCents,
                headerReport?.currencyCode ?? currencyCode,
                locale,
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
                {copy.tabs[tab.value]}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
      {activeTab !== "investment" ? (
        <PeriodNavigator
          disabled={isPending && !activeReport}
          locale={locale}
          onNext={() => handlePeriodChange(1)}
          onPrevious={() => handlePeriodChange(-1)}
          period={activeReport?.tab === "investment" ? null : activeReport?.period ?? null}
        />
      ) : (
        <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-border bg-card/70 px-3 py-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {copy.header.sinceFounding}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {copy.investment.obligationsCaption}
            </p>
          </div>
          <Badge variant="outline">{copy.header.allPeriods}</Badge>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {!activeReport && isPending ? (
          <FinanceLoadingState locale={locale} />
        ) : error ? (
          <FinanceErrorState locale={locale} onRetry={handleRetry} />
        ) : activeReport ? (
          <ReportContent locale={locale} report={activeReport} />
        ) : (
          <FinanceLoadingState locale={locale} />
        )}
      </div>
    </div>
  );
}

function ReportContent({ locale, report }: { locale: SupportedLocale; report: FinanceReport }) {
  if (report.tab === "overview") return <OverviewReport locale={locale} report={report} />;
  if (report.tab === "profit") return <ProfitReport locale={locale} report={report} />;
  if (report.tab === "cash") return <CashReport locale={locale} report={report} />;
  if (report.tab === "investment") return <InvestmentReport locale={locale} report={report} />;

  return <ExpensesReport locale={locale} report={report} />;
}

function PeriodNavigator({
  disabled,
  onNext,
  onPrevious,
  period,
  locale,
}: {
  disabled: boolean;
  onNext: () => void;
  onPrevious: () => void;
  period: FinancePeriodView | null;
  locale: SupportedLocale;
}) {
  const copy = financeCopy[locale];
  const previousDisabled = disabled || !period || period.periodIndex <= 1;
  const nextDisabled =
    disabled || !period || period.periodIndex >= period.maxPeriodIndex;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-border bg-card/70 px-3 py-2">
      <Button
        aria-label={copy.period.previous}
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
          {period
            ? getMonthName(period.monthInYear, locale)
            : copy.period.loadingTitle}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {period
            ? copy.period.yearPeriod(
                period.yearIndex,
                period.startDay,
                period.endDay,
              )
            : copy.period.loadingBody}
        </p>
      </div>
      <Button
        aria-label={copy.period.next}
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

function OverviewReport({ locale, report }: { locale: SupportedLocale; report: FinanceOverviewReport }) {
  const copy = financeCopy[locale];

  return (
    <div className="space-y-3">
      <MetricGrid
        locale={locale}
        metrics={report.cards}
        currencyCode={report.currencyCode}
      />
      <FinanceCashCalendar
        calendar={report.cashCalendar}
        currencyCode={report.currencyCode}
        locale={locale}
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PanelBlock title={copy.overview.pendingMovements}>
          <div className="grid grid-cols-2 gap-2">
            <SmallMoney
              label={copy.overview.next7Receivable}
              value={report.dueSummary.next7ReceivableCents}
              currencyCode={report.currencyCode}
              locale={locale}
              tone="positive"
            />
            <SmallMoney
              label={copy.overview.next7Payable}
              value={report.dueSummary.next7PayableCents}
              currencyCode={report.currencyCode}
              locale={locale}
              tone="warning"
            />
            <SmallMoney
              label={copy.overview.overdueReceivable}
              value={report.dueSummary.overdueReceivableCents}
              currencyCode={report.currencyCode}
              locale={locale}
              tone="warning"
            />
            <SmallMoney
              label={copy.overview.overduePayable}
              value={report.dueSummary.overduePayableCents}
              currencyCode={report.currencyCode}
              locale={locale}
              tone="negative"
            />
          </div>
        </PanelBlock>
        <PanelBlock title={copy.overview.largestExpense}>
          {report.topExpense ? (
            <BreakdownRow
              currencyCode={report.currencyCode}
              locale={locale}
              item={report.topExpense}
            />
          ) : (
            <EmptyLine text={copy.overview.noExpense} />
          )}
        </PanelBlock>
      </div>
      <PanelBlock title={copy.overview.latestTransactions}>
        <TransactionList
          currencyCode={report.currencyCode}
          emptyText={copy.overview.noTransactions}
          locale={locale}
          transactions={report.latestTransactions}
        />
      </PanelBlock>
    </div>
  );
}

function ProfitReport({ locale, report }: { locale: SupportedLocale; report: FinanceProfitReport }) {
  const copy = financeCopy[locale];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          amountCents={report.completedProductionValueCents}
          caption={copy.profit.finalProduction(
            formatInteger(report.completedQuantity, locale),
          )}
          currencyCode={report.currencyCode}
          label={copy.profit.productionValue}
          locale={locale}
          tone="positive"
        />
        <MetricCard
          amountCents={report.operationalProfitCents}
          caption={copy.profit.operationalMargin(
            formatBps(report.operationalMarginBps, locale),
          )}
          currencyCode={report.currencyCode}
          label={copy.profit.operatingProfit}
          locale={locale}
          tone={moneyTone(report.operationalProfitCents)}
        />
        <MetricCard
          amountCents={report.shippedRevenueCents}
          caption={copy.profit.shippedThisMonth}
          currencyCode={report.currencyCode}
          label={copy.profit.shippedRevenue}
          locale={locale}
          tone="info"
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <PanelBlock title={copy.profit.finalProductionValue}>
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
                      {item.orderNo} · {copy.cash.day(item.day)} · {formatInteger(item.quantity, locale)} {copy.profit.units}
                    </p>
                  </div>
                  <strong className="font-mono text-sm text-foreground">
                    {formatMoney(item.amountCents, report.currencyCode, locale)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyLine text={copy.profit.noFinalProduction} />
          )}
        </PanelBlock>
        <PanelBlock title={copy.profit.operationalExpense}>
          <div className="mb-3 rounded-lg border border-border bg-background/45 p-3">
            <p className="text-xs text-muted-foreground">{copy.profit.totalPeriodExpense}</p>
            <strong className="mt-1 block font-mono text-xl text-foreground">
              {formatMoney(report.operationalExpenseCents, report.currencyCode, locale)}
            </strong>
          </div>
          <BreakdownList
            currencyCode={report.currencyCode}
            locale={locale}
            items={report.expenseBreakdown}
          />
        </PanelBlock>
      </div>
    </div>
  );
}

function CashReport({ locale, report }: { locale: SupportedLocale; report: FinanceCashReport }) {
  const copy = financeCopy[locale];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          amountCents={report.incomeCents}
          caption={copy.cash.cashIn}
          currencyCode={report.currencyCode}
          label={copy.cash.income}
          locale={locale}
          tone="positive"
        />
        <MetricCard
          amountCents={report.expenseCents}
          caption={copy.cash.cashOut}
          currencyCode={report.currencyCode}
          label={copy.cash.expense}
          locale={locale}
          tone="warning"
        />
        <MetricCard
          amountCents={report.netCashCents}
          caption={copy.cash.incomeMinusExpense}
          currencyCode={report.currencyCode}
          label={copy.cash.netCash}
          locale={locale}
          tone={moneyTone(report.netCashCents)}
        />
      </div>
      <FinanceCashCalendar
        calendar={report.cashCalendar}
        currencyCode={report.currencyCode}
        locale={locale}
      />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PanelBlock title={copy.cash.dailyCashLine}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
            {report.dailyNet.map((day) => (
              <div
                className="rounded-lg border border-border bg-background/45 p-2"
                key={day.day}
              >
                <p className="text-[11px] font-medium text-muted-foreground">
                  {copy.cash.day(day.day)}
                </p>
                <p className={cn("mt-1 truncate font-mono text-xs", toneTextClass(moneyTone(day.netCents)))}>
                  {formatSignedMoney(day.netCents, report.currencyCode, locale)}
                </p>
              </div>
            ))}
          </div>
        </PanelBlock>
        <PanelBlock title={copy.cash.openDues}>
          <DueList
            currencyCode={report.currencyCode}
            locale={locale}
            dues={report.openDues}
          />
        </PanelBlock>
      </div>
      <PanelBlock title={copy.cash.cashMovements}>
        <TransactionList
          currencyCode={report.currencyCode}
          emptyText={copy.cash.noPeriodMovements}
          locale={locale}
          transactions={report.transactions}
        />
      </PanelBlock>
    </div>
  );
}

function InvestmentReport({ locale, report }: { locale: SupportedLocale; report: FinanceInvestmentReport }) {
  const copy = financeCopy[locale];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          amountCents={report.totalInvestedCashCents}
          caption={copy.investment.investedCashCaption}
          currencyCode={report.currencyCode}
          label={copy.investment.investedCash}
          locale={locale}
          tone="warning"
        />
        <MetricCard
          amountCents={report.machinePurchaseCents}
          caption={copy.investment.machineCaption}
          currencyCode={report.currencyCode}
          label={copy.investment.machine}
          locale={locale}
          tone="info"
        />
        <MetricCard
          amountCents={report.leasingPaidCents}
          caption={copy.investment.leasingPaidCaption}
          currencyCode={report.currencyCode}
          label={copy.investment.leasingPaid}
          locale={locale}
          tone="neutral"
        />
        <MetricCard
          amountCents={report.activeLeasingObligationCents}
          caption={copy.investment.leasingDebtCaption}
          currencyCode={report.currencyCode}
          label={copy.investment.leasingDebt}
          locale={locale}
          tone="negative"
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
        <PanelBlock title={copy.investment.obligations}>
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
                        {copy.investment.installmentsLeft(contract.remainingInstallments)}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {contract.status === "PENDING_ACTIVATION"
                        ? copy.investment.pendingActivation
                        : contract.nextDueDay
                          ? copy.investment.dueDay(contract.nextDueDay)
                          : copy.investment.calendarPending}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <SmallMoney
                      currencyCode={report.currencyCode}
                      label={copy.investment.installment}
                      tone="neutral"
                      locale={locale}
                      value={contract.monthlyPaymentCents}
                    />
                    <SmallMoney
                      currencyCode={report.currencyCode}
                      label={copy.investment.remaining}
                      tone="negative"
                      locale={locale}
                      value={contract.remainingAmountCents}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyLine text={copy.investment.noContracts} />
          )}
        </PanelBlock>
        <PanelBlock title={copy.investment.investmentMovements}>
          <TransactionList
            currencyCode={report.currencyCode}
            emptyText={copy.investment.noInvestmentMovements}
            locale={locale}
            transactions={report.investmentTransactions}
          />
        </PanelBlock>
      </div>
    </div>
  );
}

function ExpensesReport({ locale, report }: { locale: SupportedLocale; report: FinanceExpensesReport }) {
  const copy = financeCopy[locale];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          amountCents={report.totalExpenseCents}
          caption={copy.expenses.totalExpenseCaption}
          currencyCode={report.currencyCode}
          label={copy.expenses.totalExpense}
          locale={locale}
          tone="warning"
        />
        <MetricCard
          amountCents={report.operatingExpenseCents}
          caption={copy.expenses.operationCaption}
          currencyCode={report.currencyCode}
          label={copy.expenses.operation}
          locale={locale}
          tone="neutral"
        />
        <MetricCard
          amountCents={report.investmentExpenseCents}
          caption={copy.expenses.investmentCaption}
          currencyCode={report.currencyCode}
          label={copy.expenses.investment}
          locale={locale}
          tone="info"
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <PanelBlock title={copy.expenses.breakdown}>
          <BreakdownList
            currencyCode={report.currencyCode}
            locale={locale}
            items={report.breakdown}
          />
        </PanelBlock>
        <PanelBlock title={copy.expenses.recentExpenses}>
          <TransactionList
            currencyCode={report.currencyCode}
            emptyText={copy.expenses.noExpenses}
            locale={locale}
            transactions={report.recentExpenses}
          />
        </PanelBlock>
      </div>
    </div>
  );
}

function MetricGrid({
  currencyCode,
  locale,
  metrics,
}: {
  currencyCode: CurrencyCode;
  locale: SupportedLocale;
  metrics: FinanceOverviewReport["cards"];
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard
          amountCents={metric.amountCents}
          caption={metric.caption}
          currencyCode={currencyCode}
          locale={locale}
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
  locale,
  tone,
  value,
}: {
  amountCents?: string;
  caption: string;
  currencyCode: CurrencyCode;
  label: string;
  locale: SupportedLocale;
  tone: FinanceTone;
  value?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-card/70 p-2.5", toneBorderClass(tone))}>
      <p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
      <strong className={cn("mt-1 block truncate font-mono text-base", toneTextClass(tone))}>
        {amountCents ? formatMoney(amountCents, currencyCode, locale) : value}
      </strong>
      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{caption}</p>
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
    <section className="rounded-lg border border-border bg-card/70 p-2.5">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function BreakdownList({
  currencyCode,
  locale,
  items,
}: {
  currencyCode: CurrencyCode;
  locale: SupportedLocale;
  items: FinanceCategoryBreakdown[];
}) {
  if (items.length === 0) {
    return <EmptyLine text={financeCopy[locale].expenses.noBreakdown} />;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <BreakdownRow
          currencyCode={currencyCode}
          locale={locale}
          item={item}
          key={item.category}
        />
      ))}
    </div>
  );
}

function BreakdownRow({
  currencyCode,
  locale,
  item,
}: {
  currencyCode: CurrencyCode;
  locale: SupportedLocale;
  item: FinanceCategoryBreakdown;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/45 p-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
        <strong className="shrink-0 font-mono text-sm text-foreground">
          {formatMoney(item.amountCents, currencyCode, locale)}
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
  locale,
  transactions,
}: {
  currencyCode: CurrencyCode;
  emptyText: string;
  locale: SupportedLocale;
  transactions: FinanceTransactionItem[];
}) {
  const copy = financeCopy[locale];

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
              {transaction.description} · {copy.cash.day(transaction.gameDay)}
            </p>
          </div>
          <strong className={cn("font-mono text-sm", transaction.direction === "INCOME" ? "text-emerald-300" : "text-amber-300")}>
            {transaction.direction === "INCOME" ? "+" : "-"}
            {formatMoney(transaction.amountCents, currencyCode, locale)}
          </strong>
        </div>
      ))}
    </div>
  );
}

function DueList({
  currencyCode,
  dues,
  locale,
}: {
  currencyCode: CurrencyCode;
  dues: FinanceDueItem[];
  locale: SupportedLocale;
}) {
  if (dues.length === 0) {
    return <EmptyLine text={financeCopy[locale].cash.noNearDues} />;
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
                {financeCopy[locale].cash.day(due.dueDay)}
              </Badge>
            </div>
            <p className={cn("mt-2 font-mono text-sm", due.direction === "INCOME" ? "text-emerald-300" : "text-amber-300")}>
              {due.direction === "INCOME" ? "+" : "-"}
              {formatMoney(remainingCents.toString(), currencyCode, locale)}
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
  locale,
  tone,
  value,
}: {
  currencyCode: CurrencyCode;
  label: string;
  locale: SupportedLocale;
  tone: FinanceTone;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-background/45 p-2">
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate font-mono text-sm", toneTextClass(tone))}>
        {formatMoney(value, currencyCode, locale)}
      </p>
    </div>
  );
}

function FinanceLoadingState({ locale }: { locale: SupportedLocale }) {
  const copy = financeCopy[locale];

  return (
    <div className="grid min-h-[360px] place-items-center rounded-lg border border-border bg-card/60">
      <div className="text-center">
        <Loader2 className="mx-auto animate-spin text-primary" size={28} />
        <p className="mt-3 text-sm text-muted-foreground">{copy.errors.loading}</p>
      </div>
    </div>
  );
}

function FinanceErrorState({ locale, onRetry }: { locale: SupportedLocale; onRetry: () => void }) {
  const copy = financeCopy[locale];

  return (
    <div className="grid min-h-[360px] place-items-center rounded-lg border border-border bg-card/60 p-8 text-center">
      <div>
        <Clock3 className="mx-auto text-amber-300" size={30} />
        <h3 className="mt-3 text-lg font-semibold text-foreground">
          {copy.errors.reportError}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {copy.errors.reportErrorBody}
        </p>
        <Button className="mt-4" onClick={onRetry} size="sm" type="button" variant="outline">
          <RefreshCcw size={14} />
          {copy.errors.retry}
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

function formatMoney(
  valueCents: bigint | number | string,
  currencyCode: CurrencyCode,
  locale: SupportedLocale,
) {
  return new Intl.NumberFormat(numberLocale(locale), {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(BigInt(valueCents)) / 100);
}

function formatSignedMoney(
  valueCents: string,
  currencyCode: CurrencyCode,
  locale: SupportedLocale,
) {
  const value = BigInt(valueCents);
  const prefix = value > BigInt(0) ? "+" : "";

  return `${prefix}${formatMoney(value, currencyCode, locale)}`;
}

function formatInteger(value: number, locale: SupportedLocale) {
  return new Intl.NumberFormat(numberLocale(locale)).format(value);
}

function formatBps(value: number, locale: SupportedLocale) {
  return `${new Intl.NumberFormat(numberLocale(locale), {
    maximumFractionDigits: 1,
  }).format(value / 100)}%`;
}

function getMonthName(monthInYear: number, locale: SupportedLocale) {
  const names = financeCopy[locale].period.monthNames;

  return names[Math.max(0, Math.min(11, monthInYear - 1))] ?? names[0];
}

function formatPeriodTitle(period: FinancePeriodView, locale: SupportedLocale) {
  return financeCopy[locale].period.title(
    period.yearIndex,
    getMonthName(period.monthInYear, locale),
  );
}

function getReportKey(
  tab: FinanceReportTab,
  periodIndex: number | null,
  locale: SupportedLocale,
) {
  if (tab === "investment") return `${locale}:investment:all`;

  return `${locale}:${tab}:${periodIndex ?? "current"}`;
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
