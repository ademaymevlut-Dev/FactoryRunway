import Image from "next/image";
import Link from "next/link";

import type { LandingContent } from "../content/types";
import { LandingLanguageSwitcher } from "./landing-language-switcher";

type LandingHeaderProps = {
  content: LandingContent;
};

export function LandingHeader({ content }: LandingHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl"
      data-landing-header
    >
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          aria-label="Factory Runway"
          className="factory-brand-lockup shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          href={content.locale === "tr" ? "/tr" : "/"}
        >
          <Image
            alt=""
            aria-hidden="true"
            className="h-11 w-11 object-contain sm:h-12 sm:w-12"
            height={48}
            priority
            src="/factoryRunway.svg"
            width={48}
          />
          <span className="hidden gap-0.5 sm:grid">
            <span className="text-sm font-black leading-none tracking-[0.08em] text-white sm:text-base">
              FACTORY RUNWAY
            </span>
          </span>
        </Link>

        <nav
          aria-label={content.navigation.ariaLabel}
          className="order-3 flex w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card/70 p-1 lg:order-2 lg:w-auto lg:border-0 lg:bg-transparent lg:p-0"
        >
          <a
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 text-xs font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            href="#gameplay"
          >
            {content.navigation.gameplay}
          </a>
          <a
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 text-xs font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            href="#orders"
          >
            {content.navigation.howItWorks}
          </a>
          <a
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 text-xs font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            href="#account"
          >
            {content.navigation.login}
          </a>
        </nav>

        <div className="order-2 flex items-center gap-2 lg:order-3">
          <LandingLanguageSwitcher content={content} />
          <a
            className="game-button-primary min-h-11 whitespace-nowrap px-3 text-xs sm:px-4 sm:text-sm"
            href="#account"
          >
            {content.navigation.register}
          </a>
        </div>
      </div>
    </header>
  );
}
