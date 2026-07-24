export function formatShowcaseNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatShowcaseMoney(
  value: number,
  currency: string,
  locale: string,
) {
  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
}
