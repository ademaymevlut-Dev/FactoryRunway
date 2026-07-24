import { z } from "zod";

import { VERCEL_BLOB_HOST_SUFFIX } from "@/lib/vercel-blob-host";

import {
  showcaseSelection,
  validateShowcaseSelection,
  type ShowcaseSelection,
} from "./showcase-selection";

const nonEmptyStringSchema = z
  .string()
  .refine((value) => value.trim().length > 0, "Değer boş olamaz.");

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Geçerli bir 6 haneli HEX renk olmalı.");

export function isAllowedShowcaseAssetUrl(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.port &&
    url.hostname.length > VERCEL_BLOB_HOST_SUFFIX.length &&
    url.hostname.endsWith(VERCEL_BLOB_HOST_SUFFIX)
  );
}

const showcaseAssetUrlSchema = z
  .string()
  .refine(
    isAllowedShowcaseAssetUrl,
    "Site-relative veya izin verilen Vercel Blob HTTPS URL'si olmalı.",
  );

export const showcaseLabelsSchema = z
  .object({
    tr: nonEmptyStringSchema,
    en: nonEmptyStringSchema,
  })
  .strict();

const showcaseCardSchema = z
  .object({
    primaryColor: hexColorSchema,
    secondaryColor: hexColorSchema,
    gradientFrom: hexColorSchema,
    gradientTo: hexColorSchema,
    svgIconAccentColor: hexColorSchema,
  })
  .strict();

const showcaseNamedMasterDataSchema = z
  .object({
    key: nonEmptyStringSchema,
    labels: showcaseLabelsSchema,
  })
  .strict();

const showcaseColorSchema = z
  .object({
    key: nonEmptyStringSchema,
    hexCode: hexColorSchema,
    labels: showcaseLabelsSchema,
  })
  .strict();

const showcaseColorsSchema = z
  .array(showcaseColorSchema)
  .min(1, "En az bir aktif renk gerekli.")
  .superRefine((colors, context) => {
    const seen = new Set<string>();

    for (const [index, color] of colors.entries()) {
      if (seen.has(color.key)) {
        context.addIssue({
          code: "custom",
          message: `Tekrarlı color key: ${color.key}`,
          path: [index, "key"],
        });
      }

      seen.add(color.key);
    }
  });

const showcaseRouteStepSchema = z
  .object({
    departmentKey: nonEmptyStringSchema,
    sequence: z.number().int().positive(),
    workloadPointsPerUnit: z.number().int().positive(),
    canOutsource: z.boolean(),
    labels: showcaseLabelsSchema,
  })
  .strict();

const showcaseRouteSchema = z
  .array(showcaseRouteStepSchema)
  .min(1, "En az bir zorunlu route adımı gerekli.")
  .superRefine((route, context) => {
    const sequences = new Set<number>();

    for (const [index, step] of route.entries()) {
      if (sequences.has(step.sequence)) {
        context.addIssue({
          code: "custom",
          message: `Tekrarlı route sequence: ${step.sequence}`,
          path: [index, "sequence"],
        });
      }

      if (index > 0 && route[index - 1].sequence >= step.sequence) {
        context.addIssue({
          code: "custom",
          message: "Route sequence değerleri artan sırada olmalı.",
          path: [index, "sequence"],
        });
      }

      sequences.add(step.sequence);
    }
  });

export const showcaseProductSchema = z
  .object({
    key: nonEmptyStringSchema,
    name: nonEmptyStringSchema,
    imageUrl: showcaseAssetUrlSchema,
    card: showcaseCardSchema,
    category: showcaseNamedMasterDataSchema,
    productType: showcaseNamedMasterDataSchema,
    colors: showcaseColorsSchema,
    route: showcaseRouteSchema,
  })
  .strict();

export const showcaseCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    sectorKey: nonEmptyStringSchema,
    products: z.array(showcaseProductSchema).superRefine((products, context) => {
      const seen = new Set<string>();

      for (const [index, product] of products.entries()) {
        if (seen.has(product.key)) {
          context.addIssue({
            code: "custom",
            message: `Tekrarlı product key: ${product.key}`,
            path: [index, "key"],
          });
        }

        seen.add(product.key);
      }
    }),
  })
  .strict();

export type ShowcaseLabels = z.infer<typeof showcaseLabelsSchema>;
export type ShowcaseProduct = z.infer<typeof showcaseProductSchema>;
export type ShowcaseCatalog = z.infer<typeof showcaseCatalogSchema>;

export class ShowcaseCatalogError extends Error {
  constructor(
    readonly field: string,
    reason: string,
    readonly productKey?: string,
  ) {
    super(reason);
    this.name = "ShowcaseCatalogError";
  }
}

function productKeyFromIssue(value: unknown, path: PropertyKey[]) {
  if (
    path[0] !== "products" ||
    typeof path[1] !== "number" ||
    !value ||
    typeof value !== "object"
  ) {
    return undefined;
  }

  const products = (value as { products?: unknown }).products;
  if (!Array.isArray(products)) return undefined;

  const product = products[path[1]];
  if (!product || typeof product !== "object") return undefined;

  const key = (product as { key?: unknown }).key;
  return typeof key === "string" ? key : undefined;
}

export function validateShowcaseCatalog(
  value: unknown,
  selection: ShowcaseSelection = showcaseSelection,
): ShowcaseCatalog {
  validateShowcaseSelection(selection);

  const result = showcaseCatalogSchema.safeParse(value);

  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ShowcaseCatalogError(
      issue.path.length ? issue.path.join(".") : "catalog",
      issue.message,
      productKeyFromIssue(value, issue.path),
    );
  }

  const catalog = result.data;

  if (catalog.sectorKey !== selection.sectorKey) {
    throw new ShowcaseCatalogError(
      "sectorKey",
      `Beklenen ${selection.sectorKey}, gelen ${catalog.sectorKey}.`,
    );
  }

  if (catalog.products.length !== selection.productKeys.length) {
    throw new ShowcaseCatalogError(
      "products",
      `Tam olarak ${selection.productKeys.length} ürün bekleniyor; ${catalog.products.length} bulundu.`,
    );
  }

  for (const [index, expectedKey] of selection.productKeys.entries()) {
    const actualKey = catalog.products[index]?.key;

    if (actualKey !== expectedKey) {
      throw new ShowcaseCatalogError(
        `products.${index}.key`,
        `Beklenen ${expectedKey}, gelen ${actualKey ?? "eksik"}.`,
        actualKey,
      );
    }
  }

  return catalog;
}

export function serializeShowcaseCatalog(
  value: unknown,
  selection: ShowcaseSelection = showcaseSelection,
): string {
  const catalog = validateShowcaseCatalog(value, selection);
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

export function formatShowcaseCatalogError(error: unknown): string {
  if (error instanceof ShowcaseCatalogError) {
    return [
      "SHOWCASE_SYNC_ERROR",
      ...(error.productKey ? [`productKey: ${error.productKey}`] : []),
      `field: ${error.field}`,
      `reason: ${error.message}`,
    ].join("\n");
  }

  return [
    "SHOWCASE_SYNC_ERROR",
    "field: unknown",
    `reason: ${error instanceof Error ? error.message : String(error)}`,
  ].join("\n");
}
