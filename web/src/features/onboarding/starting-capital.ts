export const DEFAULT_STARTING_CAPITAL_CENTS = BigInt(30_000_000);
export const DEFAULT_STARTING_CAPITAL_CENTS_INPUT = "30000000";
export const LEGACY_STARTING_CAPITAL_CENTS = BigInt(100_000_000);

export function resolveStartingCapitalCents(
  configuredCapitalCents?: bigint | null,
) {
  if (!configuredCapitalCents) return DEFAULT_STARTING_CAPITAL_CENTS;
  if (configuredCapitalCents === LEGACY_STARTING_CAPITAL_CENTS) {
    return DEFAULT_STARTING_CAPITAL_CENTS;
  }

  return configuredCapitalCents;
}
