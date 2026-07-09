import type {
  CurrencyCode,
  DepartmentKind,
  FactoryProductionLineStatus,
  ProductionGrade,
} from "@/generated/prisma/enums";

export type GamePanelKey =
  | "orders"
  | "production"
  | "staff"
  | "finance"
  | "reports"
  | "lineDetail"
  | "investment";

export type GameMetric = {
  id: string;
  label: string;
  value: string;
  subLabel: string;
  tone: "cyan" | "green" | "amber" | "red" | "violet" | "blue";
};

export type GameNotification = {
  id: string;
  title: string;
  body: string;
  tone: "info" | "warning" | "danger" | "success";
};

export type FactoryMapDepartment = {
  id: string;
  key: string;
  name: string;
  kind: DepartmentKind;
  routeOrder: number;
  supportsOutsource: boolean;
};

export type FactoryMapItem =
  | {
      kind: "productionLine";
      id: string;
      lineId: string;
      departmentId: string;
      departmentKey: string;
      departmentName: string;
      code: string;
      title: string;
      subtitle: string;
      status: FactoryProductionLineStatus;
      grade: ProductionGrade;
      lineNumber: number;
      sortOrder: number;
      conditionBps: number;
      dailyPointCapacity: number;
      idealStaff: number;
      assignedStaff: number;
      imageUrl: string | null;
    }
  | {
      kind: "investmentAction";
      id: string;
      sectionId: string;
      title: string;
      subtitle: string;
    };

export type FactoryMapSection = {
  id: string;
  key: string;
  step: string;
  title: string;
  tone: "cyan" | "blue" | "amber" | "red" | "violet" | "green";
  departments: FactoryMapDepartment[];
  items: FactoryMapItem[];
  productionLineCount: number;
  departmentCount: number;
};

export type GameSnapshot = {
  player: {
    id: string;
    displayName: string;
  };
  factory: {
    id: string;
    name: string;
    sectorName: string;
    currencyCode: CurrencyCode;
    cashBalanceCents: string;
    currentDay: number;
    currentFinancePeriod: number;
    currentLevel: number;
    currentXp: number;
  };
  metrics: GameMetric[];
  notifications: GameNotification[];
  map: {
    sections: FactoryMapSection[];
    totals: {
      productionLineCount: number;
      departmentCount: number;
      dailyPointCapacity: number;
      assignedStaff: number;
      idealStaff: number;
    };
  };
};
