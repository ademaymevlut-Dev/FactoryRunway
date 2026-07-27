import { randomUUID } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";

import type { AdminActionState } from "./product-form-state";

type AdminActionErrorContext = Record<
  string,
  boolean | number | string | null | undefined
>;

function serializeCause(cause: unknown) {
  if (cause instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      code: cause.code,
      message: cause.message,
      name: cause.name,
      stack: cause.stack,
    };
  }

  if (cause instanceof Error) {
    return {
      message: cause.message,
      name: cause.name,
      stack: cause.stack,
    };
  }

  return {
    message: String(cause),
    name: "UnknownError",
  };
}

export function reportAdminActionError(
  action: string,
  cause: unknown,
  context: AdminActionErrorContext = {},
) {
  const errorId = randomUUID();

  console.error("[admin-action] failed", {
    action,
    context,
    error: serializeCause(cause),
    errorId,
  });

  return errorId;
}

export function unexpectedAdminActionState(
  action: string,
  cause: unknown,
  fallbackMessage = "İşlem tamamlanamadı.",
  context: AdminActionErrorContext = {},
): AdminActionState {
  const errorId = reportAdminActionError(action, cause, context);

  return {
    status: "error",
    message: `${fallbackMessage} Hata referansı: ${errorId}`,
  };
}

