import type { ProductionGrade } from "@/generated/prisma/enums";
import type { SupportedLocale } from "@/lib/i18n/locales";

type RankingActionErrorCode =
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "UNKNOWN_ERROR";

export const rankingCopy = {
  tr: {
    actions: {
      rankingErrors: {
        INVALID_REQUEST: "Ranking sayfası geçersiz.",
        NOT_FOUND: "Ranking kaydı bulunamadı.",
        UNAUTHORIZED: "Ranking listesini görmek için oturum açmalısın.",
        UNKNOWN_ERROR: "Ranking listesi şu anda yüklenemedi.",
      },
      visitErrors: {
        INVALID_REQUEST: "Fabrika bilgisi doğrulanamadı.",
        NOT_FOUND: "Ziyaret edilecek aktif fabrika bulunamadı.",
        UNAUTHORIZED: "Fabrika ziyareti için oturum açmalısın.",
        UNKNOWN_ERROR: "Fabrika görünümü şu anda yüklenemedi.",
      },
    },
    panel: {
      eyebrow: "PLAYER RANKING",
      title: "Factory Runway liderleri",
      playerCount: (count: string) => `${count} oyuncu`,
      totalXp: "Toplam XP",
      retry: "Yeniden dene",
      emptyTitle: "Ranking henüz oluşmadı",
      emptyBody: "Aktif fabrikası bulunan oyuncular burada listelenecek.",
      pageStatus: (page: number, totalPages: number) =>
        `${page}. sayfa / ${totalPages}`,
      loading: "Ranking yükleniyor",
      previous: "Önceki",
      next: "Sonraki",
      table: {
        gameDay: "Oyun Günü",
        player: "Oyuncu",
        rank: "Sıra",
        totalTurnover: "Toplam Ciro",
        totalXp: "Toplam XP",
        visit: "Ziyaret",
        showcaseFactory: "Vitrin Fabrikası",
      },
      you: "Sen",
      visitFactory: "Ziyaret Et",
      yourRank: "Senin sıran",
    },
    visit: {
      back: "Ranking’e dön",
      fallbackTitle: "Fabrika ziyareti",
      factoriesTitle: "Oyuncu Fabrikaları",
      loading: "Fabrika görünümü yükleniyor",
      rankFallback: "Ranking",
      totalXpFallback: "— XP",
      levelShort: (level: number) => `Lv.${level}`,
      level: (level: number) => `Lv. ${level}`,
      productionLineCount: (count: number) => `${count} hat`,
      metrics: {
        factory: "Fabrika",
        level: "Seviye",
        operatingStage: "İşletme Aşaması",
        productionLines: "Üretim Hatları",
        sector: "Sektör",
      },
    },
    map: {
      emptyTitle: "Kurulu üretim hattı bulunmuyor",
      emptyBody: "Bu fabrikanın vitrininde henüz gösterilecek bir hat yok.",
      ariaLabel: (factoryName: string) =>
        `${factoryName} salt okunur fabrika haritası`,
      zoomOutAria: "Haritayı uzaklaştır",
      zoomOutTitle: "Uzaklaştır",
      zoomInAria: "Haritayı yakınlaştır",
      zoomInTitle: "Yakınlaştır",
      resetAria: "Harita görünümünü sıfırla",
      resetTitle: "Görünümü sıfırla",
      hint: "Salt okunur fabrika vitrini · Sürükleyerek gez",
      lineCount: (count: number) => `${count} hat`,
      installed: "Kurulu",
      technology: (gradeLabel: string) => `${gradeLabel} teknoloji`,
    },
    service: {
      lineTitle: (departmentName: string, lineNumber: number) =>
        `${departmentName} Hattı ${lineNumber}`,
    },
    grades: {
      INDUSTRIAL: "Industrial",
      PRECISION: "Precision",
      SMART: "Smart",
      WORKSHOP: "Workshop",
    },
  },
  en: {
    actions: {
      rankingErrors: {
        INVALID_REQUEST: "Ranking page is invalid.",
        NOT_FOUND: "Ranking record was not found.",
        UNAUTHORIZED: "Sign in to view the ranking list.",
        UNKNOWN_ERROR: "The ranking list could not be loaded right now.",
      },
      visitErrors: {
        INVALID_REQUEST: "Factory information could not be verified.",
        NOT_FOUND: "No active factory was found for this visit.",
        UNAUTHORIZED: "Sign in to visit a factory.",
        UNKNOWN_ERROR: "The factory view could not be loaded right now.",
      },
    },
    panel: {
      eyebrow: "PLAYER RANKING",
      title: "Factory Runway leaders",
      playerCount: (count: string) => `${count} players`,
      totalXp: "Total XP",
      retry: "Retry",
      emptyTitle: "Ranking is not ready yet",
      emptyBody: "Players with active factories will appear here.",
      pageStatus: (page: number, totalPages: number) =>
        `Page ${page} / ${totalPages}`,
      loading: "Loading ranking",
      previous: "Previous",
      next: "Next",
      table: {
        gameDay: "Game Day",
        player: "Player",
        rank: "Rank",
        totalTurnover: "Total Turnover",
        totalXp: "Total XP",
        visit: "Visit",
        showcaseFactory: "Showcase Factory",
      },
      you: "You",
      visitFactory: "Visit",
      yourRank: "Your rank",
    },
    visit: {
      back: "Back to ranking",
      fallbackTitle: "Factory visit",
      factoriesTitle: "Player Factories",
      loading: "Loading factory view",
      rankFallback: "Ranking",
      totalXpFallback: "— XP",
      levelShort: (level: number) => `Lv.${level}`,
      level: (level: number) => `Lv. ${level}`,
      productionLineCount: (count: number) => `${count} lines`,
      metrics: {
        factory: "Factory",
        level: "Level",
        operatingStage: "Operating Stage",
        productionLines: "Production Lines",
        sector: "Sector",
      },
    },
    map: {
      emptyTitle: "No installed production lines",
      emptyBody: "There are no lines to show in this factory showcase yet.",
      ariaLabel: (factoryName: string) =>
        `${factoryName} read-only factory map`,
      zoomOutAria: "Zoom map out",
      zoomOutTitle: "Zoom out",
      zoomInAria: "Zoom map in",
      zoomInTitle: "Zoom in",
      resetAria: "Reset map view",
      resetTitle: "Reset view",
      hint: "Read-only factory showcase · Drag to explore",
      lineCount: (count: number) => `${count} lines`,
      installed: "Installed",
      technology: (gradeLabel: string) => `${gradeLabel} technology`,
    },
    service: {
      lineTitle: (departmentName: string, lineNumber: number) =>
        `${departmentName} Line ${lineNumber}`,
    },
    grades: {
      INDUSTRIAL: "Industrial",
      PRECISION: "Precision",
      SMART: "Smart",
      WORKSHOP: "Workshop",
    },
  },
} as const satisfies Record<
  SupportedLocale,
  {
    actions: {
      rankingErrors: Record<RankingActionErrorCode, string>;
      visitErrors: Record<RankingActionErrorCode, string>;
    };
    panel: {
      eyebrow: string;
      title: string;
      playerCount: (count: string) => string;
      totalXp: string;
      retry: string;
      emptyTitle: string;
      emptyBody: string;
      pageStatus: (page: number, totalPages: number) => string;
      loading: string;
      previous: string;
      next: string;
      table: {
        gameDay: string;
        player: string;
        rank: string;
        totalTurnover: string;
        totalXp: string;
        visit: string;
        showcaseFactory: string;
      };
      you: string;
      visitFactory: string;
      yourRank: string;
    };
    visit: {
      back: string;
      fallbackTitle: string;
      factoriesTitle: string;
      loading: string;
      rankFallback: string;
      totalXpFallback: string;
      levelShort: (level: number) => string;
      level: (level: number) => string;
      productionLineCount: (count: number) => string;
      metrics: {
        factory: string;
        level: string;
        operatingStage: string;
        productionLines: string;
        sector: string;
      };
    };
    map: {
      emptyTitle: string;
      emptyBody: string;
      ariaLabel: (factoryName: string) => string;
      zoomOutAria: string;
      zoomOutTitle: string;
      zoomInAria: string;
      zoomInTitle: string;
      resetAria: string;
      resetTitle: string;
      hint: string;
      lineCount: (count: number) => string;
      installed: string;
      technology: (gradeLabel: string) => string;
    };
    service: {
      lineTitle: (departmentName: string, lineNumber: number) => string;
    };
    grades: Record<ProductionGrade, string>;
  }
>;

export type RankingCopy = (typeof rankingCopy)[SupportedLocale];
