import { AlertTriangle, CheckCircle2 } from "lucide-react";

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

import { Panel } from "../form-ui";

const starterTemplateKeys = [
  "cutting_workshop",
  "sewing_workshop",
  "ironing_packing_workshop",
] as const;

type Translation = {
  locale: string;
  name: string;
};

export default async function StartingStaffPage() {
  const prisma = getPrisma();
  const sector = await prisma.sector.findUnique({
    where: { key: "textile" },
    include: { translations: true },
  });

  if (!sector) {
    return (
      <MissingPanel message="Textile sektörü bulunamadı." />
    );
  }

  const [templates, startingStage] = await Promise.all([
    prisma.productionLineTemplate.findMany({
      where: {
        sectorId: sector.id,
        key: { in: [...starterTemplateKeys] },
      },
      orderBy: { sortOrder: "asc" },
      include: {
        department: { include: { translations: true } },
        staffRequirements: {
          orderBy: { sortOrder: "asc" },
          include: {
            staffRole: { include: { translations: true } },
          },
        },
      },
    }),
    prisma.sectorFactoryOperatingStage.findUnique({
      where: {
        sectorId_key: {
          sectorId: sector.id,
          key: "small_workshop",
        },
      },
      include: {
        translations: true,
        staffRequirements: {
          orderBy: { sortOrder: "asc" },
          include: {
            staffRole: { include: { translations: true } },
          },
        },
      },
    }),
  ]);

  const directStaffTotal = templates.reduce(
    (total, template) =>
      total +
      template.staffRequirements.reduce(
        (lineTotal, requirement) =>
          lineTotal + requirement.requiredQuantity,
        0,
      ),
    0,
  );
  const supportStaffTotal =
    startingStage?.staffRequirements.reduce(
      (total, requirement) => total + requirement.requiredQuantity,
      0,
    ) ?? 0;
  const missingTemplateKeys = starterTemplateKeys.filter(
    (key) => !templates.some((template) => template.key === key),
  );
  const isReady =
    missingTemplateKeys.length === 0 &&
    Boolean(startingStage) &&
    directStaffTotal === 29 &&
    supportStaffTotal === 9;

  return (
    <div className="grid gap-4">
      <header className="game-topbar">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-primary">
            Pazar ve Simülasyon
          </p>
          <h1 className="text-2xl font-semibold">Başlangıç Kadrosu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Starter hat personeli ile small_workshop yönetim ve destek kadrosunun birleşik özeti.
          </p>
        </div>
        <Badge variant={isReady ? "default" : "secondary"}>
          {isReady ? "Wizard için hazır" : "Eksik yapılandırma"}
        </Badge>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Doğrudan üretim" value={directStaffTotal} />
        <SummaryCard label="Yönetim ve destek" value={supportStaffTotal} />
        <SummaryCard
          label="Toplam başlangıç"
          value={directStaffTotal + supportStaffTotal}
        />
      </section>

      {!isReady ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} />
          <div>
            <p className="font-semibold">Başlangıç kadrosu henüz tamamlanmamış.</p>
            {missingTemplateKeys.length ? (
              <p className="mt-1">
                Eksik hat şablonları: {missingTemplateKeys.join(", ")}
              </p>
            ) : null}
            {!startingStage ? (
              <p className="mt-1">small_workshop işletme aşaması bulunamadı.</p>
            ) : null}
            <p className="mt-1">
              Beklenen dağılım 29 doğrudan üretim + 9 destek = 38 kişidir.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
          <CheckCircle2 size={18} />
          Başlangıç kadrosu Wizard tarafından kullanılmaya hazır.
        </div>
      )}

      <Panel
        title="Starter üretim hatları"
        description="Doğrudan üretim kadrosu hat şablonlarının personel gereksinimlerinden gelir."
      >
        <div className="grid gap-4">
          {starterTemplateKeys.map((templateKey) => {
            const template = templates.find(
              (candidate) => candidate.key === templateKey,
            );
            if (!template) {
              return (
                <p
                  className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground"
                  key={templateKey}
                >
                  {templateKey} bulunamadı.
                </p>
              );
            }
            const lineTotal = template.staffRequirements.reduce(
              (total, requirement) =>
                total + requirement.requiredQuantity,
              0,
            );

            return (
              <section
                className="overflow-hidden rounded-lg border border-border"
                key={template.id}
              >
                <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
                  <div>
                    <h2 className="font-semibold">
                      {displayName(
                        template.department.translations,
                        template.department.key,
                      )}
                    </h2>
                    <p className="font-mono text-xs text-primary">
                      {template.key}
                    </p>
                  </div>
                  <Badge variant="outline">{lineTotal} kişi</Badge>
                </div>
                <StaffTable requirements={template.staffRequirements} />
              </section>
            );
          })}
        </div>
      </Panel>

      <Panel
        title={
          startingStage
            ? `${displayName(startingStage.translations, startingStage.key)} destek kadrosu`
            : "small_workshop destek kadrosu"
        }
        description="Yönetim, planlama, depo, lojistik, bakım, kalite ve idari destek gereksinimleri."
      >
        {startingStage ? (
          <StaffTable requirements={startingStage.staffRequirements} />
        ) : (
          <p className="text-sm text-muted-foreground">
            small_workshop işletme aşaması bulunamadı.
          </p>
        )}
      </Panel>
    </div>
  );
}

function StaffTable({
  requirements,
}: {
  requirements: Array<{
    id: string;
    requiredQuantity: number;
    staffRole: {
      key: string;
      staffType: string;
      translations: Translation[];
    };
  }>;
}) {
  if (!requirements.length) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Personel gereksinimi tanımlanmamış.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead>Personel rolü</TableHead>
          <TableHead>Tür</TableHead>
          <TableHead className="text-right">Adet</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requirements.map((requirement) => (
          <TableRow className="border-border" key={requirement.id}>
            <TableCell>
              <p className="font-semibold">
                {displayName(
                  requirement.staffRole.translations,
                  requirement.staffRole.key,
                )}
              </p>
              <p className="font-mono text-xs text-primary">
                {requirement.staffRole.key}
              </p>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{requirement.staffRole.staffType}</Badge>
            </TableCell>
            <TableCell className="text-right font-semibold">
              {requirement.requiredQuantity}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="game-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </article>
  );
}

function MissingPanel({ message }: { message: string }) {
  return (
    <div className="grid gap-4">
      <header className="game-topbar">
        <h1 className="text-2xl font-semibold">Başlangıç Kadrosu</h1>
      </header>
      <Panel title="Yapılandırma eksik">
        <p className="text-sm text-muted-foreground">{message}</p>
      </Panel>
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
