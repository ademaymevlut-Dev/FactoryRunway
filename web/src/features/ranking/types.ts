import type { ProductionGrade } from "@/generated/prisma/enums";

export type RankingFactorySummary = {
  id: string;
  name: string;
  currentLevel: number;
  currentXp: number;
  productionLineCount: number;
  sectorKey: string;
  sectorName: string;
  sectorSortOrder: number;
};

export type XpRankingEntry = {
  displayName: string;
  factories: RankingFactorySummary[];
  isCurrentPlayer: boolean;
  playerProfileId: string;
  rankPosition: number;
  totalXp: string;
};

export type XpRankingView = {
  currentPlayerEntry: XpRankingEntry | null;
  entries: XpRankingEntry[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalPlayers: number;
};

export type FactoryVisitLine = {
  code: string;
  departmentId: string;
  departmentKey: string;
  departmentName: string;
  grade: ProductionGrade;
  id: string;
  imageUrl: string | null;
  lineNumber: number;
  title: string;
};

export type FactoryVisitSection = {
  id: string;
  key: string;
  lines: FactoryVisitLine[];
  sortOrder: number;
  title: string;
  tone: "cyan" | "blue" | "amber" | "red" | "violet" | "green";
};

export type FactoryVisitView = {
  factory: {
    currentLevel: number;
    currentXp: number;
    id: string;
    name: string;
    operatingStageName: string;
    productionLineCount: number;
    sectorKey: string;
    sectorName: string;
  };
  player: {
    displayName: string;
    playerProfileId: string;
    totalXp: string;
  };
  sections: FactoryVisitSection[];
};
