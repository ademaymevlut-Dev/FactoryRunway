import Image from "next/image";

import type { LandingContent } from "../content/types";
import { LandingLanguageSwitcher } from "./landing-language-switcher";

type LandingFooterProps = {
  content: LandingContent;
};

export function LandingFooter({ content }: LandingFooterProps) {
  return (
    <footer className="border-t border-border py-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Image
            alt=""
            aria-hidden="true"
            className="h-10 w-10 object-contain"
            height={40}
            src="/factoryRunway.svg"
            width={40}
          />
          <div>
            <p className="text-sm font-bold tracking-[0.08em] text-white">
              FACTORY RUNWAY
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {content.footer.description}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <LandingLanguageSwitcher compact content={content} />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {content.footer.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
