import type { SupportedLocale } from "@/lib/i18n/locales"

import type { PlayerFeedbackActionErrorCode } from "./types"

type PlayerFeedbackCopy = {
  betaLabel: string
  characterCount: (count: number, maximum: number) => string
  confirmDelete: string
  deleteAria: string
  emptyBody: string
  emptyTitle: string
  emojiAria: string
  errors: Record<PlayerFeedbackActionErrorCode, string>
  loadMore: string
  loading: string
  ownPost: string
  placeholder: string
  refresh: string
  send: string
  subtitle: string
}

export const playerFeedbackCopy = {
  tr: {
    betaLabel: "BETA · ORTAK FİKİR ALANI",
    characterCount: (count, maximum) => `${count}/${maximum} karakter`,
    confirmDelete: "Bu fikri kaldırmak istediğinize emin misiniz?",
    deleteAria: "Fikrimi kaldır",
    emptyBody:
      "İlk fikri siz paylaşın. Öneriler, beta sürümünü birlikte geliştirmemize yardımcı olur.",
    emptyTitle: "Henüz paylaşılmış fikir yok",
    emojiAria: "Emoji ekle",
    errors: {
      INVALID_REQUEST: "Gönderilen bilgiler geçerli değil.",
      MESSAGE_TOO_LONG: "Mesaj en fazla 600 karakter olabilir.",
      MESSAGE_TOO_SHORT: "Mesaj en az 2 karakter olmalıdır.",
      NOT_FOUND: "Bu fikir artık bulunamıyor.",
      RATE_LIMITED:
        "Çok hızlı gönderim yaptınız. Lütfen kısa bir süre sonra tekrar deneyin.",
      UNAUTHORIZED: "Oturumunuz sona ermiş olabilir. Lütfen tekrar giriş yapın.",
      UNKNOWN_ERROR: "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
    },
    loadMore: "Daha fazlasını yükle",
    loading: "Fikirler yükleniyor…",
    ownPost: "Sen",
    placeholder:
      "Factory Runway için fikrini, önerini veya karşılaştığın bir sorunu yaz…",
    refresh: "Yenile",
    send: "Paylaş",
    subtitle:
      "Beta sürümüyle ilgili fikirlerini paylaş; tüm oyuncuların önerilerini burada birlikte görelim.",
  },
  en: {
    betaLabel: "BETA · SHARED IDEA BOARD",
    characterCount: (count, maximum) => `${count}/${maximum} characters`,
    confirmDelete: "Are you sure you want to remove this idea?",
    deleteAria: "Remove my idea",
    emptyBody:
      "Share the first idea. Your suggestions help us improve the beta together.",
    emptyTitle: "No ideas have been shared yet",
    emojiAria: "Add emoji",
    errors: {
      INVALID_REQUEST: "The submitted information is not valid.",
      MESSAGE_TOO_LONG: "Your message can contain up to 600 characters.",
      MESSAGE_TOO_SHORT: "Your message must contain at least 2 characters.",
      NOT_FOUND: "This idea is no longer available.",
      RATE_LIMITED:
        "You are posting too quickly. Please wait a moment and try again.",
      UNAUTHORIZED: "Your session may have expired. Please sign in again.",
      UNKNOWN_ERROR: "The action could not be completed. Please try again.",
    },
    loadMore: "Load more",
    loading: "Loading ideas…",
    ownPost: "You",
    placeholder:
      "Share an idea, suggestion, or issue you encountered in Factory Runway…",
    refresh: "Refresh",
    send: "Share",
    subtitle:
      "Share your thoughts about the beta and see ideas from the player community in one place.",
  },
} satisfies Record<SupportedLocale, PlayerFeedbackCopy>
