import { landingContentEn } from "./en";
import { landingContentTr } from "./tr";
import type { LandingContent, LandingLocale } from "./types";

export const landingContent = {
  en: landingContentEn,
  tr: landingContentTr,
} as const satisfies Record<LandingLocale, LandingContent>;
