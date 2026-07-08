"use server";

import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import sharp from "sharp";

import { Prisma, ProductImageVariant, ProductImageView } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

import { requireAdminUser } from "./admin-auth";
import type { AdminActionState } from "./product-form-state";

const MAX_SERVER_UPLOAD_BYTES = 4.5 * 1024 * 1024;
const PRODUCT_IMAGE_VARIANTS = [
  { variant: ProductImageVariant.DETAIL, width: 1000, height: 1250, sortOffset: 0 },
  { variant: ProductImageVariant.CARD, width: 600, height: 750, sortOffset: 1 },
  { variant: ProductImageVariant.THUMBNAIL, width: 300, height: 375, sortOffset: 2 },
] as const;

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function normalizeBlobSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function errorState(message: string, fieldErrors: Record<string, string> = {}): AdminActionState {
  return { status: "error", message, fieldErrors };
}

function successState(message: string, entityId?: string): AdminActionState {
  return { status: "success", message, entityId };
}

function formatServerError(error: unknown) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

export async function uploadProductImagesAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();
  const errors: Record<string, string> = {};
  const productId = readString(formData, "productId");
  const viewRaw = readString(formData, "view") || ProductImageView.FRONT;
  const view = Object.values(ProductImageView).includes(viewRaw as ProductImageView)
    ? (viewRaw as ProductImageView)
    : ProductImageView.FRONT;
  const imageFile = readFile(formData, "imageFile");

  if (!productId) errors.productId = "Ürün zorunlu.";
  if (!imageFile) errors.imageFile = "PNG master görsel seçmelisin.";
  else if (!["image/png", "image/webp"].includes(imageFile.type)) errors.imageFile = "Kaynak görsel PNG veya WEBP olmalı.";
  else if (imageFile.size > MAX_SERVER_UPLOAD_BYTES) errors.imageFile = "Görsel 4.5 MB sınırını aşıyor.";
  if (!process.env.BLOB_READ_WRITE_TOKEN) errors.imageFile = "BLOB_READ_WRITE_TOKEN ortam değişkeni bulunamadı.";
  if (Object.keys(errors).length) return errorState("Görsel yüklenemedi. Alanları kontrol et.", errors);

  const prisma = getPrisma();
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      code: true,
      name: true,
      images: { where: { view }, select: { pathname: true } },
    },
  });
  if (!product || !imageFile) return errorState("Ürün bulunamadı.");

  const sourceBuffer = Buffer.from(await imageFile.arrayBuffer());
  const productCode =
    normalizeBlobSegment(product.code ?? product.name) || productId;
  const versionKey = Date.now().toString();
  const uploadedImages: Array<{
    variant: ProductImageVariant;
    url: string;
    pathname: string;
    width: number;
    height: number;
    fileSizeBytes: number;
    sortOrder: number;
  }> = [];

  for (const imageVariant of PRODUCT_IMAGE_VARIANTS) {
    let outputBuffer: Buffer;
    try {
      outputBuffer = await sharp(sourceBuffer)
        .rotate()
        .resize(imageVariant.width, imageVariant.height, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp({ alphaQuality: 100, quality: 92 })
        .toBuffer();
    } catch (error) {
      console.error("Product image conversion failed", formatServerError(error));
      return errorState("Görsel WEBP formatına dönüştürülemedi.", { imageFile: "Kaynak dosya bozuk veya desteklenmiyor." });
    }

    try {
      const variantKey = imageVariant.variant.toLowerCase();
      const pathname = `products/${productCode}/${productCode}-${view.toLowerCase()}-${variantKey}-${versionKey}.webp`;
      const blob = await put(pathname, outputBuffer, {
        access: "public",
        contentType: "image/webp",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      uploadedImages.push({
        variant: imageVariant.variant,
        url: blob.url,
        pathname: blob.pathname,
        width: imageVariant.width,
        height: imageVariant.height,
        fileSizeBytes: outputBuffer.byteLength,
        sortOrder: (view === ProductImageView.FRONT ? 0 : 10) + imageVariant.sortOffset,
      });
    } catch (error) {
      console.error("Product image Blob upload failed", formatServerError(error));
      const paths = uploadedImages.map((image) => image.pathname);
      if (paths.length) await del(paths, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => undefined);
      return errorState("Görsel Blob'a yüklenemedi.", { imageFile: "Blob bağlantısını kontrol et." });
    }
  }

  try {
    await prisma.$transaction(
      uploadedImages.map((image) =>
        prisma.productImage.upsert({
          where: { productId_view_variant: { productId, view, variant: image.variant } },
          create: {
            productId, view, variant: image.variant, url: image.url, pathname: image.pathname,
            width: image.width, height: image.height, mimeType: "image/webp",
            fileSizeBytes: image.fileSizeBytes, sortOrder: image.sortOrder,
          },
          update: {
            url: image.url, pathname: image.pathname, width: image.width, height: image.height,
            mimeType: "image/webp", fileSizeBytes: image.fileSizeBytes,
            sortOrder: image.sortOrder,
          },
        }),
      ),
    );
    const nextPaths = new Set(uploadedImages.map((image) => image.pathname));
    const replaced = product.images
      .map((image) => image.pathname)
      .filter((pathname): pathname is string => Boolean(pathname && !nextPaths.has(pathname)));
    if (replaced.length) await del(replaced, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => undefined);
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${productId}`);
    return successState(`${view} için DETAIL, CARD ve THUMBNAIL WEBP görselleri yüklendi.`, productId);
  } catch (error) {
    const paths = uploadedImages.map((image) => image.pathname);
    if (paths.length) await del(paths, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => undefined);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return errorState("Ürün bulunamadı.");
    return errorState("Görsel kayıtları veritabanına yazılamadı.");
  }
}
