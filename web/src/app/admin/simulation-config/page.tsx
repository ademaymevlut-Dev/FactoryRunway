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
} from "../form-ui";
import { saveSimulationConfigAction } from "./simulation-actions";

type Translation = {
  locale: string;
  name: string;
};

type SectorOption = {
  id: string;
  label: string;
};

type SimulationValues = {
  sectorId: string;
  startingCapitalCents: string;
  defaultCurrencyCode: string;
  startingDay: number;
  startingLevel: number;
  financePeriodDays: number;
  defaultPaymentTermDays: number;
  simulationDurationSeconds: number;
  maxAllocationsPerLineShift: number;
  metadata: string;
};

const defaultMetadata = JSON.stringify(
  {
    balanceVersion: 1,
    testingBaseline: true,
    sector: "textile",
  },
  null,
  2,
);

export default async function SimulationConfigPage() {
  const prisma = getPrisma();
  const [sectors, configs] = await Promise.all([
    prisma.sector.findMany({
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
      include: { translations: true },
    }),
    prisma.sectorSimulationConfig.findMany({
      orderBy: { sector: { sortOrder: "asc" } },
      include: {
        sector: { include: { translations: true } },
      },
    }),
  ]);
  const configuredSectorIds = new Set(
    configs.map((config) => config.sectorId),
  );
  const availableSectors: SectorOption[] = sectors
    .filter((sector) => !configuredSectorIds.has(sector.id))
    .map((sector) => ({
      id: sector.id,
      label: displayName(sector.translations, sector.key),
    }));

  return (
    <div className="grid gap-4">
      <header className="game-topbar">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-primary">
            Pazar ve Simülasyon
          </p>
          <h1 className="text-2xl font-semibold">Simülasyon Ayarları</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Wizard ve vardiya simülasyonunda kullanılacak sektör başlangıç değerleri.
          </p>
        </div>
        <Badge variant="secondary">{configs.length} sektör yapılandırıldı</Badge>
      </header>

      {availableSectors.length ? (
        <Panel
          title="Yeni sektör simülasyon ayarı"
          description="Her sektör için yalnızca bir simülasyon ayarı oluşturulabilir."
        >
          <form
            action={saveSimulationConfigAction.bind(null, null)}
            className="grid gap-4"
          >
            <SimulationFields
              sectors={availableSectors}
              values={{
                sectorId: availableSectors[0]?.id ?? "",
                startingCapitalCents: "100000000",
                defaultCurrencyCode: "EUR",
                startingDay: 1,
                startingLevel: 1,
                financePeriodDays: 22,
                defaultPaymentTermDays: 7,
                simulationDurationSeconds: 45,
                maxAllocationsPerLineShift: 3,
                metadata: defaultMetadata,
              }}
            />
            <SubmitButton label="Simülasyon Ayarını Oluştur" />
          </form>
        </Panel>
      ) : sectors.length === 0 ? (
        <Panel
          title="Önce sektör gerekli"
          description="Simülasyon ayarı oluşturabilmek için önce bir sektör tanımla."
        >
          <p className="text-sm text-muted-foreground">
            Kullanılabilir sektör bulunmuyor.
          </p>
        </Panel>
      ) : null}

      {configs.map((config) => {
        const sectorLabel = displayName(
          config.sector.translations,
          config.sector.key,
        );
        const values: SimulationValues = {
          sectorId: config.sectorId,
          startingCapitalCents: config.startingCapitalCents.toString(),
          defaultCurrencyCode: config.defaultCurrencyCode,
          startingDay: config.startingDay,
          startingLevel: config.startingLevel,
          financePeriodDays: config.financePeriodDays,
          defaultPaymentTermDays: config.defaultPaymentTermDays,
          simulationDurationSeconds: config.simulationDurationSeconds,
          maxAllocationsPerLineShift: config.maxAllocationsPerLineShift,
          metadata: jsonText(config.metadata),
        };

        return (
          <Panel
            description="Bu değerler yeni fabrika oluşturulurken başlangıç snapshot'ına aktarılır."
            key={config.id}
            title={sectorLabel}
          >
            <form
              action={saveSimulationConfigAction.bind(null, config.id)}
              className="grid gap-4"
            >
              <SimulationFields
                sectors={[{ id: config.sectorId, label: sectorLabel }]}
                values={values}
              />
              <SubmitButton label="Ayarları Güncelle" />
            </form>
          </Panel>
        );
      })}
    </div>
  );
}

function SimulationFields({
  sectors,
  values,
}: {
  sectors: SectorOption[];
  values: SimulationValues;
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
          label="Başlangıç sermayesi (cent)"
          hint="100.000.000 cent = 1.000.000 para birimi."
        >
          <Input
            defaultValue={values.startingCapitalCents}
            min="0"
            name="startingCapitalCents"
            required
            step="1"
            type="number"
          />
        </Field>
        <Field label="Varsayılan para birimi">
          <Select
            defaultValue={values.defaultCurrencyCode}
            name="defaultCurrencyCode"
          >
            <Options values={["EUR", "USD"]} />
          </Select>
        </Field>
        <NumberField
          defaultValue={values.startingDay}
          hint="Yeni fabrikanın başlayacağı oyun günü."
          label="Başlangıç günü"
          min={1}
          name="startingDay"
        />
        <NumberField
          defaultValue={values.startingLevel}
          label="Başlangıç seviyesi"
          min={1}
          name="startingLevel"
        />
        <NumberField
          defaultValue={values.financePeriodDays}
          hint="Aylık finans ve yönetim raporu dönemi."
          label="Finans dönemi (gün)"
          min={1}
          name="financePeriodDays"
        />
        <NumberField
          defaultValue={values.defaultPaymentTermDays}
          hint="Müşteri ve borç işlemlerindeki varsayılan vade."
          label="Varsayılan ödeme vadesi (gün)"
          min={0}
          name="defaultPaymentTermDays"
        />
        <NumberField
          defaultValue={values.simulationDurationSeconds}
          hint="Bir vardiyanın ekrandaki gerçek çalışma süresi."
          label="Simülasyon süresi (saniye)"
          min={1}
          name="simulationDurationSeconds"
        />
        <NumberField
          defaultValue={values.maxAllocationsPerLineShift}
          hint="Bir vardiyada aynı hatta atanabilecek maksimum iş."
          label="Hat başına allocation sınırı"
          min={1}
          name="maxAllocationsPerLineShift"
        />
      </FormGrid>
      <Field label="Metadata JSON">
        <Textarea defaultValue={values.metadata} name="metadata" />
      </Field>
    </>
  );
}

function NumberField({
  name,
  label,
  defaultValue,
  min,
  hint,
}: {
  name: string;
  label: string;
  defaultValue: number;
  min: number;
  hint?: string;
}) {
  return (
    <Field hint={hint} label={label}>
      <Input
        defaultValue={defaultValue}
        min={min}
        name={name}
        required
        step="1"
        type="number"
      />
    </Field>
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
