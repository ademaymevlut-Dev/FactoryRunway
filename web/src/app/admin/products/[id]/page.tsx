import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ImageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getPrisma } from "@/lib/db";

import { jsonText } from "../../admin-data";
import {
  Field,
  FormGrid,
  Input,
  Options,
  Panel,
  Select,
  Textarea,
  enumOptions,
} from "../../form-ui";
import { ProductUploadForm } from "../product-upload-form";
import {
  updateProductDefinitionsAction,
  updateProductMainAction,
} from "../product-actions";
import { ProductScopeFields } from "../product-scope-fields";
import { ProductCardDesigner } from "./product-card-designer";
import { ProductDetailTabs } from "./product-detail-tabs";
import { ProductRouteStepForm } from "./product-route-step-form";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prisma = getPrisma();
  const [product, sectors, categories, productTypes, departments] =
    await Promise.all([
      prisma.product.findUnique({
        where: { id },
        include: {
          sector: { include: { translations: true } },
          category: { include: { translations: true } },
          productType: {
            include: {
              translations: true,
              workloadStandards: true,
            },
          },
          translations: true,
          images: { orderBy: [{ view: "asc" }, { sortOrder: "asc" }] },
          routeSteps: {
            orderBy: { sequence: "asc" },
            include: {
              department: { include: { translations: true } },
            },
          },
        },
      }),
      prisma.sector.findMany({
        orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
        include: { translations: true },
      }),
      prisma.productCategory.findMany({
        orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
        include: { translations: true },
      }),
      prisma.productType.findMany({
        orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
        include: { translations: true },
      }),
      prisma.department.findMany({
        where: { kind: "PRODUCTION" },
        orderBy: [{ routeOrder: "asc" }, { key: "asc" }],
        include: { translations: true },
      }),
    ]);

  if (!product) notFound();

  const sectorOptions = sectors.map((sector) => ({
    id: sector.id,
    key: sector.key,
    name: displayName(sector.translations, sector.key),
  }));
  const categoryOptions = categories.map((category) => ({
    id: category.id,
    key: category.key,
    name: displayName(category.translations, category.key),
    sectorId: category.sectorId,
  }));
  const productTypeOptions = productTypes.map((productType) => ({
    id: productType.id,
    key: productType.key,
    name: displayName(productType.translations, productType.key),
    sectorId: productType.sectorId,
    categoryId: productType.categoryId,
  }));
  const departmentsForSector = departments
    .filter((department) => department.sectorId === product.sectorId)
    .map((department) => ({
      id: department.id,
      name: displayName(department.translations, department.key),
      standardWorkloadPoints:
        product.productType.workloadStandards.find(
          (standard) => standard.departmentId === department.id,
        )?.workloadPointsPerUnit ?? null,
    }));
  const usedRouteDepartmentIds = new Set(
    product.routeSteps.map((step) => step.departmentId),
  );
  const availableRouteDepartments = departmentsForSector.filter(
    (department) => !usedRouteDepartmentIds.has(department.id),
  );
  const nextRouteSequence =
    product.routeSteps.reduce(
      (maximum, step) => Math.max(maximum, step.sequence),
      0,
    ) + 1;
  const cardImage =
    product.images.find(
      (image) => image.view === "FRONT" && image.variant === "CARD",
    ) ?? product.images.find((image) => image.view === "FRONT");

  return (
    <div className="grid gap-4">
      <header className="game-topbar gap-4">
        <div className="flex items-center gap-3">
          <Link
            aria-label="Ürün listesine dön"
            className="game-icon-button"
            href="/admin/products"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="font-mono text-xs text-primary">
              {product.code ?? product.key}
            </p>
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {displayName(product.sector.translations, product.sector.key)} ·{" "}
              {displayName(
                product.category.translations,
                product.category.key,
              )}
            </p>
          </div>
        </div>
        <Badge
          variant={product.status === "ACTIVE" ? "default" : "secondary"}
        >
          {product.status}
        </Badge>
      </header>

      <ProductDetailTabs
        main={
          <Panel
            description="Ürünün kimliği, sınıflandırması ve yayın durumu."
            title="Ana ürün bilgileri"
          >
            <form
              action={updateProductMainAction.bind(null, product.id)}
              className="grid gap-5"
            >
              <FormGrid>
                <ProductScopeFields
                  categories={categoryOptions}
                  defaults={{
                    sectorId: product.sectorId,
                    categoryId: product.categoryId,
                    productTypeId: product.productTypeId,
                  }}
                  productTypes={productTypeOptions}
                  sectors={sectorOptions}
                />
                <Field label="Teknik anahtar">
                  <Input defaultValue={product.key} name="key" required />
                </Field>
                <Field label="Ürün kodu">
                  <Input defaultValue={product.code ?? ""} name="code" />
                </Field>
                <Field label="Ürün adı">
                  <Input defaultValue={product.name} name="name" required />
                </Field>
                <Field label="Ürün seviyesi">
                  <Select defaultValue={product.tier} name="tier">
                    <Options values={enumOptions.tiers} />
                  </Select>
                </Field>
                <Field label="Cinsiyet">
                  <Select defaultValue={product.gender ?? ""} name="gender">
                    <option value="">Belirtilmedi</option>
                    <Options
                      values={["MEN", "WOMEN", "KIDS", "UNISEX", "BABY"]}
                    />
                  </Select>
                </Field>
                <Field label="Sıralama">
                  <Input
                    defaultValue={product.sortOrder}
                    min="0"
                    name="sortOrder"
                    type="number"
                  />
                </Field>
                <Field label="Durum">
                  <Select defaultValue={product.status} name="status">
                    <Options values={enumOptions.statuses} />
                  </Select>
                </Field>
              </FormGrid>
              <button className="game-button-primary w-fit" type="submit">
                Ana Bilgileri Kaydet
              </button>
            </form>
          </Panel>
        }
        definitions={
          <Panel
            description="Fiyat, oyuncu seviyesi, çok dilli açıklamalar ve ek JSON verileri."
            title="Ürün tanımlamaları"
          >
            <form
              action={updateProductDefinitionsAction.bind(null, product.id)}
              className="grid gap-5"
            >
              <FormGrid>
                <Field label="Baz birim fiyat (kuruş)">
                  <Input
                    defaultValue={product.baseUnitPriceCents}
                    min="0"
                    name="baseUnitPriceCents"
                    type="number"
                  />
                </Field>
                <Field label="Gerekli oyuncu seviyesi">
                  <Input
                    defaultValue={product.requiredPlayerLevel}
                    min="1"
                    name="requiredPlayerLevel"
                    type="number"
                  />
                </Field>
                <Field label="Türkçe açıklama">
                  <Input
                    defaultValue={translationDescription(
                      product.translations,
                      "tr",
                    )}
                    name="descriptionTr"
                  />
                </Field>
                <Field label="İngilizce açıklama">
                  <Input
                    defaultValue={translationDescription(
                      product.translations,
                      "en",
                    )}
                    name="descriptionEn"
                  />
                </Field>
              </FormGrid>
              <Field label="Metadata JSON">
                <Textarea
                  defaultValue={jsonText(product.metadata)}
                  name="metadata"
                  placeholder='{"collection":"summer"}'
                />
              </Field>
              <button className="game-button-primary w-fit" type="submit">
                Tanımlamaları Kaydet
              </button>
            </form>
          </Panel>
        }
        route={
          <Panel
            description="Sıra ve departman ürün içinde benzersizdir; yalnızca ürünün sektöründeki departmanlar seçilebilir."
            title={`Üretim rotası (${product.routeSteps.length})`}
          >
            <div className="grid gap-4">
              {product.routeSteps.map((step) => (
                <ProductRouteStepForm
                  departments={departmentsForSector}
                  key={step.id}
                  productId={product.id}
                  step={{
                    id: step.id,
                    departmentId: step.departmentId,
                    sequence: step.sequence,
                    isRequired: step.isRequired,
                    canOutsource: step.canOutsource,
                    workloadPointsPerUnit: step.workloadPointsPerUnit,
                    setupPoints: step.setupPoints,
                    metadata: jsonText(step.metadata),
                  }}
                />
              ))}
              <ProductRouteStepForm
                defaultSequence={nextRouteSequence}
                departments={availableRouteDepartments}
                key={`new-route-${nextRouteSequence}`}
                productId={product.id}
              />
            </div>
          </Panel>
        }
        images={
          <Panel
            description="FRONT veya BACK ana görselinden DETAIL, CARD ve THUMBNAIL WEBP varyantları üretilir."
            title={`Ürün görselleri (${product.images.length})`}
          >
            <ProductUploadForm productId={product.id} />
            {product.images.length ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {product.images.map((image) => (
                  <article
                    className="rounded-lg border border-border bg-card p-3 text-card-foreground"
                    key={image.id}
                  >
                    <div
                      aria-label={`${product.name} ${image.view} ${image.variant}`}
                      className="aspect-[4/5] bg-contain bg-center bg-no-repeat"
                      role="img"
                      style={{ backgroundImage: `url("${image.url}")` }}
                    />
                    <p className="mt-2 text-xs">
                      {image.view} · {image.variant} · {image.width ?? "?"}×
                      {image.height ?? "?"}
                    </p>
                    <p className="break-all text-xs text-muted-foreground">
                      {image.pathname ?? image.url}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 flex items-center gap-3 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                <ImageIcon />
                Henüz ürün görseli yüklenmedi.
              </div>
            )}
          </Panel>
        }
        card={
          <ProductCardDesigner
            product={{
              id: product.id,
              code: product.code,
              name: product.name,
              categoryName: displayName(
                product.category.translations,
                product.category.key,
              ),
              productTypeName: displayName(
                product.productType.translations,
                product.productType.key,
              ),
              tier: product.tier,
              baseUnitPriceCents: product.baseUnitPriceCents,
              requiredPlayerLevel: product.requiredPlayerLevel,
              imageUrl: cardImage?.url,
              cardPrimaryColor: product.cardPrimaryColor,
              cardSecondaryColor: product.cardSecondaryColor,
              cardGradientFrom: product.cardGradientFrom,
              cardGradientTo: product.cardGradientTo,
              cardTextColor: product.cardTextColor,
              cardSvgIconColor: product.cardSvgIconColor,
              cardSvgIconAccentColor: product.cardSvgIconAccentColor,
              cardForegroundTone: product.cardForegroundTone,
            }}
          />
        }
      />
    </div>
  );
}

type Translation = {
  locale: string;
  name?: string;
  description: string | null;
};

function displayName(translations: Translation[], fallback: string) {
  return (
    translations.find((translation) => translation.locale === "tr")?.name ??
    fallback
  );
}

function translationDescription(
  translations: Translation[],
  locale: string,
) {
  return (
    translations.find((translation) => translation.locale === locale)
      ?.description ?? ""
  );
}
