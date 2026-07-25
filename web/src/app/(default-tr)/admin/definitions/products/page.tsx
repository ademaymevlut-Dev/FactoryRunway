import { Palette, Shapes, Tags } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPrisma } from "@/lib/db";

import {
  createProductCategoryAction,
  createProductColorVariantAction,
  createProductTypeAction,
} from "../../content-actions";
import {
  Field,
  FormGrid,
  Input,
  Options,
  Panel,
  Select,
  enumOptions,
} from "../../form-ui";
import { DefinitionForm } from "../definition-form";
import { ProductTypeScopeFields } from "../scoped-definition-fields";
import { DefinitionStatusButton } from "../status-button";

export default async function ProductDefinitionsPage() {
  const prisma = getPrisma();
  const [sectors, categories, productTypes, colors] = await Promise.all([
    prisma.sector.findMany({
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
      include: { translations: true },
    }),
    prisma.productCategory.findMany({
      orderBy: [{ sector: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      include: {
        sector: { include: { translations: true } },
        translations: true,
        _count: { select: { productTypes: true, products: true } },
      },
    }),
    prisma.productType.findMany({
      orderBy: [{ sector: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      include: {
        sector: { include: { translations: true } },
        category: { include: { translations: true } },
        translations: true,
        _count: { select: { products: true } },
      },
    }),
    prisma.productColorVariant.findMany({
      orderBy: [{ sector: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      include: {
        sector: { include: { translations: true } },
        translations: true,
      },
    }),
  ]);
  const hasSector = sectors.length > 0;
  const hasCategory = categories.length > 0;
  const sectorOptions = sectors.map((sector) => ({
    id: sector.id,
    key: sector.key,
    name: displayName(sector.translations, sector.key),
  }));
  const categoryOptions = categories.map((category) => ({
    id: category.id,
    sectorId: category.sectorId,
    name: displayName(category.translations, category.key),
  }));

  return (
    <div className="grid gap-4">
      <header className="game-topbar">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-primary">
            Tanımlamalar
          </p>
          <h1 className="text-2xl font-semibold">Ürün Tanımları</h1>
        </div>
        <Badge variant="secondary">
          {categories.length} kategori · {productTypes.length} tip · {colors.length} renk
        </Badge>
      </header>

      {!hasSector ? (
        <Panel
          title="Önce sektör gerekli"
          description="Kategori, ürün tipi ve renk oluşturabilmek için önce Sektörler ekranından bir sektör tanımla."
        >
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            Kullanılabilir sektör bulunmuyor.
          </p>
        </Panel>
      ) : (
        <section className="grid gap-4 xl:grid-cols-3">
          <Panel
            title="Kategori oluştur"
            description="Ürün kataloğundaki üst grupları tanımlar."
          >
            <DefinitionForm
              action={createProductCategoryAction}
              submitLabel="Kategoriyi Oluştur"
            >
              <FormGrid>
                <SectorField sectors={sectors} />
                <Field label="Teknik anahtar">
                  <Input name="key" placeholder="upper_wear" required />
                </Field>
                <TranslationFields />
                <SortAndStatusFields />
              </FormGrid>
            </DefinitionForm>
          </Panel>

          <Panel
            title="Ürün tipi oluştur"
            description="Kategori altındaki gerçek ürün tiplerini tanımlar."
          >
            {hasCategory ? (
              <DefinitionForm
                action={createProductTypeAction}
                submitLabel="Ürün Tipini Oluştur"
              >
                <FormGrid>
                  <ProductTypeScopeFields
                    categories={categoryOptions}
                    sectors={sectorOptions}
                  />
                  <Field label="Teknik anahtar">
                    <Input name="key" placeholder="t_shirt" required />
                  </Field>
                  <TranslationFields />
                  <SortAndStatusFields />
                </FormGrid>
              </DefinitionForm>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ürün tipi eklemek için önce kategori oluştur.
              </p>
            )}
          </Panel>

          <Panel
            title="Renk oluştur"
            description="Teklif ve siparişlerde kullanılacak master renk havuzu."
          >
            <DefinitionForm
              action={createProductColorVariantAction}
              submitLabel="Rengi Oluştur"
            >
              <FormGrid>
                <SectorField sectors={sectors} />
                <Field label="Teknik anahtar">
                  <Input name="key" placeholder="black" required />
                </Field>
                <Field label="HEX kodu">
                  <Input name="hexCode" placeholder="#111111" required />
                </Field>
                <TranslationFields />
                <SortAndStatusFields />
              </FormGrid>
            </DefinitionForm>
          </Panel>
        </section>
      )}

      <Panel title={`Kategoriler (${categories.length})`}>
        {categories.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => {
              const isActive = category.status === "ACTIVE";

              return (
                <article
                  className="rounded-lg border border-border bg-card p-4"
                  key={category.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {displayName(category.translations, category.key)}
                      </p>
                      <p className="mt-1 font-mono text-xs text-primary">
                        {category.key}
                      </p>
                    </div>
                    <Badge variant={isActive ? "default" : "secondary"}>
                      {category.status}
                    </Badge>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {displayName(category.sector.translations, category.sector.key)} ·{" "}
                    {category._count.productTypes} tip · {category._count.products} ürün
                  </p>
                  <div className="mt-4">
                    <DefinitionStatusButton
                      entity="productCategory"
                      id={category.id}
                      isActive={isActive}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<Tags />} text="Henüz ürün kategorisi yok." />
        )}
      </Panel>

      <Panel title={`Ürün tipleri (${productTypes.length})`}>
        {productTypes.length ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Ürün Tipi</TableHead>
                  <TableHead>Sektör</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productTypes.map((productType) => {
                  const isActive = productType.status === "ACTIVE";

                  return (
                    <TableRow className="border-border" key={productType.id}>
                      <TableCell>
                        <p className="font-semibold">
                          {displayName(productType.translations, productType.key)}
                        </p>
                        <p className="font-mono text-xs text-primary">
                          {productType.key}
                        </p>
                      </TableCell>
                      <TableCell>
                        {displayName(
                          productType.sector.translations,
                          productType.sector.key,
                        )}
                      </TableCell>
                      <TableCell>
                        {displayName(
                          productType.category.translations,
                          productType.category.key,
                        )}
                      </TableCell>
                      <TableCell>{productType._count.products}</TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "default" : "secondary"}>
                          {productType.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DefinitionStatusButton
                            entity="productType"
                            id={productType.id}
                            isActive={isActive}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState icon={<Shapes />} text="Henüz ürün tipi yok." />
        )}
      </Panel>

      <Panel title={`Renkler (${colors.length})`}>
        {colors.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {colors.map((color) => {
              const isActive = color.status === "ACTIVE";

              return (
                <article
                  className="rounded-lg border border-border bg-card p-4"
                  key={color.id}
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-label={`${color.hexCode} renk örneği`}
                      className="size-10 rounded-md border border-white/15"
                      style={{ backgroundColor: color.hexCode }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {displayName(color.translations, color.key)}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {color.hexCode}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <Badge variant={isActive ? "default" : "secondary"}>
                      {color.status}
                    </Badge>
                    <DefinitionStatusButton
                      entity="productColorVariant"
                      id={color.id}
                      isActive={isActive}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<Palette />} text="Henüz ürün rengi yok." />
        )}
      </Panel>
    </div>
  );
}

function SectorField({
  sectors,
}: {
  sectors: Array<{
    id: string;
    key: string;
    translations: Array<{ locale: string; name: string }>;
  }>;
}) {
  return (
    <Field label="Sektör">
      <Select defaultValue={sectors[0]?.id} name="sectorId" required>
        {sectors.map((sector) => (
          <option key={sector.id} value={sector.id}>
            {displayName(sector.translations, sector.key)}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function TranslationFields() {
  return (
    <>
      <Field label="Türkçe ad">
        <Input name="nameTr" required />
      </Field>
      <Field label="İngilizce ad">
        <Input name="nameEn" />
      </Field>
    </>
  );
}

function SortAndStatusFields() {
  return (
    <>
      <Field label="Sıralama">
        <Input defaultValue="0" min="0" name="sortOrder" type="number" />
      </Field>
      <Field label="Durum">
        <Select defaultValue="ACTIVE" name="status">
          <Options values={enumOptions.statuses} />
        </Select>
      </Field>
    </>
  );
}

function displayName(
  translations: Array<{ locale: string; name: string }>,
  fallback: string,
) {
  return (
    translations.find((translation) => translation.locale === "tr")?.name ??
    translations[0]?.name ??
    fallback
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="py-10 text-center text-muted-foreground">
      <span className="mx-auto block w-fit text-primary">{icon}</span>
      <p className="mt-3">{text}</p>
    </div>
  );
}
