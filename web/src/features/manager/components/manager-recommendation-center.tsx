"use client";

import { ArrowRight, Lightbulb, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGameUiStore } from "@/features/game/store/game-ui-store";
import { cn } from "@/lib/utils";

import type { ManagerRecommendation } from "../types";

const severityClasses: Record<ManagerRecommendation["severity"], string> = {
  CRITICAL: "border-red-400/25 bg-red-500/10 text-red-100",
  INFO: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
  OPPORTUNITY: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
  WARNING: "border-amber-400/25 bg-amber-500/10 text-amber-100",
};

export function ManagerRecommendationCenter({
  recommendations,
}: {
  recommendations: ManagerRecommendation[];
}) {
  const { activePanel, isShiftPlaybackActive, openPanel } = useGameUiStore();
  const recommendation = recommendations[0] ?? null;
  const cta = recommendation?.cta ?? null;
  const secondaryRecommendations = recommendations.slice(1, 3);

  if (!recommendation || activePanel || isShiftPlaybackActive) return null;

  function openRecommendation(item: ManagerRecommendation) {
    if (!item.cta) return;

    openPanel(item.cta.panel, item.cta.payload);
  }

  return (
    <aside className="pointer-events-none absolute left-[6.75rem] top-[7.35rem] z-20 hidden w-[21rem] xl:block">
      <Card
        className="pointer-events-auto border border-border/80 bg-card/95 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl transition-all duration-500 ease-out motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-2"
        size="sm"
      >
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-100">
                <Lightbulb size={17} />
              </span>
              <div className="min-w-0">
                <Badge
                  className={cn(
                    "border text-[10px] uppercase tracking-[0.14em]",
                    severityClasses[recommendation.severity],
                  )}
                  variant="outline"
                >
                  Müdür Notu
                </Badge>
                <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-5 text-foreground">
                  {recommendation.title}
                </h3>
              </div>
            </div>
            <TrendingUp className="mt-1 shrink-0 text-emerald-200/80" size={18} />
          </div>

          <p className="text-sm leading-6 text-muted-foreground">
            {recommendation.body}
          </p>

          {cta ? (
            <Button
              className="mt-1"
              onClick={() => openPanel(cta.panel, cta.payload)}
              size="sm"
              type="button"
              variant="secondary"
            >
              {cta.label}
              <ArrowRight size={15} />
            </Button>
          ) : null}

          {secondaryRecommendations.length > 0 ? (
            <div className="space-y-2 border-t border-border/70 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Yardımcı notlar
              </p>
              {secondaryRecommendations.map((item) => (
                <button
                  className="group flex w-full items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background/35 p-2.5 text-left transition-colors hover:border-primary/35 hover:bg-primary/5"
                  key={item.id}
                  onClick={() => openRecommendation(item)}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="line-clamp-1 text-xs font-semibold text-foreground">
                      {item.title}
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                      {item.body}
                    </span>
                  </span>
                  {item.cta ? (
                    <ArrowRight
                      className="mt-0.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                      size={14}
                    />
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </aside>
  );
}
