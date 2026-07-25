export type SupportedLocale = "tr" | "en";
export type NumberLocale = "tr-TR" | "en-US";

export const DEFAULT_LOCALE: SupportedLocale = "tr";
export const SUPPORTED_LOCALES = ["tr", "en"] as const;

export function normalizeLocale(value: unknown): SupportedLocale {
  if (typeof value !== "string") return DEFAULT_LOCALE;

  const normalized = value.trim().toLowerCase().slice(0, 2);

  return normalized === "en" ? "en" : DEFAULT_LOCALE;
}

export function otherLocale(locale: SupportedLocale): SupportedLocale {
  return locale === "tr" ? "en" : "tr";
}

export function numberLocale(locale: SupportedLocale): NumberLocale {
  return locale === "tr" ? "tr-TR" : "en-US";
}

export function localeUpper(value: string, locale: SupportedLocale) {
  return value.toLocaleUpperCase(numberLocale(locale));
}

export function thousandsSeparator(locale: SupportedLocale) {
  return locale === "tr" ? "." : ",";
}

export type NamedTranslation = {
  locale: string;
  name?: string | null;
  description?: string | null;
};

export function preferredTranslation<T extends { locale: string }>(
  translations: T[],
  locale: SupportedLocale,
) {
  return (
    translations.find((translation) => normalizeLocale(translation.locale) === locale) ??
    translations.find((translation) => normalizeLocale(translation.locale) === "en") ??
    translations.find((translation) => normalizeLocale(translation.locale) === "tr") ??
    translations[0]
  );
}

export function translatedName(
  translations: NamedTranslation[],
  fallback: string,
  locale: SupportedLocale,
) {
  return preferredTranslation(translations, locale)?.name ?? fallback;
}

export function translatedDescription(
  translations: NamedTranslation[],
  locale: SupportedLocale,
) {
  return preferredTranslation(translations, locale)?.description ?? null;
}

export function localizedMetadataString(
  metadata: Record<string, unknown>,
  key: string,
  locale: SupportedLocale,
) {
  return (
    localizedValue(metadata[key], locale) ??
    stringValue(metadata[`${key}${capitalizeLocale(locale)}`]) ??
    stringValue(metadata[`${key}_${locale}`]) ??
    localizedValue(metadata[key], otherLocale(locale)) ??
    stringValue(metadata[`${key}${capitalizeLocale(otherLocale(locale))}`]) ??
    stringValue(metadata[`${key}_${otherLocale(locale)}`]) ??
    stringValue(metadata[key])
  );
}

export function localizedMetadataStringArray(
  metadata: Record<string, unknown>,
  key: string,
  locale: SupportedLocale,
) {
  return (
    localizedArray(metadata[key], locale) ??
    stringArray(metadata[`${key}${capitalizeLocale(locale)}`]) ??
    stringArray(metadata[`${key}_${locale}`]) ??
    localizedArray(metadata[key], otherLocale(locale)) ??
    stringArray(metadata[`${key}${capitalizeLocale(otherLocale(locale))}`]) ??
    stringArray(metadata[`${key}_${otherLocale(locale)}`]) ??
    stringArray(metadata[key])
  );
}

function localizedValue(value: unknown, locale: SupportedLocale) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  return stringValue((value as Record<string, unknown>)[locale]);
}

function localizedArray(value: unknown, locale: SupportedLocale) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  return stringArray((value as Record<string, unknown>)[locale]);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stringArray(value: unknown) {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string") &&
    value.length > 0
    ? (value as string[]).map((item) => item.trim()).filter(Boolean)
    : undefined;
}

function capitalizeLocale(locale: SupportedLocale) {
  return locale === "tr" ? "Tr" : "En";
}
