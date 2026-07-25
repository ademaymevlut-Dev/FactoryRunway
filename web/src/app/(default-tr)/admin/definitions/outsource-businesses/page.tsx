import { Badge } from "@/components/ui/badge";
import { getPrisma } from "@/lib/db";

import { jsonText } from "../../admin-data";
import {
  deleteOutsourceOptionAction,
  saveOutsourceOptionAction,
} from "./outsource-actions";
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

const optionTypes = ["FAST", "STANDARD", "SAFE"] as const;

const strategies = {
  FAST: {
    title: "Hız Odaklı",
    description: "Acil siparişler için kısa termin; yüksek maliyet ve daha yüksek operasyon riski.",
  },
  STANDARD: {
    title: "Dengeli",
    description: "Normal siparişlerde süre, maliyet ve risk arasında dengeli tercih.",
  },
  SAFE: {
    title: "Güven Odaklı",
    description: "Hassas ve yüksek değerli işler için daha düşük kalite ve gecikme riski.",
  },
} as const;

type DepartmentOption = {
  id: string;
  label: string;
};

type ConfigValues = {
  departmentId: string;
  optionType: string;
  leadTimeDays: number;
  baseCostPer1000PointsCents: number;
  costMultiplierBps: number;
  qualityRiskBps: number;
  delayRiskBps: number;
  status: string;
  metadata: string;
};

export default async function OutsourceBusinessesPage() {
  const prisma = getPrisma();
  const [departments, configs] = await Promise.all([
    prisma.department.findMany({
      where: { supportsOutsource: true },
      orderBy: [
        { sector: { sortOrder: "asc" } },
        { routeOrder: "asc" },
        { key: "asc" },
      ],
      include: {
        sector: { include: { translations: true } },
        translations: true,
      },
    }),
    prisma.outsourceOptionConfig.findMany({
      orderBy: [
        { sector: { sortOrder: "asc" } },
        { department: { routeOrder: "asc" } },
        { optionType: "asc" },
      ],
      include: {
        sector: { include: { translations: true } },
        department: { include: { translations: true } },
      },
    }),
  ]);

  const departmentOptions = departments.map((department) => ({
    id: department.id,
    label: `${displayName(department.sector.translations, department.sector.key)} · ${displayName(department.translations, department.key)}`,
  }));

  return (
    <div className="grid gap-4">
      <header className="game-topbar">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-primary">Tanımlamalar</p>
          <h1 className="text-2xl font-semibold">Fason İşletmeler</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Departman bazında oyuncuya sunulacak üç stratejik fason alternatifini yönet.
          </p>
        </div>
        <Badge variant="secondary">{configs.length} tanım</Badge>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        {optionTypes.map((optionType) => (
          <article className="game-card p-4" key={optionType}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">{strategies[optionType].title}</h2>
              <Badge variant="outline">{optionType}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {strategies[optionType].description}
            </p>
          </article>
        ))}
      </section>

      {departmentOptions.length ? (
        <Panel
          title="Yeni fason işletme tanımı"
          description="Aynı departmanda FAST, STANDARD ve SAFE kimliklerinden yalnızca birer tane bulunabilir."
        >
          <form
            action={saveOutsourceOptionAction.bind(null, null)}
            className="grid gap-4"
          >
            <OutsourceFields departments={departmentOptions} />
            <button className="game-button-primary w-full sm:w-fit" type="submit">
              Fason Tanımını Oluştur
            </button>
          </form>
        </Panel>
      ) : (
        <Panel
          title="Fason destekli departman gerekli"
          description="Önce Departmanlar ekranında en az bir departman için “Fason destekler” seçeneğini etkinleştir."
        >
          <p className="text-sm text-muted-foreground">
            Kullanılabilir fason departmanı bulunmuyor.
          </p>
        </Panel>
      )}

      <Panel
        title={`Kayıtlı fason tanımları (${configs.length})`}
        description="Süre gün, maliyet çarpanı ve riskler basis point (10.000 = %100) olarak saklanır."
      >
        {configs.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {configs.map((config) => {
              const strategy = strategies[config.optionType];
              const title = `${displayName(config.department.translations, config.department.key)} · ${strategy.title}`;
              const values: ConfigValues = {
                departmentId: config.departmentId,
                optionType: config.optionType,
                leadTimeDays: config.leadTimeDays,
                baseCostPer1000PointsCents:
                  config.baseCostPer1000PointsCents,
                costMultiplierBps: config.costMultiplierBps,
                qualityRiskBps: config.qualityRiskBps,
                delayRiskBps: config.delayRiskBps,
                status: config.status,
                metadata: jsonText(config.metadata),
              };

              return (
                <section className="rounded-lg border border-border bg-card p-4" key={config.id}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {displayName(config.sector.translations, config.sector.key)}
                      </p>
                    </div>
                    <Badge variant={config.status === "ACTIVE" ? "default" : "secondary"}>
                      {config.optionType}
                    </Badge>
                  </div>
                  <form
                    action={saveOutsourceOptionAction.bind(null, config.id)}
                    className="grid gap-4"
                  >
                    <OutsourceFields config={values} departments={departmentOptions} />
                    <div className="flex flex-wrap gap-2">
                      <button className="game-button-primary" type="submit">
                        Güncelle
                      </button>
                      <button
                        className="game-button-ghost"
                        formAction={deleteOutsourceOptionAction.bind(null, config.id)}
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
          <p className="text-sm text-muted-foreground">Henüz fason işletme tanımı yok.</p>
        )}
      </Panel>
    </div>
  );
}

function OutsourceFields({
  departments,
  config,
}: {
  departments: DepartmentOption[];
  config?: ConfigValues;
}) {
  return (
    <>
      <FormGrid>
        <Field label="Sektör / Departman">
          <Select defaultValue={config?.departmentId} name="departmentId" required>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="İşletme kimliği">
          <Select defaultValue={config?.optionType ?? "STANDARD"} name="optionType">
            <Options values={optionTypes} />
          </Select>
        </Field>
        <Field label="Termin (gün)">
          <Input
            defaultValue={config?.leadTimeDays ?? 3}
            min="1"
            name="leadTimeDays"
            required
            type="number"
          />
        </Field>
        <Field
          label="1000 point baz maliyeti"
          hint="Örnek: 250 girildiğinde 25.000 cent kaydedilir."
        >
          <Input
            defaultValue={formatMoneyInput(
              config?.baseCostPer1000PointsCents ?? 0,
            )}
            inputMode="decimal"
            min="0"
            name="baseCostPer1000Points"
            required
            type="text"
          />
        </Field>
        <Field label="Maliyet çarpanı (bps)" hint="10.000 = normal maliyet, 12.500 = 1,25 kat.">
          <Input
            defaultValue={config?.costMultiplierBps ?? 10000}
            min="1"
            name="costMultiplierBps"
            required
            type="number"
          />
        </Field>
        <Field label="Kalite riski (bps)" hint="0–10.000 arası.">
          <Input
            defaultValue={config?.qualityRiskBps ?? 0}
            max="10000"
            min="0"
            name="qualityRiskBps"
            required
            type="number"
          />
        </Field>
        <Field label="Gecikme riski (bps)" hint="0–10.000 arası.">
          <Input
            defaultValue={config?.delayRiskBps ?? 0}
            max="10000"
            min="0"
            name="delayRiskBps"
            required
            type="number"
          />
        </Field>
        <Field label="Durum">
          <Select defaultValue={config?.status ?? "ACTIVE"} name="status">
            <Options values={enumOptions.statuses} />
          </Select>
        </Field>
      </FormGrid>
      <Field label="Metadata JSON" hint="İleride firma adı veya sektöre özel ek ayarlar için kullanılabilir.">
        <Textarea defaultValue={config?.metadata ?? ""} name="metadata" />
      </Field>
    </>
  );
}

function formatMoneyInput(cents: number) {
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}

function displayName(
  translations: Array<{ locale: string; name: string }>,
  fallback: string,
) {
  return (
    translations.find((translation) => translation.locale === "tr")?.name ??
    translations.find((translation) => translation.locale === "en")?.name ??
    fallback
  );
}
