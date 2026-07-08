import { Building2, Factory, ImageIcon, Layers3, PackagePlus } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

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

import { DefinitionStatusButton } from "../definitions/status-button";
import { Panel } from "../form-ui";
import { SectorCreateForm } from "./sector-create-form";
import { SectorImageUploadForm } from "./sector-image-upload-form";

export default async function AdminSectorsPage() {
  const sectors = await getPrisma().sector.findMany({
    orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
    include: {
      translations: {
        orderBy: { locale: "asc" },
      },
      _count: {
        select: {
          departments: true,
          productCategories: true,
          productTypes: true,
          products: true,
          factories: true,
        },
      },
    },
  });

  return (
    <div className="grid gap-4">
      <header className="game-topbar">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-primary">
            Tanımlamalar
          </p>
          <h1 className="text-2xl font-semibold">Sektörler</h1>
        </div>
        <Badge variant="secondary">{sectors.length} sektör</Badge>
      </header>

      <Panel
        title="Yeni sektör"
        description="Departmanların, ürün kataloglarının ve oyuncu fabrikalarının bağlanacağı ana içeriği oluştur."
      >
        <SectorCreateForm />
      </Panel>

      <Panel title={`Sektör listesi (${sectors.length})`}>
        {sectors.length ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-card text-card-foreground">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Sektör</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Sıra</TableHead>
                  <TableHead>Departman</TableHead>
                  <TableHead>Kategori / Tip</TableHead>
                  <TableHead>Ürün / Fabrika</TableHead>
                  <TableHead>Görseller</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectors.map((sector) => {
                  const name =
                    sector.translations.find((item) => item.locale === "tr")?.name ??
                    sector.translations[0]?.name ??
                    sector.key;
                  const isActive = sector.status === "ACTIVE";

                  return (
                    <TableRow className="border-border" key={sector.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="game-icon-button">
                            <Building2 size={16} />
                          </span>
                          <div>
                            <p className="font-semibold">{name}</p>
                            <p className="font-mono text-xs text-primary">{sector.key}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "default" : "secondary"}>
                          {sector.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{sector.sortOrder}</TableCell>
                      <TableCell>
                        <Count
                          icon={<Factory size={14} />}
                          value={sector._count.departments}
                        />
                      </TableCell>
                      <TableCell>
                        <Count
                          icon={<Layers3 size={14} />}
                          value={`${sector._count.productCategories} / ${sector._count.productTypes}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Count
                          icon={<PackagePlus size={14} />}
                          value={`${sector._count.products} / ${sector._count.factories}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="grid min-w-[360px] gap-4 xl:grid-cols-2">
                          <SectorImageSlot
                            height={700}
                            label="Featured"
                            sectorId={sector.id}
                            slot="FEATURED"
                            url={sector.photoUrl}
                            width={1600}
                          />
                          <SectorImageSlot
                            height={420}
                            label="Slim"
                            sectorId={sector.id}
                            slot="SLIM"
                            url={sector.slimPhotoUrl}
                            width={1600}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DefinitionStatusButton
                            entity="sector"
                            id={sector.id}
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
          <div className="py-12 text-center">
            <Building2 className="mx-auto text-primary" />
            <p className="mt-3 text-muted-foreground">
              İlk olarak bir sektör tanımlamalısın.
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}

function SectorImageSlot({
  height,
  label,
  sectorId,
  slot,
  url,
  width,
}: {
  height: number;
  label: string;
  sectorId: string;
  slot: "FEATURED" | "SLIM";
  url: string | null;
  width: number;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-background/40 p-3">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">
          {width}x{height} WEBP
        </p>
      </div>
      <div
        className="relative overflow-hidden rounded-md border border-border bg-muted/20"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        {url ? (
          <Image
            alt={`${label} sektör görseli`}
            className="object-cover"
            fill
            sizes="260px"
            src={url}
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <ImageIcon size={18} />
          </div>
        )}
      </div>
      <SectorImageUploadForm sectorId={sectorId} slot={slot} />
    </div>
  );
}

function Count({
  icon,
  value,
}: {
  icon: ReactNode;
  value: number | string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      {icon}
      {value}
    </span>
  );
}
