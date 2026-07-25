import { Badge } from "@/components/ui/badge";
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
  saveCustomerSegmentAction,
  saveCustomerVolumeClassAction,
  saveVirtualCustomerAction,
} from "./customer-actions";
import {
  CustomerScopeFields,
  type CustomerScopeOption,
} from "./customer-scope-fields";

type Translation = {
  locale: string;
  name: string;
  description: string | null;
};

type SectorOption = {
  id: string;
  label: string;
};

type SegmentValues = {
  sectorId: string;
  key: string;
  nameTr: string;
  nameEn: string;
  descriptionTr: string;
  descriptionEn: string;
  sortOrder: number;
  status: string;
  tierWeights: string;
  categoryWeights: string;
  priceMultiplierBps: number;
  qualityExpectationBps: number;
  deliveryPressureBps: number;
  metadata: string;
};

type VolumeValues = {
  sectorId: string;
  key: string;
  nameTr: string;
  nameEn: string;
  descriptionTr: string;
  descriptionEn: string;
  sortOrder: number;
  status: string;
  quantityMultiplierBps: number;
  priceMultiplierBps: number;
  targetProductionDayMin: number;
  targetProductionDayMax: number;
  itemCountMin: number;
  itemCountMax: number;
  maxOfferLoadBps: number;
  tierQuantityCaps: string;
  metadata: string;
};

type CustomerValues = {
  sectorId: string;
  customerSegmentId: string;
  customerVolumeClassId: string;
  productTier: "BASIC" | "STANDARD" | "PREMIUM" | "LUXURY";
  key: string;
  name: string;
  countryCode: string;
  minOperatingStageId: string | null;
  maxOperatingStageId: string | null;
  trustRequirementBps: number;
  status: string;
  metadata: string;
};

export default async function CustomersPage() {
  const prisma = getPrisma();
  const [sectors, segments, volumeClasses, operatingStages, customers] =
    await Promise.all([
      prisma.sector.findMany({
        orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
        include: { translations: true },
      }),
      prisma.customerSegment.findMany({
        orderBy: [
          { sector: { sortOrder: "asc" } },
          { sortOrder: "asc" },
          { key: "asc" },
        ],
        include: {
          sector: { include: { translations: true } },
          translations: true,
          _count: { select: { virtualCustomers: true } },
        },
      }),
      prisma.customerVolumeClass.findMany({
        orderBy: [
          { sector: { sortOrder: "asc" } },
          { sortOrder: "asc" },
          { key: "asc" },
        ],
        include: {
          sector: { include: { translations: true } },
          translations: true,
          _count: { select: { virtualCustomers: true } },
        },
      }),
      prisma.sectorFactoryOperatingStage.findMany({
        orderBy: [
          { sector: { sortOrder: "asc" } },
          { sortOrder: "asc" },
        ],
        include: { translations: true },
      }),
      prisma.virtualCustomer.findMany({
        orderBy: [
          { sector: { sortOrder: "asc" } },
          { name: "asc" },
        ],
        include: {
          sector: { include: { translations: true } },
          customerSegment: { include: { translations: true } },
          customerVolumeClass: { include: { translations: true } },
          minOperatingStage: { include: { translations: true } },
          maxOperatingStage: { include: { translations: true } },
        },
      }),
    ]);

  const sectorOptions: SectorOption[] = sectors.map((sector) => ({
    id: sector.id,
    label: displayName(sector.translations, sector.key),
  }));
  const segmentOptions: CustomerScopeOption[] = segments.map((segment) => ({
    id: segment.id,
    sectorId: segment.sectorId,
    label: displayName(segment.translations, segment.key),
  }));
  const volumeOptions: CustomerScopeOption[] = volumeClasses.map(
    (volumeClass) => ({
      id: volumeClass.id,
      sectorId: volumeClass.sectorId,
      label: displayName(volumeClass.translations, volumeClass.key),
    }),
  );
  const stageOptions: CustomerScopeOption[] = operatingStages.map((stage) => ({
    id: stage.id,
    sectorId: stage.sectorId,
    label: displayName(stage.translations, stage.key),
  }));
  const canCreateCustomer = sectorOptions.some(
    (sector) =>
      segmentOptions.some((segment) => segment.sectorId === sector.id) &&
      volumeOptions.some((volumeClass) => volumeClass.sectorId === sector.id),
  );

  return (
    <div className="grid gap-4">
      <header className="game-topbar">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-primary">
            Pazar ve Simülasyon
          </p>
          <h1 className="text-2xl font-semibold">Müşteri Tanımları</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Segment davranışını, sipariş hacmini ve sanal müşteri markalarını ayrı yönet.
          </p>
        </div>
        <Badge variant="secondary">
          {segments.length} segment · {volumeClasses.length} hacim · {customers.length} müşteri
        </Badge>
      </header>

      {!sectorOptions.length ? (
        <Panel
          title="Önce sektör gerekli"
          description="Müşteri tanımları oluşturabilmek için önce en az bir sektör tanımla."
        >
          <p className="text-sm text-muted-foreground">
            Kullanılabilir sektör bulunmuyor.
          </p>
        </Panel>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-2">
            <Panel
              title="Yeni müşteri segmenti"
              description="Fiyat davranışı, kalite beklentisi ve termin baskısı. Ürün grubu müşteri kaydında seçilir."
            >
              <form
                action={saveCustomerSegmentAction.bind(null, null)}
                className="grid gap-4"
              >
                <SegmentFields sectors={sectorOptions} />
                <SubmitButton label="Segment Oluştur" />
              </form>
            </Panel>

            <Panel
              title="Yeni hacim sınıfı"
              description="Sipariş büyüklüğü, üretim yükü ve kaç ürün satırı içereceği."
            >
              <form
                action={saveCustomerVolumeClassAction.bind(null, null)}
                className="grid gap-4"
              >
                <VolumeFields sectors={sectorOptions} />
                <SubmitButton label="Hacim Sınıfı Oluştur" />
              </form>
            </Panel>
          </section>

          <Panel
            title="Yeni sanal müşteri / marka"
            description="Müşteri kimliği, bir segment ile bir hacim sınıfını birleştirir."
          >
            {canCreateCustomer ? (
              <form
                action={saveVirtualCustomerAction.bind(null, null)}
                className="grid gap-4"
              >
                <CustomerFields
                  operatingStages={stageOptions}
                  sectors={sectorOptions}
                  segments={segmentOptions}
                  volumeClasses={volumeOptions}
                />
                <SubmitButton label="Müşteri Oluştur" />
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                Müşteri oluşturmak için aynı sektörde en az bir segment ve hacim sınıfı gerekli.
              </p>
            )}
          </Panel>
        </>
      )}

      <DefinitionList
        emptyText="Henüz müşteri segmenti yok."
        title={`Müşteri segmentleri (${segments.length})`}
      >
        {segments.map((segment) => {
          const values: SegmentValues = {
            sectorId: segment.sectorId,
            key: segment.key,
            nameTr: translatedValue(segment.translations, "tr", "name"),
            nameEn: translatedValue(segment.translations, "en", "name"),
            descriptionTr: translatedValue(
              segment.translations,
              "tr",
              "description",
            ),
            descriptionEn: translatedValue(
              segment.translations,
              "en",
              "description",
            ),
            sortOrder: segment.sortOrder,
            status: segment.status,
            tierWeights: jsonText(segment.tierWeights),
            categoryWeights: jsonText(segment.categoryWeights),
            priceMultiplierBps: segment.priceMultiplierBps,
            qualityExpectationBps: segment.qualityExpectationBps,
            deliveryPressureBps: segment.deliveryPressureBps,
            metadata: jsonText(segment.metadata),
          };
          return (
            <EditableDefinition
              badge={`${segment._count.virtualCustomers} müşteri`}
              key={segment.id}
              subtitle={displayName(
                segment.sector.translations,
                segment.sector.key,
              )}
              title={displayName(segment.translations, segment.key)}
            >
              <form
                action={saveCustomerSegmentAction.bind(null, segment.id)}
                className="grid gap-4"
              >
                <SegmentFields sectors={sectorOptions} values={values} />
                <SubmitButton label="Segmenti Güncelle" />
              </form>
            </EditableDefinition>
          );
        })}
      </DefinitionList>

      <DefinitionList
        emptyText="Henüz müşteri hacim sınıfı yok."
        title={`Hacim sınıfları (${volumeClasses.length})`}
      >
        {volumeClasses.map((volumeClass) => {
          const values: VolumeValues = {
            sectorId: volumeClass.sectorId,
            key: volumeClass.key,
            nameTr: translatedValue(volumeClass.translations, "tr", "name"),
            nameEn: translatedValue(volumeClass.translations, "en", "name"),
            descriptionTr: translatedValue(
              volumeClass.translations,
              "tr",
              "description",
            ),
            descriptionEn: translatedValue(
              volumeClass.translations,
              "en",
              "description",
            ),
            sortOrder: volumeClass.sortOrder,
            status: volumeClass.status,
            quantityMultiplierBps: volumeClass.quantityMultiplierBps,
            priceMultiplierBps: volumeClass.priceMultiplierBps,
            targetProductionDayMin: volumeClass.targetProductionDayMin,
            targetProductionDayMax: volumeClass.targetProductionDayMax,
            itemCountMin: volumeClass.itemCountMin,
            itemCountMax: volumeClass.itemCountMax,
            maxOfferLoadBps: volumeClass.maxOfferLoadBps,
            tierQuantityCaps: jsonText(volumeClass.tierQuantityCaps),
            metadata: jsonText(volumeClass.metadata),
          };
          return (
            <EditableDefinition
              badge={`${volumeClass._count.virtualCustomers} müşteri`}
              key={volumeClass.id}
              subtitle={displayName(
                volumeClass.sector.translations,
                volumeClass.sector.key,
              )}
              title={displayName(volumeClass.translations, volumeClass.key)}
            >
              <form
                action={saveCustomerVolumeClassAction.bind(
                  null,
                  volumeClass.id,
                )}
                className="grid gap-4"
              >
                <VolumeFields sectors={sectorOptions} values={values} />
                <SubmitButton label="Hacim Sınıfını Güncelle" />
              </form>
            </EditableDefinition>
          );
        })}
      </DefinitionList>

      <DefinitionList
        emptyText="Henüz sanal müşteri tanımı yok."
        title={`Sanal müşteriler / markalar (${customers.length})`}
      >
        {customers.map((customer) => {
          const values: CustomerValues = {
            sectorId: customer.sectorId,
            customerSegmentId: customer.customerSegmentId,
            customerVolumeClassId: customer.customerVolumeClassId,
            productTier: customer.productTier,
            key: customer.key,
            name: customer.name,
            countryCode: customer.countryCode ?? "",
            minOperatingStageId: customer.minOperatingStageId,
            maxOperatingStageId: customer.maxOperatingStageId,
            trustRequirementBps: customer.trustRequirementBps,
            status: customer.status,
            metadata: jsonText(customer.metadata),
          };
          return (
            <EditableDefinition
              badge={`${customer.productTier} · ${customer.status}`}
              key={customer.id}
              subtitle={`${displayName(customer.customerSegment.translations, customer.customerSegment.key)} · ${displayName(customer.customerVolumeClass.translations, customer.customerVolumeClass.key)}`}
              title={customer.name}
            >
              <form
                action={saveVirtualCustomerAction.bind(null, customer.id)}
                className="grid gap-4"
              >
                <CustomerFields
                  operatingStages={stageOptions}
                  sectors={sectorOptions}
                  segments={segmentOptions}
                  values={values}
                  volumeClasses={volumeOptions}
                />
                <SubmitButton label="Müşteriyi Güncelle" />
              </form>
            </EditableDefinition>
          );
        })}
      </DefinitionList>
    </div>
  );
}

function SegmentFields({
  sectors,
  values,
}: {
  sectors: SectorOption[];
  values?: SegmentValues;
}) {
  return (
    <>
      <FormGrid>
        <SectorField sectors={sectors} value={values?.sectorId} />
        <IdentityFields values={values} />
        <MultiplierField
          defaultValue={values?.priceMultiplierBps ?? 10000}
          label="Fiyat çarpanı (bps)"
          name="priceMultiplierBps"
        />
        <MultiplierField
          defaultValue={values?.qualityExpectationBps ?? 10000}
          label="Kalite beklentisi (bps)"
          name="qualityExpectationBps"
        />
        <MultiplierField
          defaultValue={values?.deliveryPressureBps ?? 10000}
          label="Termin baskısı (bps)"
          name="deliveryPressureBps"
        />
      </FormGrid>
      <section className="grid gap-4 lg:grid-cols-2">
        <JsonField
          defaultValue={values?.tierWeights}
          hint='Örnek: {"BASIC":10,"STANDARD":30,"PREMIUM":40,"LUXURY":20}'
          label="Eski tier ağırlıkları (motor kullanmıyor)"
          name="tierWeights"
        />
        <JsonField
          defaultValue={values?.categoryWeights}
          hint='Kategori anahtarı ve ağırlığı. Örnek: {"tshirt":40,"hoodie":20}'
          label="Kategori ağırlıkları"
          name="categoryWeights"
        />
      </section>
      <JsonField
        defaultValue={values?.metadata}
        label="Metadata JSON"
        name="metadata"
      />
    </>
  );
}

function VolumeFields({
  sectors,
  values,
}: {
  sectors: SectorOption[];
  values?: VolumeValues;
}) {
  return (
    <>
      <FormGrid>
        <SectorField sectors={sectors} value={values?.sectorId} />
        <IdentityFields values={values} />
        <MultiplierField
          defaultValue={values?.quantityMultiplierBps ?? 10000}
          label="Adet çarpanı (bps)"
          name="quantityMultiplierBps"
        />
        <MultiplierField
          defaultValue={values?.priceMultiplierBps ?? 10000}
          label="Fiyat çarpanı (bps)"
          name="priceMultiplierBps"
        />
        <NumberField
          defaultValue={values?.targetProductionDayMin ?? 3}
          label="Hedef üretim günü min."
          min={1}
          name="targetProductionDayMin"
        />
        <NumberField
          defaultValue={values?.targetProductionDayMax ?? 8}
          label="Hedef üretim günü maks."
          min={1}
          name="targetProductionDayMax"
        />
        <NumberField
          defaultValue={values?.itemCountMin ?? 1}
          label="Ürün satırı min."
          min={1}
          name="itemCountMin"
        />
        <NumberField
          defaultValue={values?.itemCountMax ?? 1}
          label="Ürün satırı maks."
          min={1}
          name="itemCountMax"
        />
        <NumberField
          defaultValue={values?.maxOfferLoadBps ?? 7000}
          hint="10.000 = fabrikanın hesaplanan teklif kapasitesinin %100'ü."
          label="Maksimum teklif yükü (bps)"
          max={10000}
          min={1}
          name="maxOfferLoadBps"
        />
      </FormGrid>
      <JsonField
        defaultValue={values?.tierQuantityCaps}
        hint='Örnek: {"BASIC":{"min":1000,"max":20000},"LUXURY":{"min":100,"max":5000}}'
        label="Tier adet sınırları"
        name="tierQuantityCaps"
      />
      <JsonField
        defaultValue={values?.metadata}
        label="Metadata JSON"
        name="metadata"
      />
    </>
  );
}

function CustomerFields({
  sectors,
  segments,
  volumeClasses,
  operatingStages,
  values,
}: {
  sectors: SectorOption[];
  segments: CustomerScopeOption[];
  volumeClasses: CustomerScopeOption[];
  operatingStages: CustomerScopeOption[];
  values?: CustomerValues;
}) {
  return (
    <>
      <FormGrid>
        <CustomerScopeFields
          initialMaxOperatingStageId={values?.maxOperatingStageId}
          initialMinOperatingStageId={values?.minOperatingStageId}
          initialSectorId={values?.sectorId}
          initialSegmentId={values?.customerSegmentId}
          initialVolumeClassId={values?.customerVolumeClassId}
          operatingStages={operatingStages}
          sectors={sectors}
          segments={segments}
          volumeClasses={volumeClasses}
        />
        <Field label="Teknik anahtar">
          <Input defaultValue={values?.key} name="key" required />
        </Field>
        <Field label="Müşteri / marka adı">
          <Input defaultValue={values?.name} name="name" required />
        </Field>
        <Field
          label="Ürün grubu"
          hint="Bu müşteri yalnızca seçilen gruptaki ürünlerden sipariş verir."
        >
          <Select defaultValue={values?.productTier ?? "BASIC"} name="productTier">
            <Options values={enumOptions.tiers} />
          </Select>
        </Field>
        <Field label="Ülke kodu" hint="İki harfli ISO kodu: TR, DE, US gibi.">
          <Input
            defaultValue={values?.countryCode}
            maxLength={2}
            name="countryCode"
            placeholder="TR"
          />
        </Field>
        <NumberField
          defaultValue={values?.trustRequirementBps ?? 0}
          hint="Yüksek değer, müşterinin teklif seçim ağırlığını düşürür."
          label="Güven gereksinimi"
          min={0}
          name="trustRequirementBps"
        />
        <StatusField value={values?.status} />
      </FormGrid>
      <JsonField
        defaultValue={values?.metadata}
        label="Metadata JSON"
        name="metadata"
      />
    </>
  );
}

function IdentityFields({
  values,
}: {
  values?: Pick<
    SegmentValues,
    | "key"
    | "nameTr"
    | "nameEn"
    | "descriptionTr"
    | "descriptionEn"
    | "sortOrder"
    | "status"
  >;
}) {
  return (
    <>
      <Field label="Teknik anahtar">
        <Input defaultValue={values?.key} name="key" required />
      </Field>
      <Field label="Türkçe ad">
        <Input defaultValue={values?.nameTr} name="nameTr" required />
      </Field>
      <Field label="İngilizce ad">
        <Input defaultValue={values?.nameEn} name="nameEn" />
      </Field>
      <Field label="Türkçe açıklama">
        <Input defaultValue={values?.descriptionTr} name="descriptionTr" />
      </Field>
      <Field label="İngilizce açıklama">
        <Input defaultValue={values?.descriptionEn} name="descriptionEn" />
      </Field>
      <NumberField
        defaultValue={values?.sortOrder ?? 0}
        label="Sıralama"
        min={0}
        name="sortOrder"
      />
      <StatusField value={values?.status} />
    </>
  );
}

function SectorField({
  sectors,
  value,
}: {
  sectors: SectorOption[];
  value?: string;
}) {
  return (
    <Field label="Sektör">
      <Select defaultValue={value ?? sectors[0]?.id} name="sectorId" required>
        {sectors.map((sector) => (
          <option key={sector.id} value={sector.id}>
            {sector.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function StatusField({ value }: { value?: string }) {
  return (
    <Field label="Durum">
      <Select defaultValue={value ?? "ACTIVE"} name="status">
        <Options values={enumOptions.statuses} />
      </Select>
    </Field>
  );
}

function NumberField({
  name,
  label,
  defaultValue,
  min,
  max,
  hint,
}: {
  name: string;
  label: string;
  defaultValue: number;
  min: number;
  max?: number;
  hint?: string;
}) {
  return (
    <Field hint={hint} label={label}>
      <Input
        defaultValue={defaultValue}
        max={max}
        min={min}
        name={name}
        required
        type="number"
      />
    </Field>
  );
}

function MultiplierField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number;
}) {
  return (
    <NumberField
      defaultValue={defaultValue}
      hint="10.000 = 1,00 kat."
      label={label}
      min={1}
      name={name}
    />
  );
}

function JsonField({
  name,
  label,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <Field hint={hint} label={label}>
      <Textarea defaultValue={defaultValue ?? ""} name={name} />
    </Field>
  );
}

function DefinitionList({
  title,
  emptyText,
  children,
}: {
  title: string;
  emptyText: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <Panel title={title}>
      {hasChildren ? (
        <div className="grid gap-3">{children}</div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}
    </Panel>
  );
}

function EditableDefinition({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-lg border border-border bg-card p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span>
          <span className="block font-semibold">{title}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{subtitle}</span>
        </span>
        <Badge variant="outline">{badge}</Badge>
      </summary>
      <div className="mt-5 border-t border-border pt-5">{children}</div>
    </details>
  );
}

function SubmitButton({ label }: { label: string }) {
  return (
    <button className="game-button-primary w-full sm:w-fit" type="submit">
      {label}
    </button>
  );
}

function displayName(translations: Translation[], fallback: string) {
  return (
    translations.find((translation) => translation.locale === "tr")?.name ??
    translations.find((translation) => translation.locale === "en")?.name ??
    fallback
  );
}

function translatedValue(
  translations: Translation[],
  locale: string,
  field: "name" | "description",
) {
  return translations.find((translation) => translation.locale === locale)?.[
    field
  ] ?? "";
}
