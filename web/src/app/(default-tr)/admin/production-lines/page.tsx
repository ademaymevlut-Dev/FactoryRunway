import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Factory,
  Gauge,
  Users,
  Workflow,
} from "lucide-react";

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
import { LineCreateDialog } from "./line-create-dialog";

export default async function AdminProductionLinesPage() {
  const prisma = getPrisma();
  const [lines, sectors, departments] = await Promise.all([
    prisma.productionLineTemplate.findMany({
      orderBy: [
        { sortOrder: "asc" },
        { department: { routeOrder: "asc" } },
        { grade: "asc" },
      ],
      include: {
        sector: { include: { translations: true } },
        department: { include: { translations: true } },
        _count: {
          select: {
            staffRequirements: true,
            factoryProductionLines: true,
          },
        },
      },
    }),
    prisma.sector.findMany({
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
      include: { translations: true },
    }),
    prisma.department.findMany({
      where: {
        kind: "PRODUCTION",
        status: "ACTIVE",
      },
      orderBy: [{ routeOrder: "asc" }, { key: "asc" }],
      include: { translations: true },
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

  return (
    <div className="grid gap-4">
      <header className="game-topbar gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-primary">
            Hat Yönetimi
          </p>
          <h1 className="text-2xl font-semibold">Üretim Hattı Kataloğu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ana hat kayıtlarını oluştur; kapasite, personel ve maliyet
            detaylarını hat sayfasında tamamla.
          </p>
        </div>
        <LineCreateDialog
          departments={departmentOptions}
          sectors={sectorOptions}
        />
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric
          icon={<Workflow />}
          label="Hat template"
          value={lines.length}
        />
        <Metric
          icon={<Users />}
          label="Personel rol satırı"
          value={lines.reduce(
            (sum, line) => sum + line._count.staffRequirements,
            0,
          )}
        />
        <Metric
          icon={<Gauge />}
          label="Toplam günlük puan"
          value={lines.reduce(
            (sum, line) => sum + line.dailyPointCapacity,
            0,
          )}
        />
      </section>

      <Panel
        description="Ana kaydı modal üzerinden oluştur; Details ile sekmeli hat detay ekranına geç."
        title={`Üretim hattı listesi (${lines.length})`}
      >
        {lines.length ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-card text-card-foreground">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Anahtar</TableHead>
                  <TableHead>Sektör / Departman</TableHead>
                  <TableHead>Derece</TableHead>
                  <TableHead>Kapasite / Personel</TableHead>
                  <TableHead>Referans maliyet</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow className="border-border" key={line.id}>
                    <TableCell>
                      <p className="font-mono text-xs text-primary">
                        {line.key}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {line.machineCount} makine · {line.areaM2} m²
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {displayName(
                        line.sector.translations,
                        line.sector.key,
                      )}
                      <br />
                      <span className="text-muted-foreground">
                        {displayName(
                          line.department.translations,
                          line.department.key,
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{line.grade}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {line.dailyPointCapacity.toLocaleString("tr-TR")} puan/gün
                      <br />
                      <span className="text-muted-foreground">
                        {line.idealStaff} ideal ·{" "}
                        {line._count.staffRequirements} rol
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatCost(line.directCostPer1000PointsCents)}
                      <br />
                      <span className="text-muted-foreground">/ 1000 puan</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          line.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {line.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        className="game-button-ghost min-h-9 px-3"
                        href={`/admin/production-lines/${line.id}`}
                      >
                        Details
                        <ArrowRight size={15} />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <Factory className="mx-auto text-primary" />
            <p className="mt-3 text-muted-foreground">
              Henüz üretim hattı ana kaydı yok.
            </p>
          </div>
        )}
      </Panel>
    </div>
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
        <p className="text-2xl font-semibold">
          {value.toLocaleString("tr-TR")}
        </p>
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

function formatCost(cents: number) {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
