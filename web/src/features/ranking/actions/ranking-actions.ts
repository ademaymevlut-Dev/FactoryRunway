"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { normalizeLocale, type SupportedLocale } from "@/lib/i18n/locales";

import { rankingCopy } from "../ranking-copy";
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
  localeInput?: SupportedLocale,
): Promise<GetXpRankingActionResult> {
  const auth = await getCurrentUser();
  const locale = normalizeLocale(localeInput);
  const errors = rankingCopy[locale].actions.rankingErrors;

  if (!auth) {
    return {
      code: "UNAUTHORIZED",
      message: errors.UNAUTHORIZED,
      ok: false,
    };
  }

  if (!Number.isFinite(page) || page < 1 || page > 10_000) {
    return {
      code: "INVALID_REQUEST",
      message: errors.INVALID_REQUEST,
      ok: false,
    };
  }

  try {
    const ranking = await getXpRankingView({
      locale,
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
      message: errors.UNKNOWN_ERROR,
      ok: false,
    };
  }
}

export async function getFactoryVisitAction(
  factoryId: string,
  localeInput?: SupportedLocale,
): Promise<GetFactoryVisitActionResult> {
  const auth = await getCurrentUser();
  const locale = normalizeLocale(localeInput);
  const errors = rankingCopy[locale].actions.visitErrors;

  if (!auth) {
    return {
      code: "UNAUTHORIZED",
      message: errors.UNAUTHORIZED,
      ok: false,
    };
  }

  const normalizedFactoryId = factoryId.trim();

  if (!normalizedFactoryId || normalizedFactoryId.length > 200) {
    return {
      code: "INVALID_REQUEST",
      message: errors.INVALID_REQUEST,
      ok: false,
    };
  }

  try {
    const factoryVisit = await getFactoryVisitView({
      factoryId: normalizedFactoryId,
      locale,
    });

    if (!factoryVisit) {
      return {
        code: "NOT_FOUND",
        message: errors.NOT_FOUND,
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
      message: errors.UNKNOWN_ERROR,
      ok: false,
    };
  }
}
