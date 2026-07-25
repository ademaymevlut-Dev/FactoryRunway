import type { SupportedLocale } from "@/lib/i18n/locales";

type ClaimTaskRewardErrorCode =
  | "INVALID_REQUEST"
  | "NOT_COMPLETED"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "UNKNOWN_ERROR";

export const tasksCopy = {
  tr: {
    panel: {
      title: "Fabrika gündemi",
      subtitle: "Bir sonraki net adım",
      completedBadge: (count: number) => `Tamamlanan ${count}`,
      previousAria: "Önceki görev",
      nextAria: "Sonraki görev",
      singlePosition: "Görev",
      emptyTitle: "Açık görev yok",
      emptyCompletedCount: (count: number) => `Tamamlanan görev sayısı: ${count}`,
    },
    card: {
      ready: "Hazır",
      completedFallback:
        "Tebrikler, görev tamamlandı. Ödülün alınmaya hazır.",
      progress: "İlerleme",
      progressAria: (title: string) => `${title} ilerlemesi`,
      reward: "Ödül",
      claimPending: "Alınıyor...",
      claim: "Ödülü al",
      waiting: "Görev bekliyor",
    },
    errors: {
      INVALID_REQUEST: "Görev kaydı doğrulanamadı.",
      NOT_COMPLETED: "Görev henüz tamamlanmadı.",
      NOT_FOUND: "Görev bulunamadı.",
      UNAUTHORIZED: "Oturum bulunamadı.",
      UNKNOWN_ERROR: "Görev ödülü alınamadı.",
    },
  },
  en: {
    panel: {
      title: "Factory agenda",
      subtitle: "The next clear step",
      completedBadge: (count: number) => `Completed ${count}`,
      previousAria: "Previous task",
      nextAria: "Next task",
      singlePosition: "Task",
      emptyTitle: "No open tasks",
      emptyCompletedCount: (count: number) => `Completed tasks: ${count}`,
    },
    card: {
      ready: "Ready",
      completedFallback:
        "Nice work, the task is complete. Your reward is ready to claim.",
      progress: "Progress",
      progressAria: (title: string) => `${title} progress`,
      reward: "Reward",
      claimPending: "Claiming...",
      claim: "Claim reward",
      waiting: "Task waiting",
    },
    errors: {
      INVALID_REQUEST: "The task record could not be verified.",
      NOT_COMPLETED: "The task is not complete yet.",
      NOT_FOUND: "Task not found.",
      UNAUTHORIZED: "Session not found.",
      UNKNOWN_ERROR: "The task reward could not be claimed.",
    },
  },
} as const satisfies Record<
  SupportedLocale,
  {
    panel: {
      title: string;
      subtitle: string;
      completedBadge: (count: number) => string;
      previousAria: string;
      nextAria: string;
      singlePosition: string;
      emptyTitle: string;
      emptyCompletedCount: (count: number) => string;
    };
    card: {
      ready: string;
      completedFallback: string;
      progress: string;
      progressAria: (title: string) => string;
      reward: string;
      claimPending: string;
      claim: string;
      waiting: string;
    };
    errors: Record<ClaimTaskRewardErrorCode, string>;
  }
>;

export type TaskCardCopy = (typeof tasksCopy)[SupportedLocale]["card"];
