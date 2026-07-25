import type { TaskObjectiveType } from "@/generated/prisma/enums";
import { gameCopy } from "@/features/game/game-copy";
import {
  DEFAULT_LOCALE,
  normalizeLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales";

import type { TaskCta } from "../types";

export function buildTaskCta(
  objectiveType: TaskObjectiveType,
  locale: SupportedLocale = DEFAULT_LOCALE,
): TaskCta {
  const copy = gameCopy[normalizeLocale(locale)].taskCta;

  switch (objectiveType) {
    case "ACCEPT_ORDER":
      return { kind: "PANEL", label: copy.acceptOrder, panel: "orders" };
    case "COMPLETE_SHIFT":
      return { kind: "SHIFT", label: copy.advanceShift };
    case "SHIP_ON_TIME":
      return { kind: "PANEL", label: copy.warehouse, panel: "warehouse" };
    case "PAYMENT_RECEIVED":
    case "CLOSE_PROFITABLE_FINANCE_PERIOD":
      return { kind: "PANEL", label: copy.finance, panel: "finance" };
    case "CHANGE_PRIORITY":
      return {
        kind: "PANEL",
        label: copy.productionQueue,
        panel: "departmentQueue",
      };
    case "OPEN_INVESTMENT_PANEL":
    case "ACQUIRE_PRODUCTION_LINE":
    case "UPGRADE_PRODUCTION_LINE":
      return {
        kind: "PANEL",
        label: copy.investment,
        panel: "investment",
      };
    case "USE_NEW_PRODUCTION_LINE":
      return { kind: "SHIFT", label: copy.advanceShift };
    case "MEET_STAGE_STAFF":
      return { kind: "PANEL", label: copy.staff, panel: "staff" };
    case "COMPLETE_OUTSOURCE":
      return {
        kind: "PANEL",
        label: copy.productionQueue,
        panel: "departmentQueue",
      };
    case "COMPLETE_PREMIUM_ORDER":
    case "COMPLETE_EXPRESS_ORDER":
    case "COMPLETE_INTERNAL_PROCESS_ORDER":
      return { kind: "PANEL", label: copy.acceptOrder, panel: "orders" };
    default:
      return null;
  }
}
