import type { LandingContent } from "../content/types";
import { LandingAuthSection } from "./landing-auth-section";
import { LandingFooter } from "./landing-footer";
import { LandingGameLoop } from "./landing-game-loop";
import { LandingHeader } from "./landing-header";
import { LandingHero } from "./landing-hero";
import { LandingMobileHero } from "./landing-mobile-hero";
import { LandingPanelStack } from "./landing-panel-stack";
import { LandingOrderAcceptanceSection } from "../showcase/components/landing-order-acceptance-section";
import { LandingProductionQueueSection } from "../showcase/components/landing-production-queue-section";
import { LandingShiftReportSection } from "../showcase/components/landing-shift-report-section";
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
        <LandingMobileHero content={content} />
        <LandingPanelStack>
          <div
            className="landing-desktop-panel landing-scroll-panel landing-scroll-panel-hero"
            data-landing-panel
            data-landing-panel-index="1"
          >
            <div data-landing-panel-content>
              <LandingHero content={content} />
            </div>
          </div>

          <div
            className="landing-desktop-panel landing-scroll-panel"
            data-landing-panel
            data-landing-panel-index="2"
          >
            <div data-landing-panel-content>
              <LandingGameLoop content={content} />
            </div>
          </div>

          <div
            className="landing-desktop-panel landing-scroll-panel"
            data-landing-panel
            data-landing-panel-index="3"
          >
            <div data-landing-panel-content>
              <LandingOrderAcceptanceSection content={content} />
            </div>
          </div>

          <div
            className="landing-desktop-panel landing-scroll-panel"
            data-landing-panel
            data-landing-panel-index="4"
          >
            <div data-landing-panel-content>
              <LandingProductionQueueSection content={content} />
            </div>
          </div>

          <div
            className="landing-desktop-panel landing-scroll-panel"
            data-landing-panel
            data-landing-panel-index="5"
          >
            <div data-landing-panel-content>
              <LandingShiftSimulationSection content={content} />
            </div>
          </div>

          <div
            className="landing-desktop-panel landing-scroll-panel"
            data-landing-panel
            data-landing-panel-index="6"
          >
            <div data-landing-panel-content>
              <LandingShiftReportSection content={content} />
            </div>
          </div>

          <div
            className="landing-scroll-panel landing-scroll-panel-account"
            data-landing-panel
            data-landing-panel-index="7"
          >
            <div data-landing-panel-content>
              <LandingAuthSection content={content} />
            </div>
          </div>
        </LandingPanelStack>
      </main>
      <div className="relative mx-auto hidden w-full max-w-7xl px-4 md:block md:px-6 lg:px-8">
        <LandingFooter content={content} />
      </div>
    </div>
  );
}
