import type { Metadata } from "next";

import type { LandingContent } from "./content/types";

const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);

function parseSiteUrl(value: string | undefined) {
  if (!value) return null;

  const normalizedValue = value.includes("://")
    ? value
    : `https://${value}`;

  try {
    const url = new URL(normalizedValue);

    if (!SUPPORTED_PROTOCOLS.has(url.protocol)) {
      return null;
    }

    url.hash = "";
    url.pathname = "/";
    url.search = "";

    return url;
  } catch {
    return null;
  }
}

export function resolveLandingSiteUrl(
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  return (
    parseSiteUrl(environment.NEXT_PUBLIC_SITE_URL) ??
    parseSiteUrl(environment.VERCEL_PROJECT_PRODUCTION_URL) ??
    parseSiteUrl(environment.VERCEL_URL)
  );
}

export function createLandingMetadata(
  content: LandingContent,
  canonicalPath: "/" | "/en",
): Metadata {
  const siteUrl = resolveLandingSiteUrl();
  const canonicalUrl = siteUrl
    ? new URL(canonicalPath, siteUrl)
    : undefined;
  const languageAlternates = siteUrl
    ? {
        en: new URL("/en", siteUrl),
        tr: new URL("/", siteUrl),
        "x-default": new URL("/", siteUrl),
      }
    : undefined;

  return {
    ...(siteUrl ? { metadataBase: siteUrl } : {}),
    alternates:
      canonicalUrl && languageAlternates
        ? {
            canonical: canonicalUrl,
            languages: languageAlternates,
          }
        : undefined,
    description: content.metadata.description,
    openGraph: {
      alternateLocale:
        content.locale === "tr" ? ["en_US"] : ["tr_TR"],
      description: content.metadata.description,
      locale: content.metadata.openGraphLocale,
      siteName: "Factory Runway",
      title: content.metadata.title,
      type: "website",
      ...(canonicalUrl ? { url: canonicalUrl } : {}),
    },
    title: content.metadata.title,
  };
}
