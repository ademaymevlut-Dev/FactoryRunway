import assert from "node:assert/strict";
import test from "node:test";

import {
  ContentStatus,
  DepartmentKind,
  FactoryProductionLineStatus,
  FactoryStatus,
  type PrismaClient,
} from "@/generated/prisma/client";

import {
  buildLinePurchaseReferenceKey,
  calculateNextLinePlacement,
  purchaseProductionLine,
} from "./purchase-production-line";

type LineRecord = {
  id: string;
  departmentId: string;
  lineNumber: number;
  sortOrder: number;
  status: FactoryProductionLineStatus;
  installedDay?: number;
};

type HarnessState = {
  cashBalanceCents: bigint;
  currentLevel: number;
  currentXp: number;
  finance: Array<Record<string, unknown>>;
  lines: LineRecord[];
  stageId: string;
  staff: Array<{
    factoryId: string;
    factoryProductionLineId: string | null;
    quantity: number;
    scopeKey: string;
    staffRoleId: string;
    status: string;
  }>;
  totalXp: bigint;
  xpTransactions: Array<Record<string, unknown>>;
};

function buildHarness(overrides?: {
  cashBalanceCents?: bigint;
  failLineCreate?: boolean;
  factoryUserId?: string;
  runningShift?: boolean;
  templateDepartmentKind?: DepartmentKind;
  templateSectorId?: string;
  templateStatus?: ContentStatus;
  existingLines?: LineRecord[];
  failStaffCreate?: boolean;
  templateGrade?: "WORKSHOP" | "INDUSTRIAL";
}) {
  const existingLines = structuredClone(overrides?.existingLines ?? []);
  const initialStageId = existingLines.length >= 3 ? "small" : "micro";
  const state: HarnessState = {
    cashBalanceCents: overrides?.cashBalanceCents ?? BigInt(1_000_000),
    currentLevel: 1,
    currentXp: 0,
    finance: [],
    lines: existingLines,
    stageId: initialStageId,
    staff: buildInitialSupportStaff(initialStageId),
    totalXp: BigInt(0),
    xpTransactions: [],
  };
  let transactionQueue = Promise.resolve();

  function buildTx(local: HarnessState) {
    return {
      factory: {
        findFirst: async ({ where }: { where: { id: string; playerProfile: { userId: string } } }) =>
          where.id === "factory-1" &&
          where.playerProfile.userId === (overrides?.factoryUserId ?? "user-1")
            ? {
                cashBalanceCents: local.cashBalanceCents,
                currencyCode: "EUR" as const,
                currentDay: 13,
                currentFinancePeriod: 1,
                id: "factory-1",
                sectorId: "textile",
                status: FactoryStatus.ACTIVE,
                operatingStageState: { currentStageId: local.stageId },
              }
            : null,
        findUniqueOrThrow: async () => ({
          currentDay: 13,
          currentLevel: local.currentLevel,
          currentXp: local.currentXp,
          playerProfileId: "profile-1",
          sectorId: "textile",
          operatingStageState: {
            currentStageId: local.stageId,
            highestReachedStageId: local.stageId,
            highestReachedStage: {
              sortOrder: local.stageId === "stable" ? 3 : 2,
            },
          },
        }),
        update: async ({
          data,
        }: {
          data: {
            currentLevel?: number;
            currentXp?: { increment: number };
          };
        }) => {
          if (data.currentXp) local.currentXp += data.currentXp.increment;
          if (data.currentLevel !== undefined) {
            local.currentLevel = data.currentLevel;
          }

          return {
            currentLevel: local.currentLevel,
            currentXp: local.currentXp,
          };
        },
        updateMany: async ({ data }: { data: { cashBalanceCents: { decrement: bigint } } }) => {
          if (local.cashBalanceCents < data.cashBalanceCents.decrement) {
            return { count: 0 };
          }

          local.cashBalanceCents -= data.cashBalanceCents.decrement;
          return { count: 1 };
        },
      },
      shiftSimulation: {
        findFirst: async ({ where }: { where: { status?: string } }) =>
          where.status === "RUNNING" && overrides?.runningShift
            ? { id: "shift-running" }
            : null,
      },
      factoryFinanceTransaction: {
        findUnique: async ({ where }: { where: { referenceKey: string } }) =>
          local.finance.find(
            (transaction) => transaction.referenceKey === where.referenceKey,
          ) ?? null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          local.finance.push(data);
          return { id: `finance-${local.finance.length}` };
        },
      },
      playerLevelConfig: {
        findMany: async () => [
          { level: 1, requiredXp: 0, scopeKey: "textile", unlockKey: null },
          {
            level: 2,
            requiredXp: 500,
            scopeKey: "textile",
            unlockKey: "basic_goals",
          },
          {
            level: 3,
            requiredXp: 1_200,
            scopeKey: "textile",
            unlockKey: "new_offers",
          },
        ],
      },
      playerProfile: {
        update: async ({
          data,
        }: {
          data: { totalXp: { increment: bigint } };
        }) => {
          local.totalXp += data.totalXp.increment;
          return { id: "profile-1" };
        },
      },
      factoryXpTransaction: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          local.xpTransactions.push(data);
          return { id: `xp-${local.xpTransactions.length}` };
        },
      },
      productionLineTemplate: {
        findUnique: async () => ({
          areaM2: 160,
          departmentId: "sewing",
          id: "template-sewing",
          idealStaff: overrides?.templateGrade === "INDUSTRIAL" ? 12 : 15,
          monthlyElectricityBaseCents: 20_000,
          purchaseCostCents: 200_000,
          sectorId: overrides?.templateSectorId ?? "textile",
          status: overrides?.templateStatus ?? ContentStatus.ACTIVE,
          department: {
            departmentGroupId: "sewing-group",
            kind:
              overrides?.templateDepartmentKind ?? DepartmentKind.PRODUCTION,
            monthlyOverheadPerLineCents: 1_000,
          },
          staffRequirements:
            overrides?.templateGrade === "INDUSTRIAL"
              ? buildDirectRequirements([1, 9, 1, 1])
              : buildDirectRequirements([1, 12, 1, 1]),
        }),
      },
      department: {
        findMany: async () => [{ id: "sewing" }, { id: "embroidery" }],
      },
      factoryProductionLine: {
        aggregate: async ({
          where,
          _max,
        }: {
          where: {
            departmentId: string | { in: string[] };
            factoryId: string;
          };
          _max: { lineNumber?: true; sortOrder?: true };
        }) => {
          const departmentIds =
            typeof where.departmentId === "string"
              ? [where.departmentId]
              : where.departmentId.in;
          const matchingLines = local.lines.filter((line) =>
            departmentIds.includes(line.departmentId),
          );

          return {
            _max: {
              lineNumber: _max.lineNumber
                ? maximum(matchingLines.map((line) => line.lineNumber))
                : null,
              sortOrder: _max.sortOrder
                ? maximum(matchingLines.map((line) => line.sortOrder))
                : null,
            },
          };
        },
        create: async ({ data }: { data: LineRecord }) => {
          if (overrides?.failLineCreate) throw new Error("line create failed");
          local.lines.push(data);
          return data;
        },
        count: async () =>
          local.lines.filter(
            (line) =>
              line.status !== FactoryProductionLineStatus.SOLD &&
              line.status !== FactoryProductionLineStatus.DISABLED,
          ).length,
      },
      sectorFactoryOperatingStage: {
        findMany: async () => [
          {
            id: "stable",
            key: "stable_workshop",
            maxProductionLines: 9,
            minProductionLines: 6,
            sortOrder: 3,
            dailySupportMealPerStaffCents: 250,
            supportOverheadPerStaffCents: 700,
            translations: [{ name: "Stable Workshop" }],
            staffRequirements: buildStageRequirements("stable"),
          },
          {
            id: "small",
            key: "small_workshop",
            maxProductionLines: 5,
            minProductionLines: 3,
            sortOrder: 2,
            dailySupportMealPerStaffCents: 235,
            supportOverheadPerStaffCents: 600,
            translations: [{ name: "Small Workshop" }],
            staffRequirements: buildStageRequirements("small"),
          },
          {
            id: "micro",
            key: "micro_workshop",
            maxProductionLines: 2,
            minProductionLines: 1,
            sortOrder: 1,
            dailySupportMealPerStaffCents: 220,
            supportOverheadPerStaffCents: 500,
            translations: [{ name: "Micro Workshop" }],
            staffRequirements: buildStageRequirements("micro"),
          },
        ],
      },
      sectorOperatingCostConfig: {
        findUniqueOrThrow: async () => ({
          dailyMealPerDirectStaffCents: 235,
          directStaffOverheadPerStaffCents: 600,
          monthlyWorkDays: 22,
          rentPerM2Cents: 200,
        }),
      },
      factoryStaffAssignment: {
        findMany: async () =>
          local.staff.filter(
            (assignment) => assignment.factoryProductionLineId === null,
          ),
        createMany: async ({ data }: { data: HarnessState["staff"] }) => {
          if (overrides?.failStaffCreate) throw new Error("staff create failed");
          local.staff.push(...data);
          return { count: data.length };
        },
        upsert: async ({
          create,
          update,
          where,
        }: {
          create: HarnessState["staff"][number];
          update: Partial<HarnessState["staff"][number]>;
          where: {
            factoryId_staffRoleId_scopeKey: {
              factoryId: string;
              scopeKey: string;
              staffRoleId: string;
            };
          };
        }) => {
          const key = where.factoryId_staffRoleId_scopeKey;
          const current = local.staff.find(
            (assignment) =>
              assignment.factoryId === key.factoryId &&
              assignment.scopeKey === key.scopeKey &&
              assignment.staffRoleId === key.staffRoleId,
          );
          if (current) Object.assign(current, update);
          else local.staff.push(create);
          return current ?? create;
        },
        groupBy: async ({ where }: { where: { staffRoleId: { in: string[] } } }) =>
          where.staffRoleId.in.map((staffRoleId) => ({
            staffRoleId,
            _sum: {
              quantity: local.staff
                .filter(
                  (assignment) =>
                    assignment.staffRoleId === staffRoleId &&
                    assignment.factoryProductionLineId === null,
                )
                .reduce((total, assignment) => total + assignment.quantity, 0),
            },
          })),
      },
      factoryOperatingStageState: {
        create: async () => undefined,
        update: async ({ data }: { data: { currentStageId: string } }) => {
          local.stageId = data.currentStageId;
        },
      },
      factoryOperatingStageHistory: {
        updateMany: async () => ({ count: 1 }),
        upsert: async () => undefined,
      },
    };
  }

  const prisma = {
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => {
      let release: () => void = () => {};
      const previous = transactionQueue;
      transactionQueue = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      const local = structuredClone(state);

      try {
        const result = await run(buildTx(local));
        state.cashBalanceCents = local.cashBalanceCents;
        state.currentLevel = local.currentLevel;
        state.currentXp = local.currentXp;
        state.finance = local.finance;
        state.lines = local.lines;
        state.stageId = local.stageId;
        state.staff = local.staff;
        state.totalXp = local.totalXp;
        state.xpTransactions = local.xpTransactions;
        return result;
      } finally {
        release();
      }
    },
    factoryFinanceTransaction: {
      findUnique: async ({ where }: { where: { referenceKey: string } }) =>
        state.finance.find(
          (transaction) => transaction.referenceKey === where.referenceKey,
        ) ?? null,
    },
  } as unknown as PrismaClient;

  return { prisma, state };
}

const purchase = {
  factoryId: "factory-1",
  productionLineTemplateId: "template-sewing",
  requestId: "request-1",
};

test("yeterli nakitle server template fiyatından peşin hat satın alır", async () => {
  const harness = buildHarness();
  const result = await purchaseProductionLine({
    prisma: harness.prisma,
    purchase,
    userId: "user-1",
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.directPayrollIncreaseCents, "1380000");
  }
  assert.equal(harness.state.cashBalanceCents, BigInt(800_000));
  assert.equal(harness.state.lines.length, 1);
  assert.equal(harness.state.lines[0]?.installedDay, 13);
  assert.equal(harness.state.finance.length, 1);
  assert.equal(harness.state.xpTransactions.length, 1);
  assert.equal(harness.state.currentXp, 250);
  const directStaff = harness.state.staff.filter(
    (assignment) => assignment.factoryProductionLineId !== null,
  );
  assert.equal(directStaff.length, 4);
  assert.equal(
    directStaff.reduce((total, assignment) => total + assignment.quantity, 0),
    15,
  );
  assert.equal(harness.state.finance[0]?.amountCents, BigInt(200_000));
  assert.equal(
    harness.state.finance[0]?.referenceKey,
    "LINE_PURCHASE:factory-1:request-1",
  );
});

test("Industrial hat kendi template requirement adetlerini kullanır", async () => {
  const harness = buildHarness({ templateGrade: "INDUSTRIAL" });
  const result = await purchaseProductionLine({
    prisma: harness.prisma,
    purchase,
    userId: "user-1",
  });

  assert.ok(result.ok);
  assert.equal(result.directStaffCreated, 12);
  assert.equal(
    harness.state.staff
      .filter((assignment) => assignment.factoryProductionLineId !== null)
      .reduce((total, assignment) => total + assignment.quantity, 0),
    12,
  );
});

test("yetersiz nakitte ödeme ve hat kaydı oluşturmaz", async () => {
  const harness = buildHarness({ cashBalanceCents: BigInt(199_999) });
  const result = await purchaseProductionLine({
    prisma: harness.prisma,
    purchase,
    userId: "user-1",
  });

  assert.deepEqual(result, { code: "INSUFFICIENT_FUNDS", ok: false });
  assert.equal(harness.state.cashBalanceCents, BigInt(199_999));
  assert.equal(harness.state.lines.length, 0);
  assert.equal(harness.state.finance.length, 0);
});

test("aynı requestId sıralı ve eşzamanlı çağrılarda tek kez uygulanır", async () => {
  const harness = buildHarness();
  const [first, second] = await Promise.all([
    purchaseProductionLine({ prisma: harness.prisma, purchase, userId: "user-1" }),
    purchaseProductionLine({ prisma: harness.prisma, purchase, userId: "user-1" }),
  ]);

  assert.equal([first, second].filter((result) => result.ok).length, 1);
  assert.equal(harness.state.cashBalanceCents, BigInt(800_000));
  assert.equal(harness.state.lines.length, 1);
  assert.equal(harness.state.finance.length, 1);
  assert.equal(
    harness.state.staff.filter(
      (assignment) => assignment.factoryProductionLineId !== null,
    ).length,
    4,
  );
});

test("stage değişmiyorsa support personeli eklemez", async () => {
  const harness = buildHarness({
    existingLines: Array.from({ length: 3 }, (_, index) => ({
      departmentId: "sewing",
      id: `line-${index + 1}`,
      lineNumber: index + 1,
      sortOrder: (index + 1) * 10,
      status: FactoryProductionLineStatus.IDLE,
    })),
  });
  const supportBefore = harness.state.staff.filter(
    (assignment) => assignment.factoryProductionLineId === null,
  ).reduce((total, assignment) => total + assignment.quantity, 0);
  const result = await purchaseProductionLine({
    prisma: harness.prisma,
    purchase,
    userId: "user-1",
  });
  const supportAfter = harness.state.staff.filter(
    (assignment) => assignment.factoryProductionLineId === null,
  ).reduce((total, assignment) => total + assignment.quantity, 0);

  assert.ok(result.ok);
  assert.equal(result.supportStaffCreated, 0);
  assert.equal(supportAfter, supportBefore);
});

test("SOLD numaralarını ve aynı DepartmentGroup içindeki diğer departmanı sırada tutar", async () => {
  const harness = buildHarness({
    existingLines: [
      {
        departmentId: "sewing",
        id: "sew-1",
        lineNumber: 1,
        sortOrder: 10,
        status: FactoryProductionLineStatus.IDLE,
      },
      {
        departmentId: "sewing",
        id: "sew-2",
        lineNumber: 2,
        sortOrder: 20,
        status: FactoryProductionLineStatus.SOLD,
      },
      {
        departmentId: "embroidery",
        id: "emb-1",
        lineNumber: 1,
        sortOrder: 40,
        status: FactoryProductionLineStatus.IDLE,
      },
    ],
  });
  const result = await purchaseProductionLine({
    prisma: harness.prisma,
    purchase,
    userId: "user-1",
  });

  assert.ok(result.ok);
  assert.equal(result.lineNumber, 3);
  assert.equal(result.sortOrder, 50);
});

test("altıncı aktif hat aynı transaction içinde operating stage değiştirir", async () => {
  const harness = buildHarness({
    existingLines: Array.from({ length: 5 }, (_, index) => ({
      departmentId: index < 3 ? "sewing" : "embroidery",
      id: `line-${index + 1}`,
      lineNumber: index < 3 ? index + 1 : index - 2,
      sortOrder: (index + 1) * 10,
      status: FactoryProductionLineStatus.IDLE,
    })),
  });
  const result = await purchaseProductionLine({
    prisma: harness.prisma,
    purchase,
    userId: "user-1",
  });

  assert.ok(result.ok);
  assert.equal(result.operatingStageChanged, true);
  assert.equal(result.supportStaffCreated, 1);
  assert.equal(harness.state.stageId, "stable");
  assert.equal(harness.state.currentXp, 750);
  assert.equal(harness.state.currentLevel, 2);
  assert.equal(
    harness.state.staff.find(
      (assignment) => assignment.staffRoleId === "role-material-flow",
    )?.quantity,
    2,
  );
});

test("playback, farklı sektör, pasif template ve üretim dışı departmanı reddeder", async () => {
  const cases = [
    [buildHarness({ runningShift: true }), "PLAYBACK_ACTIVE"],
    [buildHarness({ templateSectorId: "food" }), "SECTOR_MISMATCH"],
    [buildHarness({ templateStatus: ContentStatus.INACTIVE }), "TEMPLATE_NOT_ACTIVE"],
    [
      buildHarness({ templateDepartmentKind: DepartmentKind.WAREHOUSE }),
      "INVALID_DEPARTMENT_KIND",
    ],
  ] as const;

  for (const [harness, code] of cases) {
    const result = await purchaseProductionLine({
      prisma: harness.prisma,
      purchase,
      userId: "user-1",
    });

    assert.deepEqual(result, { code, ok: false });
    assert.equal(harness.state.finance.length, 0);
    assert.equal(harness.state.lines.length, 0);
  }
});

test("başka oyuncunun factory kaydına erişimi reddeder", async () => {
  const harness = buildHarness({ factoryUserId: "owner-user" });
  const result = await purchaseProductionLine({
    prisma: harness.prisma,
    purchase,
    userId: "attacker-user",
  });

  assert.deepEqual(result, { code: "FACTORY_NOT_FOUND", ok: false });
});

test("hat oluşturma hatasında nakit ve finance transaction rollback olur", async () => {
  const harness = buildHarness({ failLineCreate: true });

  await assert.rejects(
    purchaseProductionLine({
      prisma: harness.prisma,
      purchase,
      userId: "user-1",
    }),
    /line create failed/,
  );
  assert.equal(harness.state.cashBalanceCents, BigInt(1_000_000));
  assert.equal(harness.state.finance.length, 0);
  assert.equal(harness.state.lines.length, 0);
});

test("personel oluşturma hatasında line, personel ve nakit rollback olur", async () => {
  const harness = buildHarness({ failStaffCreate: true });
  const initialStaff = structuredClone(harness.state.staff);

  await assert.rejects(
    purchaseProductionLine({
      prisma: harness.prisma,
      purchase,
      userId: "user-1",
    }),
    /staff create failed/,
  );
  assert.equal(harness.state.cashBalanceCents, BigInt(1_000_000));
  assert.equal(harness.state.lines.length, 0);
  assert.equal(harness.state.finance.length, 0);
  assert.deepEqual(harness.state.staff, initialStaff);
});

test("reference key ve yerleşim hesapları deterministiktir", () => {
  assert.equal(
    buildLinePurchaseReferenceKey({ factoryId: "f", requestId: "r" }),
    "LINE_PURCHASE:f:r",
  );
  assert.deepEqual(
    calculateNextLinePlacement({
      maximumDepartmentGroupSortOrder: 40,
      maximumDepartmentLineNumber: 2,
    }),
    { lineNumber: 3, sortOrder: 50 },
  );
});

function maximum(values: number[]) {
  return values.length > 0 ? Math.max(...values) : null;
}

function buildDirectRequirements(quantities: number[]) {
  const roles = [
    ["sewing_line_leader", 130_000],
    ["sewing_operator", 90_000],
    ["sewing_helper", 75_000],
    ["inline_qc_staff", 95_000],
  ] as const;

  return roles.map(([key, monthlySalaryCents], index) => ({
    requiredQuantity: quantities[index] ?? 0,
    staffRole: {
      id: `role-${key}`,
      key,
      monthlySalaryCents,
      staffType: "DIRECT_PRODUCTION",
      translations: [{ name: key }],
    },
  }));
}

function buildStageRequirements(stageId: string) {
  return [
    {
      requiredQuantity: stageId === "stable" ? 2 : 1,
      staffRole: {
        id: "role-material-flow",
        key: "material_flow_staff",
        monthlySalaryCents: 80_000,
        translations: [{ name: "Material Flow" }],
      },
    },
  ];
}

function buildInitialSupportStaff(stageId: string): HarnessState["staff"] {
  return [
    {
      factoryId: "factory-1",
      factoryProductionLineId: null,
      quantity: stageId === "stable" ? 2 : 1,
      scopeKey: "FACTORY",
      staffRoleId: "role-material-flow",
      status: "ACTIVE",
    },
  ];
}
