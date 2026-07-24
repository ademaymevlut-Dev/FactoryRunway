export function formatProductionQueueNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}
