import Link from "next/link";

import type { LandingContent } from "../content/types";

type LandingLanguageSwitcherProps = {
  content: LandingContent;
  compact?: boolean;
};

export function LandingLanguageSwitcher({
  compact = false,
  content,
}: LandingLanguageSwitcherProps) {
  const currentLanguage = content.locale === "tr" ? "TR" : "EN";
  const href = content.locale === "tr" ? "/en" : "/";
  const hrefLang = content.locale === "tr" ? "en" : "tr";

  return (
    <div
      aria-label={content.footer.languageLabel}
      className={
        compact
          ? "inline-flex min-h-11 items-center gap-2 text-xs"
          : "inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-secondary/70 px-3 text-xs"
      }
    >
      <span
        aria-current="page"
        className="font-semibold text-muted-foreground"
      >
        {currentLanguage}
      </span>
      <span aria-hidden="true" className="text-border">
        /
      </span>
      <Link
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md font-semibold text-foreground transition hover:text-primary-readable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        href={href}
        hrefLang={hrefLang}
        lang={hrefLang}
      >
        {content.navigation.languageLabel}
      </Link>
    </div>
  );
}
