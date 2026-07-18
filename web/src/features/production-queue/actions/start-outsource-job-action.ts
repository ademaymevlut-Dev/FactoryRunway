"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { OutsourceOptionType } from "@/generated/prisma/client";
import { USER_ROLES } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";

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

export async function startOutsourceJobAction(
  input: StartOutsourceJobActionInput,
): Promise<StartOutsourceJobResult> {
  const auth = await getCurrentUser();

  if (!auth) redirect("/");
  if (auth.role === USER_ROLES.ADMIN || auth.role === USER_ROLES.SUPER_ADMIN) {
    redirect("/admin");
  }

  const routeProgressId = readIdentifier(input.routeProgressId);
  const requestId = readIdentifier(input.requestId);

  if (
    !routeProgressId ||
    !requestId ||
    !Number.isSafeInteger(input.quantity) ||
    input.quantity <= 0 ||
    !Object.values(OutsourceOptionType).includes(input.optionType)
  ) {
    return { message: "Fason üretim isteği doğrulanamadı.", ok: false };
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

    if (!result.ok) return toActionFailure(result);

    revalidatePath("/game");

    return {
      message: result.alreadyStarted
        ? `${formatNumber(result.quantity)} adetlik fason gönderimi zaten başlatılmıştı.`
        : `${formatNumber(result.quantity)} adet fasona gönderildi. ${result.readyDay}. gün kapanışında dönecek.`,
      ok: true,
    };
  } catch (error) {
    console.error("Outsource production could not be started.", error);
    return { message: "Fason üretim başlatılamadı.", ok: false };
  }
}

function toActionFailure(
  result: Extract<ServiceResult, { ok: false }>,
): StartOutsourceJobResult {
  const messages = {
    DUPLICATE_REQUEST: "Bu fason isteği başka bir işlem için kullanılmış.",
    FACTORY_NOT_ACTIVE: "Fabrika aktif olmadığı için fason üretim başlatılamadı.",
    FACTORY_NOT_FOUND: "Fabrika bulunamadı.",
    INVALID_QUANTITY: "Fasona gönderilecek adet geçerli değil.",
    OUTSOURCE_CONFIG_NOT_FOUND: "Seçilen fason teklifi aktif veya fiyatlı değil.",
    PLAYBACK_ACTIVE: "Vardiya aktifken fason kararı değiştirilemez.",
    PROGRESS_NOT_FOUND: "Fasona gönderilecek üretim kaydı bulunamadı.",
    QUANTITY_CHANGED: "Hazır miktar değişti; fason miktarını yeniden seçin.",
    ROUTE_NOT_OUTSOURCEABLE: "Bu üretim aşaması fasona gönderilemez.",
  } satisfies Record<Extract<ServiceResult, { ok: false }>["code"], string>;

  return { message: messages[result.code], ok: false };
}

function readIdentifier(value: string) {
  const normalized = value.trim();

  return normalized.length > 0 && normalized.length <= 200
    ? normalized
    : null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}
