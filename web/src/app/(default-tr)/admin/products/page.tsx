import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ImageIcon,
  PackagePlus,
  Route,
  ShoppingBag,
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
import { ProductCreateDialog } from "./product-create-dialog";

export default async function AdminProductsPage() {
  const prisma = getPrisma();
  const [products, sectors, categories, productTypes] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        sector: { include: { translations: true } },
        category: { include: { translations: true } },
        productType: { include: { translations: true } },
        _count: { select: { images: true, routeSteps: true } },
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
  ]);

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

  return (
    <div className="grid gap-4">
      <header className="game-topbar gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-primary">
            Ürün Yönetimi
          </p>
          <h1 className="text-2xl font-semibold">Ürün Kataloğu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ana ürün kayıtlarını oluştur; üretim ve görsel detaylarını ürün
            sayfasında tamamla.
          </p>
        </div>
        <ProductCreateDialog
          categories={categoryOptions}
          productTypes={productTypeOptions}
          sectors={sectorOptions}
        />
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric
          icon={<ShoppingBag />}
          label="Toplam ürün"
          value={products.length}
        />
        <Metric
          icon={<Route />}
          label="Üretim adımı"
          value={products.reduce(
            (sum, product) => sum + product._count.routeSteps,
            0,
          )}
        />
        <Metric
          icon={<ImageIcon />}
          label="Görsel kaydı"
          value={products.reduce(
            (sum, product) => sum + product._count.images,
            0,
          )}
        />
      </section>

      <Panel
        description="Ana kaydı modal üzerinden oluştur; Details ile ürünün sekmeli detay ekranına geç."
        title={`Ürün listesi (${products.length})`}
      >
        {products.length ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-card text-card-foreground">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Kod / Anahtar</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Sektör / Sınıf</TableHead>
                  <TableHead>Seviye</TableHead>
                  <TableHead>Detaylar</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow className="border-border" key={product.id}>
                    <TableCell>
                      <p className="font-mono text-xs text-primary">
                        {product.code ?? "Kod yok"}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {product.key}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-foreground">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {displayName(
                          product.category.translations,
                          product.category.key,
                        )}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">
                      {displayName(
                        product.sector.translations,
                        product.sector.key,
                      )}
                      <br />
                      <span className="text-muted-foreground">
                        {displayName(
                          product.productType.translations,
                          product.productType.key,
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{product.tier}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {product._count.routeSteps} rota adımı
                      <br />
                      {product._count.images} görsel
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          product.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        className="game-button-ghost min-h-9 px-3"
                        href={`/admin/products/${product.id}`}
                      >
                        Details <ArrowRight size={15} />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <PackagePlus className="mx-auto text-primary" />
            <p className="mt-3 text-muted-foreground">
              Henüz ürün ana kaydı yok.
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
        <p className="text-2xl font-semibold">{value}</p>
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
