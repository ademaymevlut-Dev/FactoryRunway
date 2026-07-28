import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

test("oyuncu fikirleri merkezi panel sisteminde sağ çekmece olarak açılır", () => {
  const registry = readSource("../game/panels/panel-registry.tsx")
  const overlay = readSource("../game/components/overlay-layer-manager.tsx")
  const header = readSource("../game/components/top-status-bar.tsx")

  assert.match(
    registry,
    /playerFeedback:\s*\{[\s\S]*?layout: "rightDrawer"[\s\S]*?<PlayerFeedbackPanel locale=\{snapshot\.locale\}/,
  )
  assert.match(overlay, /layout === "rightDrawer"/)
  assert.match(header, /openPanel\("playerFeedback"\)/)
  assert.doesNotMatch(header, /aria-label=\{copy\.messagesAria\}[\s\S]{0,250}disabled/)
})

test("panel TR ve EN metinlerle emoji, yenileme ve sayfalama sunar", () => {
  const panel = readSource("./components/player-feedback-panel.tsx")
  const copy = readSource("./player-feedback-copy.ts")

  assert.match(panel, /QUICK_EMOJIS/)
  assert.match(panel, /insertEmoji/)
  assert.match(panel, /createPlayerFeedbackAction/)
  assert.match(panel, /deletePlayerFeedbackAction/)
  assert.match(panel, /\/api\/player-feedback/)
  assert.match(panel, /nextCursor/)
  assert.match(copy, /Oyuncu Fikirleri|ORTAK FİKİR ALANI/)
  assert.match(copy, /SHARED IDEA BOARD/)
  assert.match(copy, /RATE_LIMITED/)
})

test("sunucu katmanı oyuncu yetkisi, soft delete, idempotency ve hız sınırı uygular", () => {
  const actions = readSource("./actions/player-feedback-actions.ts")
  const service = readSource("./services/player-feedback-service.ts")
  const route = readSource("../../app/(default-tr)/api/player-feedback/route.ts")

  assert.match(actions, /auth\.role !== USER_ROLES\.PLAYER/)
  assert.match(route, /auth\.role !== USER_ROLES\.PLAYER/)
  assert.match(service, /playerProfileId_clientRequestId/)
  assert.match(service, /PLAYER_FEEDBACK_MIN_INTERVAL_MS = 30_000/)
  assert.match(service, /PLAYER_FEEDBACK_MAX_POSTS_PER_HOUR = 10/)
  assert.match(service, /status: PlayerFeedbackStatus\.DELETED/)
  assert.match(service, /TransactionIsolationLevel\.Serializable/)
  assert.match(service, /error\.code === "P2034"/)
})

test("schema ayrı geri bildirim tablosu ve gerekli indeksleri içerir", () => {
  const schema = readSource("../../../prisma/schema.prisma")

  assert.match(schema, /enum PlayerFeedbackStatus/)
  assert.match(schema, /model PlayerFeedbackPost/)
  assert.match(schema, /@@unique\(\[playerProfileId, clientRequestId\]\)/)
  assert.match(schema, /@@index\(\[status, createdAt, id\]\)/)
  assert.match(schema, /@@map\("player_feedback_posts"\)/)
})

test("admin ekranı fikirleri filtreler, gizler ve yeniden yayınlar", () => {
  const page = readSource(
    "../../app/(default-tr)/admin/player-feedback/page.tsx",
  )
  const actions = readSource(
    "../../app/(default-tr)/admin/player-feedback/player-feedback-actions.ts",
  )
  const sidebar = readSource("../../app/(default-tr)/admin/admin-sidebar.tsx")

  assert.match(page, /getAdminPlayerFeedbackPosts/)
  assert.match(page, /PlayerFeedbackStatus\.HIDDEN/)
  assert.match(page, /PlayerFeedbackStatus\.PUBLISHED/)
  assert.match(actions, /requireAdminUser/)
  assert.match(actions, /moderatePlayerFeedbackPost/)
  assert.match(sidebar, /href: "\/admin\/player-feedback"/)
})
