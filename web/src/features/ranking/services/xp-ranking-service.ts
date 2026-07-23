import {
  DepartmentKind,
  FactoryProductionLineStatus,
  FactoryStatus,
  OnboardingStatus,
  Prisma,
} from "@/generated/prisma/client";
import { USER_ROLES } from "@/lib/auth/roles";
import { getPrisma } from "@/lib/db";

import type { XpRankingEntry, XpRankingView } from "../types";

export const XP_RANKING_PAGE_SIZE = 50;

const locale = "tr";

const eligiblePlayerWhere = {
  factories: {
    some: {
      status: FactoryStatus.ACTIVE,
    },
  },
  user: {
    is: {
      onboardingStatus: {
        in: [OnboardingStatus.COMPLETED, OnboardingStatus.NOT_REQUIRED],
      },
      role: USER_ROLES.PLAYER,
    },
  },
} satisfies Prisma.PlayerProfileWhereInput;

const rankingProfileSelect = {
  createdAt: true,
  displayName: true,
  factories: {
    orderBy: [{ currentXp: "desc" as const }, { createdAt: "asc" as const }],
    select: {
      _count: {
        select: {
          productionLines: {
            where: {
              department: {
                kind: DepartmentKind.PRODUCTION,
              },
              status: {
                not: FactoryProductionLineStatus.SOLD,
              },
            },
          },
        },
      },
      currentLevel: true,
      currentXp: true,
      id: true,
      name: true,
      sector: {
        select: {
          key: true,
          sortOrder: true,
          translations: {
            where: {
              locale: {
                in: [locale, "en"],
              },
            },
            select: {
              locale: true,
              name: true,
            },
          },
        },
      },
    },
    where: {
      status: FactoryStatus.ACTIVE,
    },
  },
  id: true,
  totalXp: true,
  userId: true,
} satisfies Prisma.PlayerProfileSelect;

type RankingProfileRecord = Prisma.PlayerProfileGetPayload<{
  select: typeof rankingProfileSelect;
}>;

export async function getXpRankingView(input: {
  page?: number;
  pageSize?: number;
  viewerUserId: string;
}): Promise<XpRankingView> {
  const prisma = getPrisma();
  const pageSize = clampPageSize(input.pageSize ?? XP_RANKING_PAGE_SIZE);
  const requestedPage = normalizePositiveInteger(input.page ?? 1);
  const totalPlayers = await prisma.playerProfile.count({
    where: eligiblePlayerWhere,
  });
  const totalPages = Math.max(1, Math.ceil(totalPlayers / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const skip = (page - 1) * pageSize;

  const [profiles, viewerProfile] = await Promise.all([
    prisma.playerProfile.findMany({
      orderBy: [{ totalXp: "desc" }, { createdAt: "asc" }, { id: "asc" }],
      select: rankingProfileSelect,
      skip,
      take: pageSize,
      where: eligiblePlayerWhere,
    }),
    prisma.playerProfile.findUnique({
      select: rankingProfileSelect,
      where: {
        userId: input.viewerUserId,
      },
    }),
  ]);

  const firstXp = profiles[0]?.totalXp;
  const [playersAboveFirstXp, playersAtFirstXp] =
    firstXp === undefined
      ? [0, 0]
      : await Promise.all([
          prisma.playerProfile.count({
            where: {
              ...eligiblePlayerWhere,
              totalXp: {
                gt: firstXp,
              },
            },
          }),
          prisma.playerProfile.count({
            where: {
              ...eligiblePlayerWhere,
              totalXp: firstXp,
            },
          }),
        ]);
  const pageRanks = calculatePageRankPositions({
    firstXpPlayerCount: playersAtFirstXp,
    playersAboveFirstXp,
    xpValues: profiles.map((profile) => profile.totalXp),
  });
  const entries = profiles.map((profile, index) =>
    toRankingEntry({
      profile,
      rankPosition: pageRanks[index] ?? skip + index + 1,
      viewerUserId: input.viewerUserId,
    }),
  );

  let currentPlayerEntry =
    entries.find((entry) => entry.isCurrentPlayer) ?? null;

  if (
    !currentPlayerEntry &&
    viewerProfile &&
    viewerProfile.factories.length > 0
  ) {
    const playersAboveViewer = await prisma.playerProfile.count({
      where: {
        ...eligiblePlayerWhere,
        totalXp: {
          gt: viewerProfile.totalXp,
        },
      },
    });

    currentPlayerEntry = toRankingEntry({
      profile: viewerProfile,
      rankPosition: playersAboveViewer + 1,
      viewerUserId: input.viewerUserId,
    });
  }

  return {
    currentPlayerEntry,
    entries,
    page,
    pageSize,
    totalPages,
    totalPlayers,
  };
}

export function calculatePageRankPositions(input: {
  firstXpPlayerCount: number;
  playersAboveFirstXp: number;
  xpValues: bigint[];
}) {
  const firstXp = input.xpValues[0];

  if (firstXp === undefined) {
    return [];
  }

  const positions: number[] = [];
  let currentXp = firstXp;
  let currentRank = input.playersAboveFirstXp + 1;
  let currentGroupSizeSeen = 0;
  let isFirstGroup = true;

  for (const xp of input.xpValues) {
    if (xp !== currentXp) {
      currentRank += isFirstGroup
        ? input.firstXpPlayerCount
        : currentGroupSizeSeen;
      currentXp = xp;
      currentGroupSizeSeen = 0;
      isFirstGroup = false;
    }

    positions.push(currentRank);
    currentGroupSizeSeen += 1;
  }

  return positions;
}

function toRankingEntry(input: {
  profile: RankingProfileRecord;
  rankPosition: number;
  viewerUserId: string;
}): XpRankingEntry {
  return {
    displayName: input.profile.displayName,
    factories: input.profile.factories
      .map((factory) => ({
        currentLevel: factory.currentLevel,
        currentXp: factory.currentXp,
        id: factory.id,
        name: factory.name,
        productionLineCount: factory._count.productionLines,
        sectorKey: factory.sector.key,
        sectorName: pickTranslation(
          factory.sector.translations,
          factory.sector.key,
        ),
        sectorSortOrder: factory.sector.sortOrder,
      }))
      .sort(
        (first, second) =>
          first.sectorSortOrder - second.sectorSortOrder ||
          first.sectorKey.localeCompare(second.sectorKey),
      ),
    isCurrentPlayer: input.profile.userId === input.viewerUserId,
    playerProfileId: input.profile.id,
    rankPosition: input.rankPosition,
    totalXp: input.profile.totalXp.toString(),
  };
}

function pickTranslation(
  translations: Array<{ locale: string; name: string }>,
  fallback: string,
) {
  return (
    translations.find((translation) => translation.locale === locale)?.name ??
    translations.find((translation) => translation.locale === "en")?.name ??
    toTitle(fallback)
  );
}

function toTitle(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizePositiveInteger(value: number) {
  if (!Number.isFinite(value)) return 1;

  return Math.max(1, Math.trunc(value));
}

function clampPageSize(value: number) {
  if (!Number.isFinite(value)) return XP_RANKING_PAGE_SIZE;

  return Math.min(100, Math.max(1, Math.trunc(value)));
}
