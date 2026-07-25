"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGameUiStore } from "@/features/game/store/game-ui-store";
import type { SupportedLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

import { managerCopy } from "../manager-copy";
import type { ManagerRecommendation } from "../types";

const severityClasses: Record<ManagerRecommendation["severity"], string> = {
  CRITICAL: "border-red-400/25 bg-red-500/10 text-red-100",
  INFO: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
  OPPORTUNITY: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
  WARNING: "border-amber-400/25 bg-amber-500/10 text-amber-100",
};

export function ManagerRecommendationsPanel({
  locale,
  recommendations,
}: {
  locale: SupportedLocale;
  recommendations: ManagerRecommendation[];
}) {
  const copy = managerCopy[locale];
  const { openPanel } = useGameUiStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const safeIndex =
    recommendations.length === 0
      ? 0
      : Math.min(currentIndex, recommendations.length - 1);
  const activeRecommendation = recommendations[safeIndex] ?? null;
  const hasMultipleRecommendations = recommendations.length > 1;

  function goToRecommendation(direction: -1 | 1) {
    if (!hasMultipleRecommendations) return;

    setCurrentIndex(
      (index) =>
        (index + direction + recommendations.length) % recommendations.length,
    );
  }

  function followRecommendation(recommendation: ManagerRecommendation) {
    if (!recommendation.cta) return;

    openPanel(recommendation.cta.panel, recommendation.cta.payload);
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-primary">
          <span className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10">
            <Lightbulb size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {copy.panel.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {copy.panel.subtitle}
            </p>
          </div>
        </div>
        <Badge
          className="shrink-0 border-primary/25 bg-primary/10 text-primary"
          variant="outline"
        >
          {copy.panel.noteCount(recommendations.length)}
        </Badge>
      </header>

      {hasMultipleRecommendations ? (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-2 py-1.5">
          <Button
            aria-label={copy.panel.previousAria}
            onClick={() => goToRecommendation(-1)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="text-xs font-semibold text-muted-foreground">
            {safeIndex + 1} / {recommendations.length}
          </span>
          <Button
            aria-label={copy.panel.nextAria}
            onClick={() => goToRecommendation(1)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      ) : null}

      {activeRecommendation ? (
        <ManagerRecommendationCard
          copy={copy}
          onCta={followRecommendation}
          positionLabel={
            hasMultipleRecommendations
              ? `${safeIndex + 1} / ${recommendations.length}`
              : copy.panel.singlePosition
          }
          recommendation={activeRecommendation}
        />
      ) : (
        <EmptyManagementState copy={copy.panel} />
      )}
    </div>
  );
}

function ManagerRecommendationCard({
  copy,
  onCta,
  positionLabel,
  recommendation,
}: {
  copy: (typeof managerCopy)[SupportedLocale];
  onCta: (recommendation: ManagerRecommendation) => void;
  positionLabel: string;
  recommendation: ManagerRecommendation;
}) {
  const cta = recommendation.cta;

  return (
    <Card
      className="border border-border bg-card shadow-[0_24px_70px_rgba(0,0,0,0.28)] transition-all duration-500 ease-out motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-3"
      size="sm"
    >
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary">
              <ShieldAlert size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {positionLabel} · {copy.labels.categories[recommendation.category]}
              </p>
              <CardTitle className="mt-1 line-clamp-2 text-base leading-5 text-foreground">
                {recommendation.title}
              </CardTitle>
            </div>
          </div>
          <Badge
            className={cn(
              "shrink-0 border text-[10px] uppercase tracking-[0.12em]",
              severityClasses[recommendation.severity],
            )}
            variant="outline"
          >
            {copy.labels.severities[recommendation.severity]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">
          {recommendation.body}
        </p>
      </CardContent>

      <CardFooter className="justify-center border-t border-border/70 pt-4">
        {cta ? (
          <Button
            onClick={() => onCta(recommendation)}
            type="button"
            variant="secondary"
          >
            {cta.label}
            <ArrowRight size={16} />
          </Button>
        ) : (
          <Button disabled type="button" variant="secondary">
            {copy.panel.followUp}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function EmptyManagementState({ copy }: { copy: (typeof managerCopy)[SupportedLocale]["panel"] }) {
  return (
    <Card className="border border-dashed border-border bg-card" size="sm">
      <CardContent className="grid min-h-[260px] place-items-center text-center">
        <div>
          <CheckCircle2 className="mx-auto text-emerald-300" size={30} />
          <h3 className="mt-3 font-semibold text-foreground">
            {copy.emptyTitle}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.emptyBody}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
