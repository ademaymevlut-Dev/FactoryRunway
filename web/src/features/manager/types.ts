export type ManagerRecommendationSeverity =
  | "INFO"
  | "OPPORTUNITY"
  | "WARNING"
  | "CRITICAL";

export type ManagerRecommendationCategory =
  | "INVESTMENT"
  | "OPERATIONS"
  | "FINANCE";

export type ManagerRecommendationPanelTarget =
  | "orders"
  | "production"
  | "tasks"
  | "staff"
  | "finance"
  | "reports"
  | "warehouse"
  | "departmentQueue"
  | "investment";

export type ManagerRecommendationCta = {
  kind: "PANEL";
  label: string;
  panel: ManagerRecommendationPanelTarget;
  payload?: Record<string, string | number | boolean | null>;
};

export type ManagerRecommendation = {
  body: string;
  category: ManagerRecommendationCategory;
  cta: ManagerRecommendationCta | null;
  id: string;
  meta: Record<string, string | number | boolean | null>;
  priority: number;
  severity: ManagerRecommendationSeverity;
  title: string;
};
