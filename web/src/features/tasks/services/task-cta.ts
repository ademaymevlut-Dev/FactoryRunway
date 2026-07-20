import type { TaskObjectiveType } from "@/generated/prisma/enums";

import type { TaskCta } from "../types";

export function buildTaskCta(objectiveType: TaskObjectiveType): TaskCta {
  switch (objectiveType) {
    case "ACCEPT_ORDER":
      return { kind: "PANEL", label: "Siparişlere Git", panel: "orders" };
    case "COMPLETE_SHIFT":
      return { kind: "SHIFT", label: "Vardiyayı İlerle" };
    case "SHIP_ON_TIME":
      return { kind: "PANEL", label: "Depoyu İncele", panel: "warehouse" };
    case "PAYMENT_RECEIVED":
    case "CLOSE_PROFITABLE_FINANCE_PERIOD":
      return { kind: "PANEL", label: "Finansı Aç", panel: "finance" };
    case "CHANGE_PRIORITY":
      return {
        kind: "PANEL",
        label: "Üretim Kuyruğuna Git",
        panel: "departmentQueue",
      };
    case "OPEN_INVESTMENT_PANEL":
    case "ACQUIRE_PRODUCTION_LINE":
      return {
        kind: "PANEL",
        label: "Yatırımları İncele",
        panel: "investment",
      };
    case "USE_NEW_PRODUCTION_LINE":
      return { kind: "SHIFT", label: "Vardiyayı İlerle" };
    case "MEET_STAGE_STAFF":
      return { kind: "PANEL", label: "Personeli İncele", panel: "staff" };
    case "COMPLETE_OUTSOURCE":
      return {
        kind: "PANEL",
        label: "Üretim Kuyruğuna Git",
        panel: "departmentQueue",
      };
    case "COMPLETE_PREMIUM_ORDER":
    case "COMPLETE_EXPRESS_ORDER":
      return { kind: "PANEL", label: "Siparişlere Git", panel: "orders" };
    default:
      return null;
  }
}
