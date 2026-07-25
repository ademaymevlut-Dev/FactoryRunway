"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { OutsourceOptionType } from "@/generated/prisma/client";
import { USER_ROLES } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";
import { getPlayerPreferredLocale } from "@/lib/i18n/player-locale";
import { numberLocale, type SupportedLocale } from "@/lib/i18n/locales";

import {
  startOutsourceJob,
  type StartOutsourceJobResult as ServiceResult,
} from "../services/start-outsource-job";

export type StartOutsourceJobActionInput = {
  optionType: OutsourceOptionType;
  quantity: number;
  requestId: string;
  routeProgressId: string;
};

export type StartOutsourceJobResult =
  | { message: string; ok: true }
  | { message: string; ok: false };

const startOutsourceActionCopy = {
  tr: {
    invalid: "Fason üretim isteği doğrulanamadı.",
    started: (quantity: string, readyDay: number) =>
      `${quantity} adet fasona gönderildi. ${readyDay}. gün kapanışında dönecek.`,
    alreadyStarted: (quantity: string) =>
      `${quantity} adetlik fason gönderimi zaten başlatılmıştı.`,
    failed: "Fason üretim başlatılamadı.",
    errors: {
      DUPLICATE_REQUEST: "Bu fason isteği başka bir işlem için kullanılmış.",
      FACTORY_NOT_ACTIVE: "Fabrika aktif olmadığı için fason üretim başlatılamadı.",
      FACTORY_NOT_FOUND: "Fabrika bulunamadı.",
      INVALID_QUANTITY: "Fasona gönderilecek adet geçerli değil.",
      OUTSOURCE_CONFIG_NOT_FOUND: "Seçilen fason teklifi aktif veya fiyatlı değil.",
      PLAYBACK_ACTIVE: "Vardiya aktifken fason kararı değiştirilemez.",
      PROGRESS_NOT_FOUND: "Fasona gönderilecek üretim kaydı bulunamadı.",
      QUANTITY_CHANGED: "Hazır miktar değişti; fason miktarını yeniden seçin.",
      ROUTE_NOT_OUTSOURCEABLE: "Bu üretim aşaması fasona gönderilemez.",
    },
  },
  en: {
    invalid: "The outsource production request could not be validated.",
    started: (quantity: string, readyDay: number) =>
      `${quantity} pcs were sent to outsourcing. They will return at the end of day ${readyDay}.`,
    alreadyStarted: (quantity: string) =>
      `${quantity} pcs had already been sent to outsourcing.`,
    failed: "Outsource production could not be started.",
    errors: {
      DUPLICATE_REQUEST: "This outsource request was already used by another operation.",
      FACTORY_NOT_ACTIVE: "Outsource production cannot start because the factory is not active.",
      FACTORY_NOT_FOUND: "Factory was not found.",
      INVALID_QUANTITY: "The quantity to outsource is not valid.",
      OUTSOURCE_CONFIG_NOT_FOUND: "The selected outsource offer is not active or priced.",
      PLAYBACK_ACTIVE: "Outsource decisions cannot be changed while a shift is active.",
      PROGRESS_NOT_FOUND: "The production record to outsource was not found.",
      QUANTITY_CHANGED: "The ready quantity changed; choose the outsource quantity again.",
      ROUTE_NOT_OUTSOURCEABLE: "This production step cannot be outsourced.",
    },
  },
} as const satisfies Record<
  SupportedLocale,
  {
    invalid: string;
    started: (quantity: string, readyDay: number) => string;
    alreadyStarted: (quantity: string) => string;
    failed: string;
    errors: Record<Extract<ServiceResult, { ok: false }>["code"], string>;
  }
>;

export async function startOutsourceJobAction(
  input: StartOutsourceJobActionInput,
): Promise<StartOutsourceJobResult> {
  const auth = await getCurrentUser();

  if (!auth) redirect("/");
  if (auth.role === USER_ROLES.ADMIN || auth.role === USER_ROLES.SUPER_ADMIN) {
    redirect("/admin");
  }

  const locale = await getPlayerPreferredLocale(auth.id);
  const copy = startOutsourceActionCopy[locale];
  const routeProgressId = readIdentifier(input.routeProgressId);
  const requestId = readIdentifier(input.requestId);

  if (
    !routeProgressId ||
    !requestId ||
    !Number.isSafeInteger(input.quantity) ||
    input.quantity <= 0 ||
    !Object.values(OutsourceOptionType).includes(input.optionType)
  ) {
    return { message: copy.invalid, ok: false };
  }

  const prisma = getPrisma();
  const factory = await prisma.factory.findFirst({
    where: { playerProfile: { userId: auth.id } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!factory) redirect("/onboarding");

  try {
    const result = await startOutsourceJob({
      job: {
        factoryId: factory.id,
        optionType: input.optionType,
        quantity: input.quantity,
        requestId,
        routeProgressId,
      },
      prisma,
      userId: auth.id,
    });

    if (!result.ok) return toActionFailure(result, locale);

    revalidatePath("/game");
    const quantityLabel = formatNumber(result.quantity, locale);

    return {
      message: result.alreadyStarted
        ? copy.alreadyStarted(quantityLabel)
        : copy.started(quantityLabel, result.readyDay),
      ok: true,
    };
  } catch (error) {
    console.error("Outsource production could not be started.", error);
    return { message: copy.failed, ok: false };
  }
}

function toActionFailure(
  result: Extract<ServiceResult, { ok: false }>,
  locale: SupportedLocale,
): StartOutsourceJobResult {
  return {
    message: startOutsourceActionCopy[locale].errors[result.code],
    ok: false,
  };
}

function readIdentifier(value: string) {
  const normalized = value.trim();

  return normalized.length > 0 && normalized.length <= 200
    ? normalized
    : null;
}

function formatNumber(value: number, locale: SupportedLocale) {
  return new Intl.NumberFormat(numberLocale(locale)).format(value);
}
