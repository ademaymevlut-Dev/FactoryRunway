"use server";

import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

import { unexpectedAdminActionState } from "../admin-action-errors";
import { requireAdminUser } from "../admin-auth";
import type { AdminActionState } from "../product-form-state";

const MAX_SERVER_UPLOAD_BYTES = 4 * 1024 * 1024;
const sectorImageSlots = {
  FEATURED: {
    width: 1600,
    height: 700,
    urlField: "photoUrl",
    pathnameField: "photoPathname",
    label: "Featured",
  },
  SLIM: {
    width: 1600,
    height: 420,
    urlField: "slimPhotoUrl",
    pathnameField: "slimPhotoPathname",
    label: "Slim",
  },
} as const;

type SectorImageSlot = keyof typeof sectorImageSlots;

const success = (message: string, entityId?: string): AdminActionState => ({
  status: "success",
  message,
  entityId,
});

const error = (message: string): AdminActionState => ({
  status: "error",
  message,
});

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function normalizeBlobSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function slotFromForm(formData: FormData) {
  const rawSlot = readString(formData, "slot");
  if (rawSlot !== "FEATURED" && rawSlot !== "SLIM") {
    throw new Error("Görsel tipi FEATURED veya SLIM olmalı.");
  }

  return rawSlot;
}

export async function uploadSectorImageAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();

  const sectorId = readString(formData, "sectorId");
  const imageFile = readFile(formData, "imageFile");

  if (!sectorId) return error("Sektör zorunlu.");
  if (!imageFile) return error("PNG veya WEBP master görsel seçmelisin.");
  if (!["image/png", "image/webp"].includes(imageFile.type)) {
    return error("Kaynak görsel PNG veya WEBP olmalı.");
  }
  if (imageFile.size > MAX_SERVER_UPLOAD_BYTES) {
    return error("Görsel 4 MB sınırını aşıyor.");
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return error("BLOB_READ_WRITE_TOKEN bulunamadı.");
  }

  let slot: SectorImageSlot;
  try {
    slot = slotFromForm(formData);
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "Görsel tipi geçersiz.");
  }

  const imageSlot = sectorImageSlots[slot];
  const prisma = getPrisma();
  let sector: {
    key: string;
    photoPathname: string | null;
    slimPhotoPathname: string | null;
  } | null;

  try {
    sector = await prisma.sector.findUnique({
      where: { id: sectorId },
      select: {
        key: true,
        photoPathname: true,
        slimPhotoPathname: true,
      },
    });
  } catch (cause) {
    return unexpectedAdminActionState(
      "uploadSectorImage.lookupSector",
      cause,
      "Sektör bilgisi okunamadı.",
      { sectorId, slot },
    );
  }

  if (!sector) return error("Sektör bulunamadı.");

  let sourceBuffer: Buffer;
  try {
    sourceBuffer = Buffer.from(await imageFile.arrayBuffer());
  } catch (cause) {
    return unexpectedAdminActionState(
      "uploadSectorImage.readFile",
      cause,
      "Görsel dosyası okunamadı.",
      { sectorId, slot },
    );
  }

  let outputBuffer: Buffer;
  try {
    const { default: sharp } = await import("sharp");
    outputBuffer = await sharp(sourceBuffer)
      .rotate()
      .resize(imageSlot.width, imageSlot.height, {
        fit: "cover",
        position: "center",
      })
      .webp({ alphaQuality: 100, quality: 92 })
      .toBuffer();
  } catch (cause) {
    return unexpectedAdminActionState(
      "uploadSectorImage.convert",
      cause,
      "Görsel WEBP formatına dönüştürülemedi.",
      { sectorId, slot },
    );
  }

  const sectorKey = normalizeBlobSegment(sector.key) || sectorId;
  const slotKey = slot.toLowerCase();
  const versionKey = Date.now().toString();
  const pathname = `sectors/${sectorKey}/${sectorKey}-${slotKey}-${versionKey}.webp`;

  let uploaded: { url: string; pathname: string } | null = null;
  try {
    const blob = await put(pathname, outputBuffer, {
      access: "public",
      contentType: "image/webp",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    uploaded = { url: blob.url, pathname: blob.pathname };
  } catch (cause) {
    return unexpectedAdminActionState(
      "uploadSectorImage.blobUpload",
      cause,
      "Görsel Blob depolama alanına yüklenemedi.",
      { sectorId, slot },
    );
  }

  try {
    const replacedPathname =
      slot === "FEATURED" ? sector.photoPathname : sector.slimPhotoPathname;

    await prisma.sector.update({
      where: { id: sectorId },
      data: {
        [imageSlot.urlField]: uploaded.url,
        [imageSlot.pathnameField]: uploaded.pathname,
      },
    });

    if (replacedPathname && replacedPathname !== uploaded.pathname) {
      await del(replacedPathname, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }).catch(() => undefined);
    }

    revalidatePath("/admin");
    revalidatePath("/admin/sectors");
    return success(
      `${imageSlot.label} görseli ${imageSlot.width}x${imageSlot.height} WEBP olarak yüklendi.`,
      sectorId,
    );
  } catch (cause) {
    if (uploaded) {
      await del(uploaded.pathname, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }).catch(() => undefined);
    }
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2025") {
      return error("Sektör bulunamadı.");
    }
    return unexpectedAdminActionState(
      "uploadSectorImage.persist",
      cause,
      "Görsel kayıtları veritabanına yazılamadı.",
      { sectorId, slot },
    );
  }
}
