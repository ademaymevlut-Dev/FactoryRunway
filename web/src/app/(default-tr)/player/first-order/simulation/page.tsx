import { redirect } from "next/navigation";

import {
  CustomerOrderStatus,
  Prisma,
  ProductionLineAssetVariant,
  TutorialKey,
  TutorialStatus,
} from "@/generated/prisma/client";
import { USER_ROLES } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";

import {
  FirstOrderSimulationClient,
  type FirstOrderSimulationView,
  type SimulationLineView,
} from "./simulation-client";
import {
  buildFirstSimulationSchedule,
  type FirstSimulationStepInput,
} from "./simulation-math";
import { FIRST_SIMULATION_SHIFT_XP } from "./reward-config";

export const dynamic = "force-dynamic";

const rewardXp = FIRST_SIMULATION_SHIFT_XP;
const productionOrderInclude = {
  customerOrder: true,
  product: {
    include: {
      productType: { include: { translations: true } },
    },
  },
  routeProgress: {
    orderBy: { sequence: "asc" },
    include: {
      department: { include: { translations: true } },
    },
  },
} as const satisfies Prisma.ProductionOrderInclude;
const productionLineInclude = {
  department: { include: { translations: true } },
  productionLineTemplate: {
    include: {
      visualAssets: true,
    },
  },
} as const satisfies Prisma.FactoryProductionLineInclude;

type SimulationProductionOrder = Prisma.ProductionOrderGetPayload<{
  include: typeof productionOrderInclude;
}>;
type SimulationProductionLine = Prisma.FactoryProductionLineGetPayload<{
  include: typeof productionLineInclude;
}>;

type Translation = {
  locale: string;
  name?: string | null;
  description?: string | null;
};

export default async function FirstOrderSimulationPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/");
  if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN) {
    redirect("/admin");
  }

  const prisma = getPrisma();
  const playerProfile = await prisma.playerProfile.findUnique({
    where: { userId: user.id },
    include: {
      factories: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          tutorialProgress: {
            where: { tutorialKey: TutorialKey.FIRST_ORDER },
            take: 1,
            include: {
              productionOrder: {
                include: productionOrderInclude,
              },
            },
          },
          productionLines: {
            orderBy: [{ sortOrder: "asc" }, { lineNumber: "asc" }],
            include: productionLineInclude,
          },
        },
      },
    },
  });

  const factory = playerProfile?.factories[0];
  if (!playerProfile || !factory) redirect("/onboarding");

  const tutorial = factory.tutorialProgress[0];
  if (!tutorial?.productionOrder) redirect("/player/first-order");
  if (tutorial.status === TutorialStatus.COMPLETED) redirect("/player");

  const hasOrder = tutorial.productionOrder.customerOrder.status !== CustomerOrderStatus.CANCELLED;
  if (!hasOrder) redirect("/player/first-order");

  const simulation = buildSimulationView({
    factoryName: factory.name,
    startDay: tutorial.currentDay,
    productionOrder: tutorial.productionOrder,
    productionLines: factory.productionLines,
  });

  return <FirstOrderSimulationClient simulation={simulation} />;
}

function buildSimulationView({
  factoryName,
  startDay,
  productionOrder,
  productionLines,
}: {
  factoryName: string;
  startDay: number;
  productionOrder: SimulationProductionOrder;
  productionLines: SimulationProductionLine[];
}): FirstOrderSimulationView {
  const plannedQuantity = productionOrder.plannedQuantity;
  const routeRows = productionOrder.routeProgress.slice(0, 3);
  const usedLineIds = new Set<string>();
  const stepInputs: Array<{
    routeRow: SimulationProductionOrder["routeProgress"][number];
    productionLine: SimulationProductionLine;
    input: FirstSimulationStepInput;
  }> = [];

  for (const routeRow of routeRows) {
    const productionLine = productionLines.find(
      (line) => line.departmentId === routeRow.departmentId && !usedLineIds.has(line.id),
    );

    if (!productionLine) continue;

    usedLineIds.add(productionLine.id);
    stepInputs.push({
      routeRow,
      productionLine,
      input: buildStepInput(routeRow, productionLine),
    });
  }

  const schedule = buildFirstSimulationSchedule(
    stepInputs.map((step) => step.input),
    startDay,
  );
  const lines: SimulationLineView[] = schedule.steps.map((step) => {
    const viewStep = stepInputs.find((input) => input.input.routeProgressId === step.routeProgressId);

    if (!viewStep) {
      throw new Error("Simülasyon adımı görüntü verisi bulunamadı.");
    }

    return buildLineView({
      dailyCounts: step.dailyCounts,
      departmentKey: viewStep.routeRow.department.key,
      departmentName: displayName(
        viewStep.routeRow.department.translations,
        viewStep.routeRow.department.key,
      ),
      productionLine: viewStep.productionLine,
    });
  });

  const productName =
    displayName(productionOrder.product.productType.translations, productionOrder.product.name) ??
    productionOrder.product.name;

  return {
    factoryName,
    orderNo: productionOrder.customerOrder.orderNo,
    productName,
    plannedQuantity,
    startDay,
    rewardXp,
    lines,
  };
}

function buildStepInput(
  routeRow: SimulationProductionOrder["routeProgress"][number],
  productionLine: SimulationProductionLine,
): FirstSimulationStepInput {
  return {
    routeProgressId: routeRow.id,
    productRouteStepId: routeRow.productRouteStepId,
    departmentId: routeRow.departmentId,
    productionLineId: productionLine.id,
    productionLineTemplateId: productionLine.productionLineTemplateId,
    lineNumber: productionLine.lineNumber,
    lineSortOrder: productionLine.sortOrder,
    templateDailyPointCapacity: productionLine.productionLineTemplate.dailyPointCapacity,
    conditionBps: productionLine.conditionBps,
    workloadPointsPerUnit: routeRow.workloadPointsPerUnit,
    setupPoints: routeRow.setupPoints,
    plannedQuantity: routeRow.plannedQuantity,
    inputReadyQuantity: routeRow.inputReadyQuantity,
    completedQuantity: routeRow.completedQuantity,
  };
}

function buildLineView({
  productionLine,
  departmentKey,
  departmentName,
  dailyCounts,
}: {
  productionLine: SimulationProductionLine;
  departmentKey: string;
  departmentName: string;
  dailyCounts: [number, number, number];
}): SimulationLineView {
  const template = productionLine.productionLineTemplate;

  return {
    id: productionLine.id,
    key: template.key,
    departmentKey,
    departmentName,
    segmentLabel: `${gradeLabel(template.grade)} Segment`,
    imageUrl: pickLineImage(template),
    dailyCounts,
  };
}

function pickLineImage(
  template: SimulationProductionLine["productionLineTemplate"],
) {
  return (
    template.visualAssets.find((asset) => asset.variant === ProductionLineAssetVariant.MAP)?.url ??
    template.visualAssets.find((asset) => asset.variant === ProductionLineAssetVariant.DETAIL)?.url ??
    template.visualAssets.find((asset) => asset.variant === ProductionLineAssetVariant.CARD)?.url ??
    template.visualAssets.find((asset) => asset.variant === ProductionLineAssetVariant.THUMBNAIL)?.url ??
    template.imageUrl ??
    fallbackLineImage(template.key)
  );
}

function fallbackLineImage(templateKey: string) {
  const key = templateKey.toLowerCase();

  if (key.includes("cut")) return "/factory-machines/factory-kesimv2.png";
  if (key.includes("sew")) return "/factory-machines/factory-dikimv2.png";
  if (key.includes("iron") || key.includes("pack")) {
    return "/factory-machines/factory-utupaketv2.png";
  }

  return "/factory-machines/cutting_level1.png";
}

function gradeLabel(grade: string) {
  const labels: Record<string, string> = {
    WORKSHOP: "Workshop",
    INDUSTRIAL: "Industrial",
    PRECISION: "Precision",
    SMART: "Smart",
  };

  return labels[grade] ?? grade;
}

function displayName(translations: Translation[], fallback: string) {
  return (
    translations.find((translation) => translation.locale === "tr")?.name ??
    translations.find((translation) => translation.locale === "en")?.name ??
    fallback
  );
}
