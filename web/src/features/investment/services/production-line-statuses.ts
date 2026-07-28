import { FactoryProductionLineStatus } from "@/generated/prisma/enums";

export const OPERATIONAL_PRODUCTION_LINE_STATUSES = [
  FactoryProductionLineStatus.IDLE,
  FactoryProductionLineStatus.RUNNING,
  FactoryProductionLineStatus.BLOCKED,
  FactoryProductionLineStatus.MAINTENANCE,
  FactoryProductionLineStatus.BROKEN,
] as const;

export const PRODUCTION_CAPACITY_LINE_STATUSES = [
  FactoryProductionLineStatus.IDLE,
  FactoryProductionLineStatus.RUNNING,
] as const;

export const ECONOMICALLY_OWNED_PRODUCTION_LINE_STATUSES = [
  ...OPERATIONAL_PRODUCTION_LINE_STATUSES,
  FactoryProductionLineStatus.INSTALLING,
  FactoryProductionLineStatus.DISABLED,
] as const;
