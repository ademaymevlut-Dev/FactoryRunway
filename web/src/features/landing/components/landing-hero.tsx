"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ClipboardCheck, Factory, Gauge } from "lucide-react";
import { useState } from "react";

import BlurText from "@/components/effects/blur-text";

import type { LandingContent } from "../content/types";

type LandingHeroProps = {
  content: LandingContent;
};

const flowIcons = [ClipboardCheck, Factory, Gauge] as const;

export function LandingHero({ content }: LandingHeroProps) {
  const [animationStage, setAnimationStage] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const visibleStage = shouldReduceMotion ? 4 : animationStage;
  const fadeTransition = {
    duration: shouldReduceMotion ? 0 : 0.7,
    ease: "easeOut" as const,
  };

  return (
    <section className="relative grid min-h-[min(48rem,calc(100vh-5rem))] items-center gap-10 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:py-24">
      <div className="relative z-10 max-w-3xl">
        <BlurText
          text={content.hero.eyebrow}
          className="text-xs font-semibold uppercase tracking-[0.28em] text-primary-readable"
          delay={110}
          direction="bottom"
          onAnimationComplete={() =>
            setAnimationStage((current) => Math.max(current, 1))
          }
        />
        <BlurText
          as="h1"
          text={content.hero.title}
          className="mt-5 text-4xl font-bold leading-[1.04] text-white sm:text-6xl lg:text-7xl"
          delay={140}
          play={visibleStage >= 1}
          onAnimationComplete={() =>
            setAnimationStage((current) => Math.max(current, 2))
          }
        />
        <BlurText
          text={content.hero.description}
          className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg"
          delay={45}
          play={visibleStage >= 2}
          onAnimationComplete={() =>
            setAnimationStage((current) => Math.max(current, 3))
          }
        />
        <motion.div
          animate={
            visibleStage >= 4
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 12 }
          }
          aria-hidden={visibleStage < 4}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
          initial={{ opacity: 0, y: 12 }}
          transition={fadeTransition}
        >
          <a
            className="game-button-primary w-full sm:w-auto"
            href="#account"
            tabIndex={visibleStage >= 4 ? 0 : -1}
          >
            {content.hero.primaryCta}
          </a>
          <a
            className="game-button-ghost landing-hero-play-cta w-full sm:w-auto"
            href="#gameplay"
            tabIndex={visibleStage >= 4 ? 0 : -1}
          >
            {content.hero.secondaryCta}
            <ArrowDown aria-hidden="true" size={17} />
          </a>
        </motion.div>
      </div>

      <motion.div
        aria-hidden="true"
        animate={
          visibleStage >= 3
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 12 }
        }
        className="relative isolate mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-card/85 p-4 shadow-2xl sm:p-6"
        initial={{ opacity: 0, y: 12 }}
        onAnimationComplete={() => {
          if (visibleStage >= 3) {
            setAnimationStage((current) => Math.max(current, 4));
          }
        }}
        transition={fadeTransition}
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
      </motion.div>
    </section>
  );
}
