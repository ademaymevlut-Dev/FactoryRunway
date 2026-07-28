export const LEASING_PERIOD_DAYS = 22;

export function buildLeasingDueReferenceKey(input: {
  contractId: string;
  installmentIndex: number;
}) {
  return `LEASING_DUE:${input.contractId}:${input.installmentIndex}`;
}

export function calculateFirstLeasingDueDay(activatedDay: number) {
  return activatedDay + LEASING_PERIOD_DAYS;
}
