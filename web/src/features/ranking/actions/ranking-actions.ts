"use server";

import { getCurrentUser } from "@/lib/auth/session";

import { getFactoryVisitView } from "../services/factory-visit-service";
import {
  getXpRankingView,
  XP_RANKING_PAGE_SIZE,
} from "../services/xp-ranking-service";
import type { FactoryVisitView, XpRankingView } from "../types";

type RankingActionError = {
  code: "INVALID_REQUEST" | "NOT_FOUND" | "UNAUTHORIZED" | "UNKNOWN_ERROR";
  message: string;
  ok: false;
};

export type GetXpRankingActionResult =
  | {
      ok: true;
      ranking: XpRankingView;
    }
  | RankingActionError;

export type GetFactoryVisitActionResult =
  | {
      factoryVisit: FactoryVisitView;
      ok: true;
    }
  | RankingActionError;

export async function getXpRankingAction(
  page = 1,
): Promise<GetXpRankingActionResult> {
  const auth = await getCurrentUser();

  if (!auth) {
    return {
      code: "UNAUTHORIZED",
      message: "Ranking listesini görmek için oturum açmalısın.",
      ok: false,
    };
  }

  if (!Number.isFinite(page) || page < 1 || page > 10_000) {
    return {
      code: "INVALID_REQUEST",
      message: "Ranking sayfası geçersiz.",
      ok: false,
    };
  }

  try {
    const ranking = await getXpRankingView({
      page: Math.trunc(page),
      pageSize: XP_RANKING_PAGE_SIZE,
      viewerUserId: auth.id,
    });

    return {
      ok: true,
      ranking,
    };
  } catch (error) {
    console.error("XP ranking could not be loaded.", error);

    return {
      code: "UNKNOWN_ERROR",
      message: "Ranking listesi şu anda yüklenemedi.",
      ok: false,
    };
  }
}

export async function getFactoryVisitAction(
  factoryId: string,
): Promise<GetFactoryVisitActionResult> {
  const auth = await getCurrentUser();

  if (!auth) {
    return {
      code: "UNAUTHORIZED",
      message: "Fabrika ziyareti için oturum açmalısın.",
      ok: false,
    };
  }

  const normalizedFactoryId = factoryId.trim();

  if (!normalizedFactoryId || normalizedFactoryId.length > 200) {
    return {
      code: "INVALID_REQUEST",
      message: "Fabrika bilgisi doğrulanamadı.",
      ok: false,
    };
  }

  try {
    const factoryVisit = await getFactoryVisitView({
      factoryId: normalizedFactoryId,
    });

    if (!factoryVisit) {
      return {
        code: "NOT_FOUND",
        message: "Ziyaret edilecek aktif fabrika bulunamadı.",
        ok: false,
      };
    }

    return {
      factoryVisit,
      ok: true,
    };
  } catch (error) {
    console.error("Factory visit could not be loaded.", error);

    return {
      code: "UNKNOWN_ERROR",
      message: "Fabrika görünümü şu anda yüklenemedi.",
      ok: false,
    };
  }
}
