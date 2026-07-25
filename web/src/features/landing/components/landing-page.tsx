import type { LandingContent } from "../content/types";
import { LandingAuthSection } from "./landing-auth-section";
import { LandingFooter } from "./landing-footer";
import { LandingGameLoop } from "./landing-game-loop";
import { LandingHeader } from "./landing-header";
import { LandingHero } from "./landing-hero";
import { LandingOrderAcceptanceSection } from "../showcase/components/landing-order-acceptance-section";
import { LandingProductionQueueSection } from "../showcase/components/landing-production-queue-section";
import { LandingShiftSimulationSection } from "../showcase/components/landing-shift-simulation-section";

type LandingPageProps = {
  content: LandingContent;
};

export function LandingPage({ content }: LandingPageProps) {
  return (
    <div className="landing-public min-h-screen overflow-x-clip bg-background text-foreground">
      <a
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-xl transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        href="#main-content"
      >
        {content.accessibility.skipToContent}
      </a>
      <div aria-hidden="true" className="factory-backdrop" />
      <LandingHeader content={content} />
      <main
        className="relative mx-auto w-full max-w-7xl px-4 focus:outline-none sm:px-6 lg:px-8"
        id="main-content"
        tabIndex={-1}
      >
        <LandingHero content={content} />
        <LandingGameLoop content={content} />
        <LandingOrderAcceptanceSection content={content} />
        <LandingProductionQueueSection content={content} />
        <LandingShiftSimulationSection content={content} />
        <LandingAuthSection content={content} />
      </main>
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <LandingFooter content={content} />
      </div>
    </div>
  );
}
