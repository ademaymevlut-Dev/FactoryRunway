"use client";

import { motion, useReducedMotion } from "motion/react";
import { ChartNoAxesCombined, ClipboardCheck, Factory, Gauge } from "lucide-react";
import { useState } from "react";

import BlurText from "@/components/effects/blur-text";
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
  const [animationStage, setAnimationStage] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const visibleStage = shouldReduceMotion ? 4 : animationStage;

  return (
    <section
      className="scroll-mt-52 py-12 sm:scroll-mt-40 sm:py-16 lg:scroll-mt-24"
      id="gameplay"
    >
      <div className="max-w-3xl">
        <BlurText
          className="text-xs font-semibold uppercase tracking-[0.26em] text-primary-readable"
          delay={95}
          direction="bottom"
          onAnimationComplete={() =>
            setAnimationStage((current) => Math.max(current, 1))
          }
          text={content.gameLoop.eyebrow}
        />
        <BlurText
          as="h2"
          className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-5xl"
          delay={120}
          onAnimationComplete={() =>
            setAnimationStage((current) => Math.max(current, 2))
          }
          play={visibleStage >= 1}
          text={content.gameLoop.title}
        />
        <BlurText
          className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base"
          delay={40}
          onAnimationComplete={() =>
            setAnimationStage((current) => Math.max(current, 3))
          }
          play={visibleStage >= 2}
          text={content.gameLoop.description}
        />
      </div>

      <ol className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {content.gameLoop.steps.map((step, index) => {
          const Icon = stepIcons[step.key];

          return (
            <motion.li
              animate={
                visibleStage >= 3
                  ? { opacity: 1, x: 0 }
                  : { opacity: 0, x: -28 }
              }
              className="game-card relative min-h-56 overflow-hidden p-5"
              initial={{ opacity: 0, x: -28 }}
              key={step.key}
              transition={{
                delay: shouldReduceMotion ? 0 : index * 0.14,
                duration: shouldReduceMotion ? 0 : 0.62,
                ease: "easeOut",
              }}
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
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}
