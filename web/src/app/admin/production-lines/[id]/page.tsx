import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Gauge, Ruler, Users } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { getPrisma } from "@/lib/db";
import { calculateDirectLineCost } from "@/lib/production-line-cost";

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
import { SectorDepartmentSelects } from "../../relation-selects";
import { LineUploadForm } from "../line-upload-form";
import {
  deleteProductionLineStaffRequirementAction,
  saveProductionLineStaffRequirementAction,
  updateProductionLineBasicsAction,
  updateProductionLineCapacityAction,
  updateProductionLineCostsAction,
} from "../production-line-actions";
import { LineActionForm } from "./line-action-form";
import { LineDetailTabs } from "./line-detail-tabs";

export default async function LineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prisma = getPrisma();
  const line = await prisma.productionLineTemplate.findUnique({
    where: { id },
    include: {
      sector: { include: { translations: true } },
      department: { include: { translations: true } },
      staffRequirements: {
        orderBy: [{ sortOrder: "asc" }, { staffRole: { key: "asc" } }],
        include: {
          staffRole: { include: { translations: true } },
        },
      },
      visualAssets: { orderBy: { variant: "asc" } },
      _count: {
        select: {
          factoryProductionLines: true,
        },
      },
    },
  });

  if (!line) notFound();

  const [sectors, departments, staffRoles, costConfig] = await Promise.all([
    prisma.sector.findMany({
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
      include: { translations: true },
    }),
    prisma.department.findMany({
      where: { kind: "PRODUCTION", status: "ACTIVE" },
      orderBy: [{ routeOrder: "asc" }, { key: "asc" }],
      include: { translations: true },
    }),
    prisma.staffRole.findMany({
      where: {
        sectorId: line.sectorId,
        departmentId: line.departmentId,
        staffType: "DIRECT_PRODUCTION",
        status: "ACTIVE",
      },
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
      include: { translations: true },
    }),
    prisma.sectorOperatingCostConfig.findUnique({
      where: { sectorId: line.sectorId },
    }),
  ]);

  const sectorOptions = sectors.map((sector) => ({
    id: sector.id,
    key: sector.key,
    name: displayName(sector.translations, sector.key),
  }));
  const departmentOptions = departments.map((department) => ({
    id: department.id,
    key: department.key,
    name: displayName(department.translations, department.key),
    sectorId: department.sectorId,
  }));
  const costBreakdown = calculateDirectLineCost({
    idealStaff: line.idealStaff,
    dailyPointCapacity: line.dailyPointCapacity,
    areaM2: line.areaM2,
    monthlyElectricityBaseCents: line.monthlyElectricityBaseCents,
    departmentOverheadPerLineCents:
      line.department.monthlyOverheadPerLineCents,
    monthlyWorkDays: costConfig?.monthlyWorkDays ?? 22,
    rentPerM2Cents: costConfig?.rentPerM2Cents ?? 0,
    dailyMealPerDirectStaffCents:
      costConfig?.dailyMealPerDirectStaffCents ?? 0,
    directStaffOverheadPerStaffCents:
      costConfig?.directStaffOverheadPerStaffCents ?? 0,
    staffRequirements: line.staffRequirements.map((requirement) => ({
      requiredQuantity: requirement.requiredQuantity,
      monthlySalaryCents: requirement.staffRole.monthlySalaryCents,
    })),
  });

  return (
    <div className="grid gap-4">
      <header className="game-topbar gap-4">
        <div className="flex items-center gap-3">
          <Link
            aria-label="Üretim hattı listesine dön"
            className="game-icon-button"
            href="/admin/production-lines"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="font-mono text-xs text-primary">{line.key}</p>
            <h1 className="text-2xl font-semibold">
              {displayName(
                line.department.translations,
                line.department.key,
              )}{" "}
              · {line.grade}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {displayName(line.sector.translations, line.sector.key)}
            </p>
          </div>
        </div>
        <Badge variant={line.status === "ACTIVE" ? "default" : "secondary"}>
          {line.status}
        </Badge>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric
          icon={<Gauge />}
          label="Günlük kapasite"
          value={`${line.dailyPointCapacity.toLocaleString("tr-TR")} puan`}
        />
        <Metric
          icon={<Users />}
          label="İdeal personel"
          value={`${line.idealStaff} kişi`}
        />
        <Metric
          icon={<Ruler />}
          label="Üretim alanı"
          value={`${line.areaM2} m²`}
        />
      </section>

      <LineDetailTabs
        basics={
          <Panel
            description="Kimlik, bağlı üretim departmanı, derece ve yayın durumunu yönet."
            title="Ana hat bilgileri"
          >
            <LineActionForm
              action={updateProductionLineBasicsAction.bind(null, line.id)}
              buttonLabel="Ana Bilgileri Kaydet"
            >
              <FormGrid>
                <SectorDepartmentSelects
                  defaults={{
                    sectorId: line.sectorId,
                    departmentId: line.departmentId,
                  }}
                  departments={departmentOptions}
                  sectors={sectorOptions}
                />
                <Field label="Teknik anahtar">
                  <Input defaultValue={line.key} name="key" required />
                </Field>
                <Field label="Üretim derecesi">
                  <Select defaultValue={line.grade} name="grade">
                    <Options values={enumOptions.grades} />
                  </Select>
                </Field>
                <NumberField
                  label="Sıralama"
                  name="sortOrder"
                  value={line.sortOrder}
                />
                <Field label="Durum">
                  <Select defaultValue={line.status} name="status">
                    <Options values={enumOptions.statuses} />
                  </Select>
                </Field>
              </FormGrid>
              <Field label="Metadata JSON">
                <Textarea
                  defaultValue={jsonText(line.metadata)}
                  name="metadata"
                />
              </Field>
              {line._count.factoryProductionLines > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Bu template {line._count.factoryProductionLines} gerçek
                  fabrika hattında kullanılıyor. Sektör ve departman değişimi
                  korunur.
                </p>
              ) : null}
            </LineActionForm>
          </Panel>
        }
        capacity={
          <Panel
            description="Makine sayısı, günlük puan kapasitesi ve üretim alanını yönet. İdeal personel rol toplamından otomatik gelir."
            title="Kapasite ve alan"
          >
            <LineActionForm
              action={updateProductionLineCapacityAction.bind(null, line.id)}
              buttonLabel="Kapasiteyi Kaydet"
            >
              <FormGrid>
                <NumberField
                  label="Makine sayısı"
                  name="machineCount"
                  value={line.machineCount}
                />
                <NumberField
                  label="Günlük point kapasitesi"
                  name="dailyPointCapacity"
                  value={line.dailyPointCapacity}
                />
                <NumberField
                  label="Üretim alanı (m²)"
                  name="areaM2"
                  value={line.areaM2}
                />
                <Field
                  hint="Personel Rolleri TAB’ındaki adetlerin toplamıdır."
                  label="İdeal personel"
                >
                  <Input
                    disabled
                    readOnly
                    value={line.idealStaff}
                  />
                </Field>
              </FormGrid>
            </LineActionForm>
          </Panel>
        }
        staff={
          <Panel
            description="Hat için gerekli direkt üretim rollerini tanımla. Her değişiklik ideal personel ve doğrudan maliyeti yeniden hesaplar."
            title={`Personel rolleri · ${line.idealStaff} kişi`}
          >
            <div className="grid gap-4">
              {line.staffRequirements.map((requirement) => (
                <div
                  className="rounded-lg border border-border bg-muted/20 p-4"
                  key={requirement.id}
                >
                  <LineActionForm
                    action={saveProductionLineStaffRequirementAction.bind(
                      null,
                      line.id,
                      requirement.id,
                    )}
                    buttonLabel="Rol Satırını Güncelle"
                  >
                    <FormGrid>
                      <StaffRoleField
                        defaultValue={requirement.staffRoleId}
                        staffRoles={staffRoles}
                      />
                      <NumberField
                        label="Gerekli adet"
                        min={1}
                        name="requiredQuantity"
                        value={requirement.requiredQuantity}
                      />
                      <NumberField
                        label="Sıralama"
                        name="sortOrder"
                        value={requirement.sortOrder}
                      />
                    </FormGrid>
                  </LineActionForm>
                  <form
                    action={deleteProductionLineStaffRequirementAction.bind(
                      null,
                      line.id,
                      requirement.id,
                    )}
                    className="mt-2"
                  >
                    <button className="game-button-ghost" type="submit">
                      Rol Satırını Sil
                    </button>
                  </form>
                </div>
              ))}

              <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
                <h3 className="font-semibold">Yeni rol gereksinimi</h3>
                {staffRoles.length ? (
                  <LineActionForm
                    action={saveProductionLineStaffRequirementAction.bind(
                      null,
                      line.id,
                      null,
                    )}
                    buttonLabel="Personel Rolü Ekle"
                    className="mt-4 grid gap-5"
                  >
                    <FormGrid>
                      <StaffRoleField staffRoles={staffRoles} />
                      <NumberField
                        label="Gerekli adet"
                        min={1}
                        name="requiredQuantity"
                        value={1}
                      />
                      <NumberField
                        label="Sıralama"
                        name="sortOrder"
                        value={(line.staffRequirements.length + 1) * 10}
                      />
                    </FormGrid>
                  </LineActionForm>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Bu departmana bağlı aktif direkt üretim personel rolü
                    bulunmuyor. Önce Personel Rolleri ekranından oluşturmalısın.
                  </p>
                )}
              </div>
            </div>
          </Panel>
        }
        costs={
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <Panel
              description="Hat elektriği ve satın alma yatırım değerini cent olarak yönet."
              title="Maliyet girdileri"
            >
              <LineActionForm
                action={updateProductionLineCostsAction.bind(null, line.id)}
                buttonLabel="Maliyetleri Kaydet"
              >
                <FormGrid>
                  <MoneyField
                    hint="Örnek: 200 girildiğinde veritabanına 20.000 cent kaydedilir."
                    label="Aylık baz elektrik (EUR/USD)"
                    name="monthlyElectricityBase"
                    value={formatMoneyInput(
                      line.monthlyElectricityBaseCents,
                    )}
                  />
                  <MoneyField
                    hint="Örnek: 45000 girildiğinde veritabanına 4.500.000 cent kaydedilir."
                    label="Satın alma maliyeti (EUR/USD)"
                    name="purchaseCost"
                    value={formatMoneyInput(line.purchaseCostCents)}
                  />
                  <Field
                    hint="Merkezi servis tarafından hesaplanır."
                    label="1000 point doğrudan maliyeti (EUR/USD)"
                  >
                    <Input
                      disabled
                      readOnly
                      value={formatMoney(
                        line.directCostPer1000PointsCents,
                      )}
                    />
                  </Field>
                </FormGrid>
              </LineActionForm>
            </Panel>
            <Panel
              description="Aylık referans değerler; multiplier uygulanmaz."
              title="Maliyet kırılımı"
            >
              <CostBreakdown breakdown={costBreakdown} />
            </Panel>
          </div>
        }
        images={
          <Panel
            description="Tek master dosya CARD, MAP, DETAIL ve THUMBNAIL boyutlarında şeffaf WEBP’ye dönüştürülür."
            title="Üretim hattı görselleri"
          >
            <LineUploadForm lineId={line.id} />
            {line.visualAssets.length ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {line.visualAssets.map((asset) => (
                  <article
                    className="overflow-hidden rounded-lg border border-border bg-muted/20"
                    key={asset.id}
                  >
                    <div className="relative aspect-[4/3] bg-black/10">
                      <Image
                        alt={asset.altText ?? `${line.key} ${asset.variant}`}
                        className="object-contain"
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        src={asset.url}
                      />
                    </div>
                    <div className="p-3">
                      <p className="font-mono text-xs text-primary">
                        {asset.variant}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {asset.width}×{asset.height} · {asset.mimeType}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm text-muted-foreground">
                Henüz üretim hattı görseli yüklenmedi.
              </p>
            )}
          </Panel>
        }
      />
    </div>
  );
}

function NumberField({
  label,
  name,
  value,
  min = 0,
}: {
  label: string;
  name: string;
  value: string | number;
  min?: number;
}) {
  return (
    <Field label={label}>
      <Input
        defaultValue={value}
        min={min}
        name={name}
        required
        type="number"
      />
    </Field>
  );
}

function MoneyField({
  hint,
  label,
  name,
  value,
}: {
  hint: string;
  label: string;
  name: string;
  value: string;
}) {
  return (
    <Field hint={hint} label={label}>
      <Input
        defaultValue={value}
        inputMode="decimal"
        min="0"
        name={name}
        required
        step="0.01"
        type="number"
      />
    </Field>
  );
}

type StaffRoleOption = {
  id: string;
  key: string;
  monthlySalaryCents: number;
  translations: Translation[];
};

function StaffRoleField({
  staffRoles,
  defaultValue,
}: {
  staffRoles: StaffRoleOption[];
  defaultValue?: string;
}) {
  return (
    <Field label="Personel rolü">
      <Select defaultValue={defaultValue ?? staffRoles[0]?.id} name="staffRoleId">
        {staffRoles.map((staffRole) => (
          <option key={staffRole.id} value={staffRole.id}>
            {displayName(staffRole.translations, staffRole.key)} ·{" "}
            {formatMoney(staffRole.monthlySalaryCents)}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function CostBreakdown({
  breakdown,
}: {
  breakdown: ReturnType<typeof calculateDirectLineCost>;
}) {
  const rows = [
    ["Direkt maaş", breakdown.monthlyDirectPayrollCents],
    ["Hat elektriği", breakdown.monthlyLineElectricityCents],
    ["Üretim alanı kirası", breakdown.monthlyProductionAreaRentCents],
    ["Direkt personel yemeği", breakdown.monthlyDirectStaffMealCents],
    ["Direkt personel genel gideri", breakdown.monthlyDirectStaffOverheadCents],
    ["Departman hat gideri", breakdown.monthlyDepartmentLineOverheadCents],
  ] as const;

  return (
    <div className="grid gap-2">
      {rows.map(([label, value]) => (
        <div
          className="flex items-center justify-between gap-3 border-b border-border/70 py-2 last:border-0"
          key={label}
        >
          <span className="text-muted-foreground">{label}</span>
          <span className="font-mono">{formatMoney(value)}</span>
        </div>
      ))}
      <div className="mt-2 rounded-lg bg-primary/10 p-3">
        <div className="flex justify-between gap-3 font-semibold">
          <span>Aylık doğrudan gider</span>
          <span>{formatMoney(breakdown.monthlyDirectLineCostCents)}</span>
        </div>
        <div className="mt-2 flex justify-between gap-3 text-sm">
          <span>1000 point maliyeti</span>
          <span className="font-mono text-primary">
            {formatMoney(breakdown.directCostPer1000PointsCents)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="game-card flex items-center gap-4 p-4">
      <div className="game-icon-button">{icon}</div>
      <div>
        <p className="font-semibold">{value}</p>
        <p className="text-xs uppercase tracking-[.14em] text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}

type Translation = { locale: string; name: string };

function displayName(translations: Translation[], fallback: string) {
  return (
    translations.find((translation) => translation.locale === "tr")?.name ??
    fallback
  );
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatMoneyInput(cents: number) {
  return (cents / 100).toFixed(2);
}
