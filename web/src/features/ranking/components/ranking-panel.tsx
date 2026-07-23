"use client";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Factory,
  Medal,
  RefreshCw,
  Trophy,
  Zap,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGameUiStore } from "@/features/game/store/game-ui-store";
import { cn } from "@/lib/utils";

import {
  getFactoryVisitAction,
  getXpRankingAction,
} from "../actions/ranking-actions";
import type {
  FactoryVisitView,
  RankingFactorySummary,
  XpRankingEntry,
  XpRankingView,
} from "../types";
import { VisitorFactoryMap } from "./visitor-factory-map";

export function RankingPanel() {
  const { rankingVisit, setRankingVisit } = useGameUiStore();
  const [ranking, setRanking] = useState<XpRankingView | null>(null);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [factoryVisits, setFactoryVisits] = useState<
    Record<string, FactoryVisitView>
  >({});
  const [factoryVisitErrors, setFactoryVisitErrors] = useState<
    Record<string, string>
  >({});
  const requestedFactoriesRef = useRef(new Set<string>());
  const [isRankingPending, startRankingTransition] = useTransition();
  const [isFactoryVisitPending, startFactoryVisitTransition] = useTransition();

  const loadRankingPage = useCallback((page: number) => {
    setRankingError(null);
    startRankingTransition(async () => {
      const result = await getXpRankingAction(page);

      if (!result.ok) {
        setRankingError(result.message);
        return;
      }

      setRanking(result.ranking);
    });
  }, []);

  const loadFactoryVisit = useCallback((factoryId: string) => {
    if (requestedFactoriesRef.current.has(factoryId)) return;

    requestedFactoriesRef.current.add(factoryId);
    setFactoryVisitErrors((current) => {
      const next = { ...current };
      delete next[factoryId];
      return next;
    });
    startFactoryVisitTransition(async () => {
      const result = await getFactoryVisitAction(factoryId);

      requestedFactoriesRef.current.delete(factoryId);

      if (!result.ok) {
        setFactoryVisitErrors((current) => ({
          ...current,
          [factoryId]: result.message,
        }));
        return;
      }

      setFactoryVisits((current) => ({
        ...current,
        [factoryId]: result.factoryVisit,
      }));
    });
  }, []);

  useEffect(() => {
    let isCurrent = true;

    void getXpRankingAction(1).then((result) => {
      if (!isCurrent) return;

      if (!result.ok) {
        setRankingError(result.message);
        return;
      }

      setRanking(result.ranking);
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  const visibleEntries = ranking?.entries ?? [];
  const activeEntry = useMemo(() => {
    if (!rankingVisit || !ranking) return null;

    return (
      ranking.entries.find(
        (entry) =>
          entry.playerProfileId === rankingVisit.playerProfileId,
      ) ??
      (ranking.currentPlayerEntry?.playerProfileId ===
      rankingVisit.playerProfileId
        ? ranking.currentPlayerEntry
        : null)
    );
  }, [ranking, rankingVisit]);

  return (
    <div className="relative h-full min-h-0">
      <div
        aria-hidden={Boolean(rankingVisit)}
        className={cn(
          "flex h-full min-h-0 flex-col",
          rankingVisit && "invisible absolute inset-0 pointer-events-none",
        )}
      >
        <RankingListView
          isPending={isRankingPending}
          onLoadPage={loadRankingPage}
          onVisit={(entry, factory) => {
            loadFactoryVisit(factory.id);
            setRankingVisit({
              factoryId: factory.id,
              playerProfileId: entry.playerProfileId,
            });
          }}
          ranking={ranking}
          rankingError={rankingError}
          visibleEntries={visibleEntries}
        />
      </div>

      {rankingVisit ? (
        <FactoryVisitViewPanel
          activeEntry={activeEntry}
          factoryVisit={factoryVisits[rankingVisit.factoryId] ?? null}
          isPending={
            isFactoryVisitPending &&
            !factoryVisits[rankingVisit.factoryId]
          }
          onBack={() => setRankingVisit(null)}
          onRetry={() => loadFactoryVisit(rankingVisit.factoryId)}
          onSelectFactory={(factoryId) =>
            {
              loadFactoryVisit(factoryId);
              setRankingVisit({
                factoryId,
                playerProfileId: rankingVisit.playerProfileId,
              });
            }
          }
          selectedFactoryId={rankingVisit.factoryId}
          visitError={factoryVisitErrors[rankingVisit.factoryId] ?? null}
        />
      ) : null}
    </div>
  );
}

function RankingListView({
  isPending,
  onLoadPage,
  onVisit,
  ranking,
  rankingError,
  visibleEntries,
}: {
  isPending: boolean;
  onLoadPage: (page: number) => void;
  onVisit: (
    entry: XpRankingEntry,
    factory: RankingFactorySummary,
  ) => void;
  ranking: XpRankingView | null;
  rankingError: string | null;
  visibleEntries: XpRankingEntry[];
}) {
  return (
    <>
      <div className="flex shrink-0 flex-col gap-3 border-b border-white/10 pb-3 pr-10 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Trophy size={18} />
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">
              Player Ranking
            </p>
          </div>
          <h3 className="mt-1 text-2xl font-semibold text-white">
            Factory Runway liderleri
          </h3>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {ranking?.currentPlayerEntry ? (
            <CurrentPlayerRankCompact entry={ranking.currentPlayerEntry} />
          ) : null}
          <Badge variant="outline">
            {ranking ? formatNumber(ranking.totalPlayers) : "—"} oyuncu
          </Badge>
          <Badge className="gap-1" variant="secondary">
            <Zap size={12} />
            Total XP
          </Badge>
        </div>
      </div>

      {rankingError ? (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive-foreground">{rankingError}</p>
          <Button
            onClick={() => onLoadPage(ranking?.page ?? 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCw size={14} />
            Yeniden dene
          </Button>
        </div>
      ) : null}

      <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-lg border border-white/10 bg-card/35">
        {!ranking && !rankingError ? (
          <RankingLoadingState />
        ) : visibleEntries.length === 0 && !rankingError ? (
          <div className="grid h-full place-items-center p-8 text-center">
            <div>
              <Trophy className="mx-auto size-10 text-muted-foreground" />
              <h3 className="mt-3 font-semibold text-white">
                Ranking henüz oluşmadı
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Aktif fabrikası bulunan oyuncular burada listelenecek.
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                <TableRow>
                  <TableHead className="w-20">Sıra</TableHead>
                  <TableHead>Oyuncu</TableHead>
                  <TableHead>Vitrin Fabrikası</TableHead>
                  <TableHead className="text-center">Fabrikalar</TableHead>
                  <TableHead className="text-right">Total XP</TableHead>
                  <TableHead className="w-44 text-right">Ziyaret</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEntries.map((entry) => (
                  <RankingRow
                    entry={entry}
                    key={entry.playerProfileId}
                    onVisit={onVisit}
                  />
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 pt-3">
        <p className="text-xs text-muted-foreground">
          {ranking
            ? `${ranking.page}. sayfa / ${ranking.totalPages}`
            : "Ranking yükleniyor"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            disabled={!ranking || ranking.page <= 1 || isPending}
            onClick={() => onLoadPage(Math.max(1, (ranking?.page ?? 1) - 1))}
            size="sm"
            type="button"
            variant="outline"
          >
            <ChevronLeft size={14} />
            Önceki
          </Button>
          <Button
            disabled={
              !ranking ||
              ranking.page >= ranking.totalPages ||
              isPending
            }
            onClick={() => onLoadPage((ranking?.page ?? 1) + 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            Sonraki
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </>
  );
}

function RankingRow({
  entry,
  onVisit,
}: {
  entry: XpRankingEntry;
  onVisit: (
    entry: XpRankingEntry,
    factory: RankingFactorySummary,
  ) => void;
}) {
  const showcaseFactory = getShowcaseFactory(entry);

  return (
    <TableRow
      className={cn(
        entry.isCurrentPlayer &&
          "bg-primary/8 hover:bg-primary/12",
      )}
    >
      <TableCell>
        <RankPosition rank={entry.rankPosition} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-xs font-bold text-primary">
            {getInitials(entry.displayName)}
          </div>
          <div>
            <strong className="block max-w-48 truncate text-sm text-white">
              {entry.displayName}
            </strong>
            {entry.isCurrentPlayer ? (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                Sen
              </span>
            ) : null}
          </div>
        </div>
      </TableCell>
      <TableCell>
        {showcaseFactory ? (
          <div>
            <strong className="block max-w-56 truncate text-sm text-white">
              {showcaseFactory.name}
            </strong>
            <span className="text-xs text-muted-foreground">
              {showcaseFactory.sectorName} · Lv.
              {showcaseFactory.currentLevel} ·{" "}
              {showcaseFactory.productionLineCount} hat
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="outline">{entry.factories.length}</Badge>
      </TableCell>
      <TableCell className="text-right font-mono font-semibold tabular-nums text-amber-200">
        {formatXp(entry.totalXp)}
      </TableCell>
      <TableCell className="text-right">
        <Button
          disabled={!showcaseFactory}
          onClick={() => {
            if (showcaseFactory) {
              onVisit(entry, showcaseFactory);
            }
          }}
          size="sm"
          type="button"
          variant={entry.isCurrentPlayer ? "secondary" : "outline"}
        >
          <Eye size={14} />
          Fabrikayı ziyaret et
        </Button>
      </TableCell>
    </TableRow>
  );
}

function CurrentPlayerRankCompact({ entry }: { entry: XpRankingEntry }) {
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-lg border border-primary/30 bg-primary/8 px-2.5 py-1.5">
      <Medal className="size-3.5 text-primary" />
      <div>
        <p className="text-[8px] font-semibold uppercase leading-none tracking-[0.14em] text-primary">
          Senin sıran
        </p>
        <strong className="mt-1 block font-mono text-[11px] leading-none text-white">
          #{formatNumber(entry.rankPosition)} · {formatXp(entry.totalXp)}
        </strong>
      </div>
    </div>
  );
}

function RankPosition({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <span
        className={cn(
          "inline-flex min-w-9 items-center justify-center gap-1 rounded-full border px-2 py-1 font-mono text-xs font-bold",
          rank === 1 && "border-amber-300/35 bg-amber-300/10 text-amber-200",
          rank === 2 && "border-slate-200/25 bg-slate-200/8 text-slate-200",
          rank === 3 && "border-orange-400/25 bg-orange-400/8 text-orange-300",
        )}
      >
        <Trophy size={11} /> {rank}
      </span>
    );
  }

  return (
    <span className="font-mono text-xs font-semibold text-muted-foreground">
      #{formatNumber(rank)}
    </span>
  );
}

function FactoryVisitViewPanel({
  activeEntry,
  factoryVisit,
  isPending,
  onBack,
  onRetry,
  onSelectFactory,
  selectedFactoryId,
  visitError,
}: {
  activeEntry: XpRankingEntry | null;
  factoryVisit: FactoryVisitView | null;
  isPending: boolean;
  onBack: () => void;
  onRetry: () => void;
  onSelectFactory: (factoryId: string) => void;
  selectedFactoryId: string;
  visitError: string | null;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-col gap-3 border-b border-white/10 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pr-10">
          <Button
            onClick={onBack}
            size="sm"
            type="button"
            variant="outline"
          >
            <ArrowLeft size={14} />
            Ranking’e dön
          </Button>

          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {activeEntry
                ? `#${formatNumber(activeEntry.rankPosition)}`
                : "Ranking"}
            </Badge>
            <Badge className="gap-1" variant="secondary">
              <Zap size={12} />
              {activeEntry ? formatXp(activeEntry.totalXp) : "— XP"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Oyuncu Fabrikaları
            </p>
            <h3 className="truncate text-xl font-semibold text-white">
              {activeEntry?.displayName ??
                factoryVisit?.player.displayName ??
                "Fabrika ziyareti"}
            </h3>
          </div>

          {activeEntry && activeEntry.factories.length > 0 ? (
            <Tabs
              className="max-w-full"
              onValueChange={onSelectFactory}
              value={selectedFactoryId}
            >
              <TabsList className="max-w-full justify-start overflow-x-auto">
                {activeEntry.factories.map((factory) => (
                  <TabsTrigger key={factory.id} value={factory.id}>
                    <Factory size={13} />
                    {factory.sectorName}
                    <span className="text-[10px] opacity-70">
                      Lv.{factory.currentLevel}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : null}
        </div>
      </div>

      {visitError ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-center">
            <p className="text-sm text-destructive-foreground">{visitError}</p>
            <Button
              className="mt-4"
              onClick={onRetry}
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCw size={14} />
              Yeniden dene
            </Button>
          </div>
        </div>
      ) : isPending || !factoryVisit ? (
        <FactoryVisitLoadingState />
      ) : (
        <>
          <div className="grid shrink-0 grid-cols-2 gap-2 py-3 lg:grid-cols-5">
            <VisitMetric
              label="Fabrika"
              value={factoryVisit.factory.name}
            />
            <VisitMetric
              label="Sektör"
              value={factoryVisit.factory.sectorName}
            />
            <VisitMetric
              label="Seviye"
              value={`Lv. ${factoryVisit.factory.currentLevel}`}
            />
            <VisitMetric
              label="İşletme Aşaması"
              value={factoryVisit.factory.operatingStageName}
            />
            <VisitMetric
              label="Üretim Hatları"
              value={`${factoryVisit.factory.productionLineCount} hat`}
            />
          </div>
          <div className="min-h-0 flex-1">
            <VisitorFactoryMap
              factoryVisit={factoryVisit}
              key={factoryVisit.factory.id}
            />
          </div>
        </>
      )}
    </div>
  );
}

function VisitMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-card/45 px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <strong className="mt-0.5 block truncate text-xs text-white">
        {value}
      </strong>
    </div>
  );
}

function RankingLoadingState() {
  return (
    <div className="space-y-2 p-4" aria-label="Ranking yükleniyor">
      {Array.from({ length: 8 }, (_, index) => (
        <div
          className="h-12 animate-pulse rounded-lg bg-white/5"
          key={index}
        />
      ))}
    </div>
  );
}

function FactoryVisitLoadingState() {
  return (
    <div
      aria-label="Fabrika görünümü yükleniyor"
      className="mt-3 min-h-0 flex-1 animate-pulse rounded-lg border border-white/10 bg-white/5"
    />
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR"))
    .join("");
}

function getShowcaseFactory(entry: XpRankingEntry) {
  return (
    entry.factories
      .slice()
      .sort(
        (first, second) =>
          second.currentXp - first.currentXp ||
          first.sectorSortOrder - second.sectorSortOrder,
      )[0] ?? null
  );
}

function formatXp(value: string) {
  return `${new Intl.NumberFormat("tr-TR").format(BigInt(value))} XP`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}
