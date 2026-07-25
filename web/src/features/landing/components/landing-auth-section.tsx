import { Factory } from "lucide-react";

import type { LandingContent } from "../content/types";
import { LandingAuthForm } from "./landing-auth-form";

type LandingAuthSectionProps = {
  content: LandingContent;
};

export function LandingAuthSection({ content }: LandingAuthSectionProps) {
  return (
    <section
      aria-labelledby="account-title"
      className="scroll-mt-24 py-16 sm:py-24"
      id="account"
    >
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_28rem]">
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

        <div className="game-card p-5 sm:p-6">
          <LandingAuthForm copy={content.auth} />
        </div>
      </div>
    </section>
  );
}
