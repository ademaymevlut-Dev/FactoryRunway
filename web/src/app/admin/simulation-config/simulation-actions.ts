"use server";

import { revalidatePath } from "next/cache";

import { CurrencyCode } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

import { requireAdminUser } from "../admin-auth";
import { bigint, integer, json, text } from "../admin-data";

const pagePath = "/admin/simulation-config";

export async function saveSimulationConfigAction(
  configId: string | null,
  formData: FormData,
) {
  await requireAdminUser();
  const prisma = getPrisma();
  const sectorId = text(formData, "sectorId");

  if (configId) {
    const current = await prisma.sectorSimulationConfig.findUnique({
      where: { id: configId },
      select: { sectorId: true },
    });
    if (!current) throw new Error("Simülasyon ayarı bulunamadı.");
    if (current.sectorId !== sectorId) {
      throw new Error("Mevcut simülasyon ayarının sektörü değiştirilemez.");
    }
  } else {
    const sector = await prisma.sector.findUnique({
      where: { id: sectorId },
      select: { id: true },
    });
    if (!sector) throw new Error("Sektör bulunamadı.");
  }

  const data = {
    sectorId,
    startingCapitalCents: bigint(formData, "startingCapitalCents"),
    defaultCurrencyCode: text(
      formData,
      "defaultCurrencyCode",
    ) as CurrencyCode,
    startingDay: integer(formData, "startingDay", { min: 1 }),
    startingLevel: integer(formData, "startingLevel", { min: 1 }),
    financePeriodDays: integer(formData, "financePeriodDays", { min: 1 }),
    defaultPaymentTermDays: integer(formData, "defaultPaymentTermDays"),
    simulationDurationSeconds: integer(
      formData,
      "simulationDurationSeconds",
      { min: 1 },
    ),
    maxAllocationsPerLineShift: integer(
      formData,
      "maxAllocationsPerLineShift",
      { min: 1 },
    ),
    metadata: json(formData),
  };

  if (configId) {
    await prisma.sectorSimulationConfig.update({
      where: { id: configId },
      data,
    });
  } else {
    await prisma.sectorSimulationConfig.create({ data });
  }

  revalidatePath(pagePath);
}
