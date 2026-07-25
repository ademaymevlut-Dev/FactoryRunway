"use client";

import { Shapes } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { createProductTypeAction } from "../content-actions";
import { Field, FormGrid, Input, Options, Select, enumOptions } from "../form-ui";
import { initialAdminActionState } from "../product-form-state";

type SectorOption = {
  id: string;
  key: string;
};

type CategoryOption = {
  id: string;
  key: string;
  sectorId: string;
};

export function ProductTypeCreateDialog({
  sectors,
  categories,
}: {
  sectors: SectorOption[];
  categories: CategoryOption[];
}) {
  const firstSectorId = sectors.find((sector) =>
    categories.some((category) => category.sectorId === sector.id),
  )?.id ?? "";
  const [sectorId, setSectorId] = useState(firstSectorId);
  const availableCategories = categories.filter((category) => category.sectorId === sectorId);
  const [state, action, pending] = useActionState(
    createProductTypeAction,
    initialAdminActionState,
  );
  const canCreateType = firstSectorId !== "";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="rounded-lg"
          disabled={!canCreateType}
          title={canCreateType ? "Yeni ürün tipi oluştur" : "Önce bir sektör ve kategori oluşturmalısın"}
          variant="outline"
        >
          <Shapes />
          Ürün Tipi Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-xl border border-border bg-card text-card-foreground sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Yeni ürün tipi</DialogTitle>
          <DialogDescription>
            Ürün tipi seçilen sektör ve kategoriye bağlanır; ürün oluşturma formunda bu ilişkiye göre filtrelenir.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="grid gap-5">
          <FormGrid>
            <Field label="Sektör">
              <Select
                name="sectorId"
                onChange={(event) => setSectorId(event.target.value)}
                required
                value={sectorId}
              >
                {sectors
                  .filter((sector) => categories.some((category) => category.sectorId === sector.id))
                  .map((sector) => (
                    <option key={sector.id} value={sector.id}>{sector.key}</option>
                  ))}
              </Select>
            </Field>
            <Field label="Kategori">
              <Select key={sectorId} name="categoryId" required>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.key}</option>
                ))}
              </Select>
            </Field>
            <Field label="Ürün tipi anahtarı" hint="Seçilen sektör içinde benzersiz olmalıdır.">
              <Input autoComplete="off" name="key" placeholder="T_SHIRT" required />
            </Field>
            <Field label="Ad anahtarı">
              <Input name="nameKey" placeholder="productType.tShirt.name" required />
            </Field>
            <Field label="Açıklama anahtarı">
              <Input name="descriptionKey" placeholder="productType.tShirt.description" />
            </Field>
            <Field label="Sıralama">
              <Input defaultValue="0" min="0" name="sortOrder" type="number" required />
            </Field>
            <Field label="Durum">
              <Select defaultValue="ACTIVE" name="status">
                <Options values={enumOptions.statuses} />
              </Select>
            </Field>
          </FormGrid>

          {state.message ? (
            <p
              className={
                state.status === "error"
                  ? "rounded-lg border border-destructive bg-destructive/20 px-3 py-2 text-sm text-destructive-foreground"
                  : "rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary"
              }
            >
              {state.message}
            </p>
          ) : null}

          <DialogFooter>
            <button className="game-button-primary w-full sm:w-auto" disabled={pending} type="submit">
              {pending ? "Ürün tipi oluşturuluyor…" : "Ürün Tipini Oluştur"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
