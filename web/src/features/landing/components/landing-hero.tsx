import { ArrowDown, ClipboardCheck, Factory, Gauge } from "lucide-react";

import type { LandingContent } from "../content/types";

type LandingHeroProps = {
  content: LandingContent;
};

const flowIcons = [ClipboardCheck, Factory, Gauge] as const;

export function LandingHero({ content }: LandingHeroProps) {
  return (
    <section className="relative grid min-h-[min(48rem,calc(100vh-5rem))] items-center gap-10 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:py-24">
      <div className="relative z-10 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary-readable">
          {content.hero.eyebrow}
        </p>
        <h1 className="mt-5 text-4xl font-bold leading-[1.04] text-white sm:text-6xl lg:text-7xl">
          {content.hero.title}
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
          {content.hero.description}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a className="game-button-primary w-full sm:w-auto" href="#account">
            {content.hero.primaryCta}
          </a>
          <a className="game-button-ghost w-full sm:w-auto" href="#gameplay">
            {content.hero.secondaryCta}
            <ArrowDown aria-hidden="true" size={17} />
          </a>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="relative isolate mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-card/85 p-4 shadow-2xl sm:p-6"
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,color-mix(in_srgb,var(--primary)_20%,transparent),transparent_32%),linear-gradient(145deg,rgba(255,255,255,0.05),transparent_48%)]" />
        <div className="flex items-center justify-between border-b border-border pb-4">
          <span className="text-xs font-bold tracking-[0.2em] text-primary-readable">
            {content.hero.eyebrow}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_16px_var(--primary)]" />
          </span>
        </div>
        <div className="mt-5 grid gap-3">
          {content.gameLoop.steps.slice(0, 3).map((step, index) => {
            const Icon = flowIcons[index];

            return (
              <div
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-secondary/55 p-4"
                key={step.key}
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary-readable">
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-white">
                    {step.title}
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                    {step.description}
                  </span>
                </span>
                <span className="font-mono text-xs font-semibold text-primary-readable">
                  {step.number}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-3/4 rounded-full bg-primary" />
        </div>
      </div>
    </section>
  );
}
