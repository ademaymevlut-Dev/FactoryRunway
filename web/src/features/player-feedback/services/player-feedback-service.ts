import {
  PlayerFeedbackStatus,
  Prisma,
} from "@/generated/prisma/client"
import { getPrisma } from "@/lib/db"
import {
  normalizeLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales"

import {
  isValidPlayerFeedbackClientRequestId,
  validatePlayerFeedbackBody,
} from "../player-feedback-validation"
import type {
  AdminPlayerFeedbackPostView,
  PlayerFeedbackActionErrorCode,
  PlayerFeedbackPageView,
  PlayerFeedbackPostView,
} from "../types"

export const PLAYER_FEEDBACK_PAGE_SIZE = 30
export const PLAYER_FEEDBACK_MIN_INTERVAL_MS = 30_000
export const PLAYER_FEEDBACK_MAX_POSTS_PER_HOUR = 10

const feedbackPostSelect = {
  body: true,
  createdAt: true,
  deletedAt: true,
  id: true,
  locale: true,
  moderatedAt: true,
  moderationNote: true,
  playerProfile: {
    select: {
      displayName: true,
      id: true,
      userId: true,
    },
  },
  status: true,
} satisfies Prisma.PlayerFeedbackPostSelect

type FeedbackPostRecord = Prisma.PlayerFeedbackPostGetPayload<{
  select: typeof feedbackPostSelect
}>

type FeedbackTransaction = Prisma.TransactionClient

export class PlayerFeedbackServiceError extends Error {
  readonly code: PlayerFeedbackActionErrorCode

  constructor(code: PlayerFeedbackActionErrorCode) {
    super(code)
    this.name = "PlayerFeedbackServiceError"
    this.code = code
  }
}

export async function getPlayerFeedbackPage(input: {
  cursor?: string | null
  pageSize?: number
  viewerUserId: string
}): Promise<PlayerFeedbackPageView> {
  const prisma = getPrisma()
  const pageSize = clampPageSize(input.pageSize)
  const cursor = normalizeOptionalId(input.cursor)
  const records = await prisma.playerFeedbackPost.findMany({
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: feedbackPostSelect,
    take: pageSize + 1,
    where: {
      status: PlayerFeedbackStatus.PUBLISHED,
    },
  })
  const hasMore = records.length > pageSize
  const visibleRecords = hasMore ? records.slice(0, pageSize) : records

  return {
    entries: visibleRecords.map((record) =>
      toPlayerFeedbackPostView(record, input.viewerUserId),
    ),
    nextCursor: hasMore
      ? visibleRecords[visibleRecords.length - 1]?.id ?? null
      : null,
  }
}

export async function createPlayerFeedbackPost(input: {
  body: string
  clientRequestId: string
  locale?: SupportedLocale | string
  now?: Date
  userId: string
}): Promise<PlayerFeedbackPostView> {
  const validation = validatePlayerFeedbackBody(input.body)

  if (!validation.ok) {
    throw new PlayerFeedbackServiceError(validation.code)
  }

  const clientRequestId = input.clientRequestId.trim()

  if (!isValidPlayerFeedbackClientRequestId(clientRequestId)) {
    throw new PlayerFeedbackServiceError("INVALID_REQUEST")
  }

  const prisma = getPrisma()
  const now = input.now ?? new Date()
  const locale = normalizeLocale(input.locale)

  return runSerializableFeedbackTransaction(prisma, async (tx) => {
      const playerProfile = await tx.playerProfile.findUnique({
        select: {
          displayName: true,
          id: true,
          userId: true,
        },
        where: {
          userId: input.userId,
        },
      })

      if (!playerProfile) {
        throw new PlayerFeedbackServiceError("UNAUTHORIZED")
      }

      const existingPost = await tx.playerFeedbackPost.findUnique({
        select: feedbackPostSelect,
        where: {
          playerProfileId_clientRequestId: {
            clientRequestId,
            playerProfileId: playerProfile.id,
          },
        },
      })

      if (existingPost) {
        return toPlayerFeedbackPostView(existingPost, input.userId)
      }

      await assertPlayerFeedbackRateLimit({
        now,
        playerProfileId: playerProfile.id,
        tx,
      })

      const post = await tx.playerFeedbackPost.create({
        data: {
          body: validation.body,
          clientRequestId,
          locale,
          playerProfileId: playerProfile.id,
        },
        select: feedbackPostSelect,
      })

      return toPlayerFeedbackPostView(post, input.userId)
  })
}

export async function deleteOwnPlayerFeedbackPost(input: {
  postId: string
  userId: string
}) {
  const postId = normalizeRequiredId(input.postId)
  const prisma = getPrisma()
  const result = await prisma.playerFeedbackPost.updateMany({
    data: {
      deletedAt: new Date(),
      status: PlayerFeedbackStatus.DELETED,
    },
    where: {
      id: postId,
      playerProfile: {
        userId: input.userId,
      },
      status: PlayerFeedbackStatus.PUBLISHED,
    },
  })

  if (result.count <= 0) {
    throw new PlayerFeedbackServiceError("NOT_FOUND")
  }
}

export async function getAdminPlayerFeedbackPosts(input: {
  cursor?: string | null
  pageSize?: number
  status?: PlayerFeedbackStatus | null
}): Promise<{
  entries: AdminPlayerFeedbackPostView[]
  nextCursor: string | null
}> {
  const prisma = getPrisma()
  const pageSize = clampPageSize(input.pageSize ?? 100, 100)
  const cursor = normalizeOptionalId(input.cursor)
  const records = await prisma.playerFeedbackPost.findMany({
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: feedbackPostSelect,
    take: pageSize + 1,
    where: input.status
      ? {
          status: input.status,
        }
      : undefined,
  })
  const hasMore = records.length > pageSize
  const visibleRecords = hasMore ? records.slice(0, pageSize) : records

  return {
    entries: visibleRecords.map(toAdminPlayerFeedbackPostView),
    nextCursor: hasMore
      ? visibleRecords[visibleRecords.length - 1]?.id ?? null
      : null,
  }
}

export async function moderatePlayerFeedbackPost(input: {
  adminUserId: string
  moderationNote?: string | null
  postId: string
  status: typeof PlayerFeedbackStatus.HIDDEN | typeof PlayerFeedbackStatus.PUBLISHED
}) {
  const prisma = getPrisma()
  const postId = normalizeRequiredId(input.postId)
  const moderationNote = input.moderationNote?.trim().slice(0, 500) || null

  const currentStatus =
    input.status === PlayerFeedbackStatus.HIDDEN
      ? PlayerFeedbackStatus.PUBLISHED
      : PlayerFeedbackStatus.HIDDEN
  const result = await prisma.playerFeedbackPost.updateMany({
    data: {
      moderatedAt: new Date(),
      moderatedByUserId: input.adminUserId,
      moderationNote,
      status: input.status,
    },
    where: {
      id: postId,
      status: currentStatus,
    },
  })

  if (result.count <= 0) {
    throw new PlayerFeedbackServiceError("NOT_FOUND")
  }
}

async function assertPlayerFeedbackRateLimit(input: {
  now: Date
  playerProfileId: string
  tx: FeedbackTransaction
}) {
  const hourAgo = new Date(input.now.getTime() - 60 * 60 * 1_000)
  const [latestPost, hourlyPostCount] = await Promise.all([
    input.tx.playerFeedbackPost.findFirst({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        createdAt: true,
      },
      where: {
        playerProfileId: input.playerProfileId,
      },
    }),
    input.tx.playerFeedbackPost.count({
      where: {
        createdAt: {
          gte: hourAgo,
        },
        playerProfileId: input.playerProfileId,
      },
    }),
  ])

  if (
    latestPost &&
    input.now.getTime() - latestPost.createdAt.getTime() <
      PLAYER_FEEDBACK_MIN_INTERVAL_MS
  ) {
    throw new PlayerFeedbackServiceError("RATE_LIMITED")
  }

  if (hourlyPostCount >= PLAYER_FEEDBACK_MAX_POSTS_PER_HOUR) {
    throw new PlayerFeedbackServiceError("RATE_LIMITED")
  }
}

function toPlayerFeedbackPostView(
  record: FeedbackPostRecord,
  viewerUserId: string,
): PlayerFeedbackPostView {
  return {
    author: {
      displayName: record.playerProfile.displayName,
      playerProfileId: record.playerProfile.id,
    },
    body: record.body,
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    isOwn: record.playerProfile.userId === viewerUserId,
    locale: record.locale,
  }
}

function toAdminPlayerFeedbackPostView(
  record: FeedbackPostRecord,
): AdminPlayerFeedbackPostView {
  return {
    ...toPlayerFeedbackPostView(record, ""),
    deletedAt: record.deletedAt?.toISOString() ?? null,
    moderatedAt: record.moderatedAt?.toISOString() ?? null,
    moderationNote: record.moderationNote,
    status: record.status,
  }
}

function clampPageSize(value = PLAYER_FEEDBACK_PAGE_SIZE, maximum = 50) {
  if (!Number.isFinite(value)) return PLAYER_FEEDBACK_PAGE_SIZE

  return Math.min(maximum, Math.max(1, Math.trunc(value)))
}

function normalizeOptionalId(value: string | null | undefined) {
  if (!value) return null

  const normalized = value.trim()

  if (!normalized || normalized.length > 200) {
    throw new PlayerFeedbackServiceError("INVALID_REQUEST")
  }

  return normalized
}

function normalizeRequiredId(value: string) {
  const normalized = normalizeOptionalId(value)

  if (!normalized) {
    throw new PlayerFeedbackServiceError("INVALID_REQUEST")
  }

  return normalized
}

async function runSerializableFeedbackTransaction<T>(
  prisma: ReturnType<typeof getPrisma>,
  operation: (tx: FeedbackTransaction) => Promise<T>,
) {
  const maxAttempts = 3

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 15_000,
      })
    } catch (error) {
      const canRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < maxAttempts

      if (!canRetry) {
        throw error
      }
    }
  }

  throw new Error("Player feedback transaction retry limit exceeded.")
}
