import { ChartNoAxesCombined, ClipboardCheck, Factory, Gauge } from "lucide-react";

import type { GameLoopStepKey, LandingContent } from "../content/types";

type LandingGameLoopProps = {
  content: LandingContent;
};

const stepIcons: Record<GameLoopStepKey, typeof Factory> = {
  orders: ClipboardCheck,
  planning: Factory,
  results: ChartNoAxesCombined,
  shift: Gauge,
};

export function LandingGameLoop({ content }: LandingGameLoopProps) {
  return (
    <section className="scroll-mt-52 py-14 sm:scroll-mt-40 sm:py-20 lg:scroll-mt-24" id="gameplay">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary-readable">
          {content.gameLoop.eyebrow}
        </p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-5xl">
          {content.gameLoop.title}
        </h2>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          {content.gameLoop.description}
        </p>
      </div>

      <ol className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {content.gameLoop.steps.map((step) => {
          const Icon = stepIcons[step.key];

          return (
            <li
              className="game-card relative min-h-56 overflow-hidden p-5"
              key={step.key}
            >
              <span className="absolute right-4 top-3 font-mono text-4xl font-black text-white/[0.055]">
                {step.number}
              </span>
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary-readable">
                <Icon aria-hidden="true" size={20} />
              </span>
              <p className="mt-8 font-mono text-xs font-bold text-primary-readable">
                {step.number}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {step.description}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
