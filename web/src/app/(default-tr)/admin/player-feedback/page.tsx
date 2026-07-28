import Link from "next/link"
import { Eye, EyeOff, MessageSquareText, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlayerFeedbackStatus } from "@/generated/prisma/enums"
import { getAdminPlayerFeedbackPosts } from "@/features/player-feedback/services/player-feedback-service"

import { AdminForm } from "../admin-form"
import { moderatePlayerFeedbackAction } from "./player-feedback-actions"

type PageProps = {
  searchParams: Promise<{
    status?: string
  }>
}

const statusFilters = [
  { label: "Tümü", value: null },
  { label: "Yayında", value: PlayerFeedbackStatus.PUBLISHED },
  { label: "Gizli", value: PlayerFeedbackStatus.HIDDEN },
  { label: "Oyuncu kaldırdı", value: PlayerFeedbackStatus.DELETED },
] as const

export default async function PlayerFeedbackAdminPage({
  searchParams,
}: PageProps) {
  const { status: rawStatus } = await searchParams
  const status = parseStatus(rawStatus)
  const feedback = await getAdminPlayerFeedbackPosts({
    pageSize: 100,
    status,
  })
  const publishedCount = feedback.entries.filter(
    (entry) => entry.status === PlayerFeedbackStatus.PUBLISHED,
  ).length

  return (
    <div className="grid gap-4">
      <header className="game-topbar">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-primary">
            Beta Geri Bildirimi
          </p>
          <h1 className="text-2xl font-semibold">Oyuncu Fikirleri</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Oyuncuların ortak fikir alanında paylaştığı mesajları inceleyin.
            Uygun olmayan içerikleri gizleyebilir ve tekrar yayınlayabilirsiniz.
          </p>
        </div>
        <Badge variant="secondary">
          {feedback.entries.length} kayıt · {publishedCount} yayında
        </Badge>
      </header>

      <nav
        aria-label="Fikir durumu filtreleri"
        className="flex flex-wrap gap-2 rounded-xl border border-border bg-card/60 p-2"
      >
        {statusFilters.map((filter) => {
          const isActive = status === filter.value
          const href = filter.value
            ? `/admin/player-feedback?status=${filter.value}`
            : "/admin/player-feedback"

          return (
            <Button
              asChild
              key={filter.label}
              size="sm"
              variant={isActive ? "secondary" : "ghost"}
            >
              <Link aria-current={isActive ? "page" : undefined} href={href}>
                {filter.label}
              </Link>
            </Button>
          )
        })}
      </nav>

      {feedback.entries.length === 0 ? (
        <section className="game-card grid min-h-64 place-items-center p-8 text-center">
          <div>
            <MessageSquareText className="mx-auto size-10 text-primary/65" />
            <h2 className="mt-3 text-lg font-semibold">
              Bu filtrede fikir bulunmuyor
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Oyuncuların yeni paylaşımları burada görünecek.
            </p>
          </div>
        </section>
      ) : (
        <section className="grid gap-3">
          {feedback.entries.map((entry) => (
            <article className="game-card p-4" key={entry.id}>
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">
                      {entry.author.displayName}
                    </h2>
                    <FeedbackStatusBadge status={entry.status} />
                    <Badge variant="outline">
                      {entry.locale.toLocaleUpperCase("tr-TR")}
                    </Badge>
                  </div>
                  <time
                    className="mt-1 block text-xs text-muted-foreground"
                    dateTime={entry.createdAt}
                  >
                    {formatAdminDate(entry.createdAt)}
                  </time>
                </div>

                {entry.status === PlayerFeedbackStatus.PUBLISHED ? (
                  <ModerationForm
                    actionLabel="Gizle"
                    icon={<EyeOff />}
                    postId={entry.id}
                    status={PlayerFeedbackStatus.HIDDEN}
                  />
                ) : entry.status === PlayerFeedbackStatus.HIDDEN ? (
                  <ModerationForm
                    actionLabel="Tekrar yayınla"
                    icon={<Eye />}
                    postId={entry.id}
                    status={PlayerFeedbackStatus.PUBLISHED}
                  />
                ) : null}
              </header>

              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">
                {entry.body}
              </p>

              {entry.moderatedAt ? (
                <footer className="mt-4 flex items-start gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    Son moderasyon: {formatAdminDate(entry.moderatedAt)}
                    {entry.moderationNote
                      ? ` · Not: ${entry.moderationNote}`
                      : ""}
                  </span>
                </footer>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </div>
  )
}

function ModerationForm({
  actionLabel,
  icon,
  postId,
  status,
}: {
  actionLabel: string
  icon: React.ReactNode
  postId: string
  status:
    | typeof PlayerFeedbackStatus.HIDDEN
    | typeof PlayerFeedbackStatus.PUBLISHED
}) {
  return (
    <AdminForm
      action={moderatePlayerFeedbackAction}
      className="grid justify-items-end gap-2"
    >
      <div className="flex gap-2">
      <input name="postId" type="hidden" value={postId} />
      <input name="status" type="hidden" value={status} />
      <input
        aria-label="Moderasyon notu"
        className="h-8 w-44 rounded-full border border-border bg-background px-3 text-xs outline-none transition focus:border-primary"
        maxLength={500}
        name="moderationNote"
        placeholder="Not (isteğe bağlı)"
        type="text"
      />
      <Button
        size="sm"
        type="submit"
        variant={
          status === PlayerFeedbackStatus.HIDDEN ? "destructive" : "outline"
        }
      >
        {icon}
        {actionLabel}
      </Button>
      </div>
    </AdminForm>
  )
}

function FeedbackStatusBadge({
  status,
}: {
  status: PlayerFeedbackStatus
}) {
  if (status === PlayerFeedbackStatus.PUBLISHED) {
    return <Badge>Yayında</Badge>
  }

  if (status === PlayerFeedbackStatus.HIDDEN) {
    return <Badge variant="destructive">Gizli</Badge>
  }

  return <Badge variant="secondary">Oyuncu kaldırdı</Badge>
}

function parseStatus(value: string | undefined) {
  if (value === PlayerFeedbackStatus.PUBLISHED) {
    return PlayerFeedbackStatus.PUBLISHED
  }

  if (value === PlayerFeedbackStatus.HIDDEN) {
    return PlayerFeedbackStatus.HIDDEN
  }

  if (value === PlayerFeedbackStatus.DELETED) {
    return PlayerFeedbackStatus.DELETED
  }

  return null
}

function formatAdminDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
