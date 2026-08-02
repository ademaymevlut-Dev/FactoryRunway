import { Factory } from "lucide-react";

import type { LandingContent } from "../content/types";
import { LandingAuthForm } from "./landing-auth-form";

type LandingAuthSectionProps = {
  content: LandingContent;
};

export function LandingAuthSection({ content }: LandingAuthSectionProps) {
  return (
    <section
      className="scroll-mt-24 py-0 md:scroll-mt-40 md:py-24 lg:scroll-mt-24"
      id="account"
    >
      <div className="landing-mobile-account md:hidden">
        <div className="landing-auth-panel landing-mobile-auth-panel">
          <LandingAuthForm
            compact
            copy={content.auth}
            defaultTab="login"
            idPrefix="mobile"
            locale={content.locale}
            tabLabels={{
              login: content.mobile.loginTab,
              player: content.mobile.registerTab,
            }}
          />
        </div>
      </div>

      <div className="hidden items-center gap-10 md:grid lg:grid-cols-[1fr_30rem]">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary-readable">
            {content.auth.eyebrow}
          </p>
          <h2
            className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-5xl"
            id="account-title"
          >
            {content.auth.title}
          </h2>
          <p className="mt-5 text-base leading-8 text-muted-foreground">
            {content.auth.description}
          </p>
          <div className="mt-7 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.07] p-4">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-readable">
              <Factory aria-hidden="true" size={17} />
            </span>
            <p className="text-sm leading-6 text-muted-foreground">
              {content.auth.playerOnlyNotice}
            </p>
          </div>
        </div>

        <div className="landing-auth-panel">
          <LandingAuthForm copy={content.auth} locale={content.locale} />
        </div>
      </div>
    </section>
  );
}
