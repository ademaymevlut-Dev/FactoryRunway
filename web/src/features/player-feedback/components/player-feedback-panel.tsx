"use client"

import {
  AlertCircle,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Send,
  SmilePlus,
  Trash2,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { numberLocale, type SupportedLocale } from "@/lib/i18n/locales"
import { cn } from "@/lib/utils"

import {
  createPlayerFeedbackAction,
  deletePlayerFeedbackAction,
} from "../actions/player-feedback-actions"
import { playerFeedbackCopy } from "../player-feedback-copy"
import {
  countPlayerFeedbackCharacters,
  PLAYER_FEEDBACK_MAX_CHARACTERS,
  validatePlayerFeedbackBody,
} from "../player-feedback-validation"
import type {
  PlayerFeedbackActionErrorCode,
  PlayerFeedbackPageView,
  PlayerFeedbackPostView,
} from "../types"

const QUICK_EMOJIS = [
  "👍",
  "💡",
  "🚀",
  "👏",
  "❤️",
  "😊",
  "🤔",
  "🔥",
  "✅",
  "🎮",
  "🏭",
  "✨",
] as const

type FeedResponse =
  | {
      feedback: PlayerFeedbackPageView
      ok: true
    }
  | {
      code?: PlayerFeedbackActionErrorCode
      ok: false
    }

export function PlayerFeedbackPanel({
  locale,
}: {
  locale: SupportedLocale
}) {
  const copy = playerFeedbackCopy[locale]
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const requestIdRef = useRef<string | null>(null)
  const [body, setBody] = useState("")
  const [entries, setEntries] = useState<PlayerFeedbackPostView[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [errorCode, setErrorCode] =
    useState<PlayerFeedbackActionErrorCode | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmitting, startSubmitting] = useTransition()
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null)
  const characterCount = countPlayerFeedbackCharacters(body)
  const bodyValidation = validatePlayerFeedbackBody(body)
  const canSubmit = bodyValidation.ok && !isSubmitting

  const loadFeedback = useCallback(
    async ({
      cursor,
      signal,
    }: {
      cursor?: string | null
      signal?: AbortSignal
    }) => {
      const search = cursor
        ? `?cursor=${encodeURIComponent(cursor)}`
        : ""
      const response = await fetch(`/api/player-feedback${search}`, {
        cache: "no-store",
        signal,
      })
      const data = (await response.json()) as FeedResponse

      if (!response.ok || !data.ok) {
        throw new FeedbackRequestError(
          data.ok ? "UNKNOWN_ERROR" : (data.code ?? "UNKNOWN_ERROR"),
        )
      }

      return data.feedback
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()

    void loadFeedback({ signal: controller.signal })
      .then((feedback) => {
        setEntries(feedback.entries)
        setNextCursor(feedback.nextCursor)
        setErrorCode(null)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return

        setErrorCode(toFeedbackErrorCode(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsInitialLoading(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [loadFeedback])

  function submitFeedback() {
    if (!canSubmit) return

    requestIdRef.current ??= crypto.randomUUID()
    setErrorCode(null)

    startSubmitting(async () => {
      const result = await createPlayerFeedbackAction({
        body,
        clientRequestId: requestIdRef.current!,
        locale,
      })

      if (!result.ok) {
        setErrorCode(result.code)
        return
      }

      setEntries((current) => [
        result.post,
        ...current.filter((entry) => entry.id !== result.post.id),
      ])
      setBody("")
      setErrorCode(null)
      requestIdRef.current = null
      textareaRef.current?.focus()
    })
  }

  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? body.length
    const end = textarea?.selectionEnd ?? body.length
    const nextBody = `${body.slice(0, start)}${emoji}${body.slice(end)}`
    const nextCursorPosition = start + emoji.length

    setBody(nextBody)
    requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(nextCursorPosition, nextCursorPosition)
    })
  }

  async function refreshFeedback() {
    setIsRefreshing(true)
    setErrorCode(null)

    try {
      const feedback = await loadFeedback({})
      setEntries(feedback.entries)
      setNextCursor(feedback.nextCursor)
    } catch (error) {
      setErrorCode(toFeedbackErrorCode(error))
    } finally {
      setIsRefreshing(false)
    }
  }

  async function loadMoreFeedback() {
    if (!nextCursor || isLoadingMore) return

    setIsLoadingMore(true)
    setErrorCode(null)

    try {
      const feedback = await loadFeedback({ cursor: nextCursor })
      setEntries((current) => mergeFeedbackEntries(current, feedback.entries))
      setNextCursor(feedback.nextCursor)
    } catch (error) {
      setErrorCode(toFeedbackErrorCode(error))
    } finally {
      setIsLoadingMore(false)
    }
  }

  async function deleteFeedback(postId: string) {
    if (!window.confirm(copy.confirmDelete)) return

    setDeletingPostId(postId)
    setErrorCode(null)

    try {
      const result = await deletePlayerFeedbackAction(postId)

      if (!result.ok) {
        setErrorCode(result.code)
        return
      }

      setEntries((current) =>
        current.filter((entry) => entry.id !== result.postId),
      )
    } catch {
      setErrorCode("UNKNOWN_ERROR")
    } finally {
      setDeletingPostId(null)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <section className="shrink-0 border-b border-border/70 pb-4">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-primary">
          {copy.betaLabel}
        </p>
        <p className="mt-1.5 max-w-lg text-sm leading-5 text-muted-foreground">
          {copy.subtitle}
        </p>

        <div className="mt-4 rounded-2xl border border-border/70 bg-card/70 p-3 shadow-sm">
          <textarea
            aria-invalid={
              characterCount > PLAYER_FEEDBACK_MAX_CHARACTERS || undefined
            }
            className="min-h-24 w-full resize-none bg-transparent text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground/75"
            onChange={(event) => {
              setBody(event.target.value)
              setErrorCode(null)
            }}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault()
                submitFeedback()
              }
            }}
            placeholder={copy.placeholder}
            ref={textareaRef}
            value={body}
          />

          <div className="mt-2 flex items-center justify-between gap-3 border-t border-border/60 pt-2">
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label={copy.emojiAria}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <SmilePlus />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="grid w-52 min-w-0 grid-cols-4 gap-1 rounded-2xl"
                >
                  {QUICK_EMOJIS.map((emoji) => (
                    <DropdownMenuItem
                      className="justify-center px-2 text-lg"
                      key={emoji}
                      onSelect={() => insertEmoji(emoji)}
                    >
                      {emoji}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <span
                className={cn(
                  "text-xs tabular-nums text-muted-foreground",
                  characterCount > PLAYER_FEEDBACK_MAX_CHARACTERS &&
                    "font-semibold text-destructive",
                )}
              >
                {copy.characterCount(
                  characterCount,
                  PLAYER_FEEDBACK_MAX_CHARACTERS,
                )}
              </span>
            </div>

            <Button
              disabled={!canSubmit}
              onClick={submitFeedback}
              size="sm"
              type="button"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Send />
              )}
              {copy.send}
            </Button>
          </div>
        </div>
      </section>

      <div className="flex min-h-0 flex-1 flex-col pt-3">
        <div className="mb-2 flex shrink-0 justify-end">
          <Button
            aria-label={copy.refresh}
            disabled={isRefreshing}
            onClick={() => void refreshFeedback()}
            size="sm"
            type="button"
            variant="ghost"
          >
            <RefreshCw className={cn(isRefreshing && "animate-spin")} />
            {copy.refresh}
          </Button>
        </div>

        {errorCode ? (
          <Alert className="mb-3 shrink-0" variant="destructive">
            <AlertCircle />
            <AlertDescription>{copy.errors[errorCode]}</AlertDescription>
          </Alert>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          {isInitialLoading ? (
            <div className="grid min-h-40 place-items-center text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                {copy.loading}
              </span>
            </div>
          ) : entries.length === 0 ? (
            <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-border p-7 text-center">
              <div>
                <MessageSquareText className="mx-auto size-8 text-primary/70" />
                <h3 className="mt-3 font-semibold text-foreground">
                  {copy.emptyTitle}
                </h3>
                <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
                  {copy.emptyBody}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pb-1">
              {entries.map((entry) => (
                <FeedbackPost
                  deleting={deletingPostId === entry.id}
                  entry={entry}
                  key={entry.id}
                  locale={locale}
                  onDelete={() => void deleteFeedback(entry.id)}
                />
              ))}

              {nextCursor ? (
                <Button
                  className="w-full"
                  disabled={isLoadingMore}
                  onClick={() => void loadMoreFeedback()}
                  type="button"
                  variant="outline"
                >
                  {isLoadingMore ? (
                    <Loader2 className="animate-spin" />
                  ) : null}
                  {copy.loadMore}
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FeedbackPost({
  deleting,
  entry,
  locale,
  onDelete,
}: {
  deleting: boolean
  entry: PlayerFeedbackPostView
  locale: SupportedLocale
  onDelete: () => void
}) {
  const copy = playerFeedbackCopy[locale]
  const date = new Intl.DateTimeFormat(numberLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(entry.createdAt))

  return (
    <article className="rounded-2xl border border-border/70 bg-card/65 p-3.5">
      <header className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-bold text-primary">
          {getInitials(entry.author.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <strong className="truncate text-sm text-foreground">
              {entry.author.displayName}
            </strong>
            {entry.isOwn ? (
              <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                {copy.ownPost}
              </span>
            ) : null}
          </div>
          <time
            className="text-[11px] text-muted-foreground"
            dateTime={entry.createdAt}
          >
            {date}
          </time>
        </div>

        {entry.isOwn ? (
          <Button
            aria-label={copy.deleteAria}
            disabled={deleting}
            onClick={onDelete}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            {deleting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Trash2 className="text-muted-foreground" />
            )}
          </Button>
        ) : null}
      </header>

      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">
        {entry.body}
      </p>
    </article>
  )
}

function mergeFeedbackEntries(
  current: PlayerFeedbackPostView[],
  incoming: PlayerFeedbackPostView[],
) {
  const seen = new Set(current.map((entry) => entry.id))

  return [
    ...current,
    ...incoming.filter((entry) => {
      if (seen.has(entry.id)) return false

      seen.add(entry.id)
      return true
    }),
  ]
}

function getInitials(displayName: string) {
  return displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? "")
    .join("")
    .toLocaleUpperCase()
}

class FeedbackRequestError extends Error {
  readonly code: PlayerFeedbackActionErrorCode

  constructor(code: PlayerFeedbackActionErrorCode) {
    super(code)
    this.code = code
  }
}

function toFeedbackErrorCode(error: unknown): PlayerFeedbackActionErrorCode {
  return error instanceof FeedbackRequestError ? error.code : "UNKNOWN_ERROR"
}
