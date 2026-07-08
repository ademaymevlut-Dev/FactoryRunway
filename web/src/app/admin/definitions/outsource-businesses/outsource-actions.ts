"use server";

import { revalidatePath } from "next/cache";

import {
  ContentStatus,
  OutsourceOptionType,
} from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

import { integer, json, text } from "../../admin-data";
import { requireAdminUser } from "../../admin-auth";

const pagePath = "/admin/definitions/outsource-businesses";

export async function saveOutsourceOptionAction(
  configId: string | null,
  formData: FormData,
) {
  await requireAdminUser();
  const prisma = getPrisma();
  const departmentId = text(formData, "departmentId");
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { sectorId: true, supportsOutsource: true },
  });

  if (!department?.supportsOutsource) {
    throw new Error("Seçilen departman fason üretimi desteklemiyor.");
  }

  const data = {
    sectorId: department.sectorId,
    departmentId,
    optionType: text(formData, "optionType") as OutsourceOptionType,
    leadTimeDays: integer(formData, "leadTimeDays", { min: 1 }),
    costMultiplierBps: integer(formData, "costMultiplierBps", { min: 1 }),
    qualityRiskBps: integer(formData, "qualityRiskBps", { max: 10000 }),
    delayRiskBps: integer(formData, "delayRiskBps", { max: 10000 }),
    status: text(formData, "status") as ContentStatus,
    metadata: json(formData),
  };

  if (configId) {
    await prisma.outsourceOptionConfig.update({
      where: { id: configId },
      data,
    });
  } else {
    await prisma.outsourceOptionConfig.create({ data });
  }

  revalidatePath(pagePath);
}

export async function deleteOutsourceOptionAction(configId: string) {
  await requireAdminUser();
  await getPrisma().outsourceOptionConfig.delete({ where: { id: configId } });
  revalidatePath(pagePath);
}
