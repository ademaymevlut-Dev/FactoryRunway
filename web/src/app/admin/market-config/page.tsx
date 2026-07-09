import type { ReactNode } from "react";
import {
  CalendarDays,
  PackageCheck,
  PackagePlus,
  ShoppingBag,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ContentStatus, TutorialKey } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

import { jsonText } from "../admin-data";
import {
  Field,
  FormGrid,
  Input,
  Options,
  Panel,
  Select,
  Textarea,
  enumOptions,
} from "../form-ui";
import {
  deleteFirstOrderOptionAction,
  saveFirstOrderOptionAction,
} from "./first-order-actions";

type Translation = {
  locale: string;
  name: string;
};

type SectorOption = {
  id: string;
  label: string;
};

type ProductOption = {
  id: string;
  label: string;
  sectorId: string;
};

type FirstOrderValues = {
  sectorId: string;
  productId: string;
  tutorialKey: string;
  defaultQuantity: number;
  targetDeliveryDays: number;
  sortOrder: number;
  status: string;
  metadata: string;
};

const maxOptionsPerSector = 3;

export default async function MarketConfigPage() {
  const prisma = getPrisma();
  const [sectors, products, firstOrderOptions] = await Promise.all([
    prisma.sector.findMany({
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
      include: { translations: true },
    }),
    prisma.product.findMany({
      where: { status: { not: ContentStatus.ARCHIVED } },
      orderBy: [
        { sector: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
      include: {
        sector: { include: { translations: true } },
        category: { include: { translations: true } },
        productType: { include: { translations: true } },
      },
    }),
    prisma.firstOrderProductOption.findMany({
      orderBy: [
        { sector: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { product: { name: "asc" } },
      ],
      include: {
        sector: { include: { translations: true } },
        product: {
          include: {
            category: { include: { translations: true } },
            productType: { include: { translations: true } },
          },
        },
      },
    }),
  ]);

  const sectorOptions = sectors.map((sector) => ({
    id: sector.id,
    label: displayName(sector.translations, sector.key),
  }));
  const productOptions = products.map((product) => ({
    id: product.id,
    sectorId: product.sectorId,
    label: [
      displayName(product.sector.translations, product.sector.key),
      product.name,
      displayName(product.category.translations, product.category.key),
    ].join(" · "),
  }));
  const activeFirstOrderCount = firstOrderOptions.filter(
    (option) => option.status === ContentStatus.ACTIVE,
  ).length;
  const sectorOptionCounts = new Map<string, number>();

  firstOrderOptions.forEach((option) => {
    sectorOptionCounts.set(
      option.sectorId,
      (sectorOptionCounts.get(option.sectorId) ?? 0) + 1,
    );
  });

  return (
    <div className="grid gap-4">
      <header className="game-topbar gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-primary">
            Pazar ve Simülasyon
          </p>
          <h1 className="text-2xl font-semibold">İlk Sipariş Ürünleri</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Oyuncunun fabrika kurulumundan sonra göreceği üç başlangıç sipariş ürününü yönet.
          </p>
        </div>
        <Badge variant="secondary">
          {activeFirstOrderCount} aktif seçenek
        </Badge>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <Metric
          icon={<ShoppingBag size={18} />}
          label="Ürün kataloğu"
          value={products.length}
        />
        <Metric
          icon={<PackageCheck size={18} />}
          label="İlk sipariş seçeneği"
          value={firstOrderOptions.length}
        />
        <Metric
          icon={<CalendarDays size={18} />}
          label="Aktif seçenek"
          value={activeFirstOrderCount}
        />
      </section>

      {sectorOptions.length && productOptions.length ? (
        <Panel
          title="Yeni ilk sipariş ürünü"
          description="Her sektör için en fazla 3 ürün tanımlanabilir. Ürün seçimi aynı sektörle uyumlu olmalı."
        >
          <form
            action={saveFirstOrderOptionAction.bind(null, null)}
            className="grid gap-4"
          >
            <FirstOrderFields
              products={productOptions}
              sectors={sectorOptions}
              values={{
                sectorId: sectorOptions[0]?.id ?? "",
                productId: productOptions[0]?.id ?? "",
                tutorialKey: TutorialKey.FIRST_ORDER,
                defaultQuantity: 100,
                targetDeliveryDays: 3,
                sortOrder: firstOrderOptions.length,
                status: ContentStatus.ACTIVE,
                metadata: "",
              }}
            />
            <button className="game-button-primary w-full sm:w-fit" type="submit">
              İlk Sipariş Ürünü Ekle
            </button>
          </form>
        </Panel>
      ) : (
        <Panel
          title="Ürün kataloğu gerekli"
          description="İlk sipariş seçeneği oluşturmak için en az bir sektör ve arşivlenmemiş ürün kaydı olmalı."
        >
          <p className="text-sm text-muted-foreground">
            Kullanılabilir sektör veya ürün bulunmuyor.
          </p>
        </Panel>
      )}

      <Panel
        title={`Tanımlı ilk sipariş ürünleri (${firstOrderOptions.length})`}
        description="Miktar ve termin bilgileri oyuncunun ilk sipariş seçim ekranında kullanılacak."
      >
        {firstOrderOptions.length ? (
          <div className="grid gap-4 xl:grid-cols-3">
            {firstOrderOptions.map((option) => {
              const sectorName = displayName(
                option.sector.translations,
                option.sector.key,
              );
              const values: FirstOrderValues = {
                sectorId: option.sectorId,
                productId: option.productId,
                tutorialKey: option.tutorialKey,
                defaultQuantity: option.defaultQuantity,
                targetDeliveryDays: option.targetDeliveryDays,
                sortOrder: option.sortOrder,
                status: option.status,
                metadata: jsonText(option.metadata),
              };

              return (
                <section
                  className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm"
                  key={option.id}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        {option.product.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {sectorName} ·{" "}
                        {displayName(
                          option.product.productType.translations,
                          option.product.productType.key,
                        )}
                      </p>
                    </div>
                    <Badge
                      variant={
                        option.status === ContentStatus.ACTIVE
                          ? "default"
                          : "secondary"
                      }
                    >
                      {option.status}
                    </Badge>
                  </div>

                  <div className="mb-4 grid gap-2 text-sm sm:grid-cols-3">
                    <InfoPill label="Sıra" value={option.sortOrder} />
                    <InfoPill label="Adet" value={option.defaultQuantity} />
                    <InfoPill label="Termin" value={`${option.targetDeliveryDays} gün`} />
                  </div>

                  <form
                    action={saveFirstOrderOptionAction.bind(null, option.id)}
                    className="grid gap-4"
                  >
                    <FirstOrderFields
                      products={productOptions}
                      sectors={sectorOptions}
                      values={values}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button className="game-button-primary" type="submit">
                        Güncelle
                      </button>
                      <button
                        className="game-button-ghost"
                        formAction={deleteFirstOrderOptionAction.bind(
                          null,
                          option.id,
                        )}
                        formNoValidate
                        type="submit"
                      >
                        Sil
                      </button>
                    </div>
                  </form>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <PackagePlus className="mx-auto text-primary" size={24} />
            <p className="mt-3 text-sm text-muted-foreground">
              Henüz ilk sipariş ürünü tanımlanmadı.
            </p>
          </div>
        )}
      </Panel>

      {sectorOptions.length ? (
        <Panel
          title="Sektör durumu"
          description="Oyuncuya gösterilecek ilk sipariş ekranı için hedef her aktif sektörün 3 seçeneğe sahip olmasıdır."
        >
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {sectorOptions.map((sector) => {
              const count = sectorOptionCounts.get(sector.id) ?? 0;

              return (
                <div
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary px-4 py-3 text-sm"
                  key={sector.id}
                >
                  <span className="font-semibold text-secondary-foreground">
                    {sector.label}
                  </span>
                  <Badge
                    variant={count === maxOptionsPerSector ? "default" : "secondary"}
                  >
                    {count}/{maxOptionsPerSector}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function FirstOrderFields({
  sectors,
  products,
  values,
}: {
  sectors: SectorOption[];
  products: ProductOption[];
  values: FirstOrderValues;
}) {
  return (
    <>
      <FormGrid>
        <Field label="Sektör">
          <Select defaultValue={values.sectorId} name="sectorId" required>
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Ürün"
          hint="Ürün ve sektör uyumu kaydetme sırasında kontrol edilir."
        >
          <Select defaultValue={values.productId} name="productId" required>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tutorial">
          <Select defaultValue={values.tutorialKey} name="tutorialKey">
            <Options values={[TutorialKey.FIRST_ORDER]} />
          </Select>
        </Field>
        <Field label="Sipariş adedi">
          <Input
            defaultValue={values.defaultQuantity}
            min="1"
            name="defaultQuantity"
            required
            step="1"
            type="number"
          />
        </Field>
        <Field label="Hedef teslim (gün)">
          <Input
            defaultValue={values.targetDeliveryDays}
            min="1"
            name="targetDeliveryDays"
            required
            step="1"
            type="number"
          />
        </Field>
        <Field label="Sıra">
          <Input
            defaultValue={values.sortOrder}
            min="0"
            name="sortOrder"
            required
            step="1"
            type="number"
          />
        </Field>
        <Field label="Durum">
          <Select defaultValue={values.status} name="status">
            <Options values={enumOptions.statuses} />
          </Select>
        </Field>
      </FormGrid>
      <Field
        label="Metadata JSON"
        hint="İleride ilk sipariş kartına özel not, zorluk veya teklif etiketi için kullanılabilir."
      >
        <Textarea defaultValue={values.metadata} name="metadata" />
      </Field>
    </>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="game-card flex items-center gap-4 p-4">
      <div className="game-icon-button">{icon}</div>
      <div>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs uppercase tracking-[.14em] text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-secondary px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-semibold text-secondary-foreground">{value}</p>
    </div>
  );
}

function displayName(translations: Translation[], fallback: string) {
  return (
    translations.find((translation) => translation.locale === "tr")?.name ??
    translations.find((translation) => translation.locale === "en")?.name ??
    fallback
  );
}
