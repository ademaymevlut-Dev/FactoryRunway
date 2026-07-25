"use client";

import { Tag } from "lucide-react";
import { useActionState } from "react";

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

import { createProductCategoryAction } from "../content-actions";
import { Field, FormGrid, Input, Options, Select, enumOptions } from "../form-ui";
import { initialAdminActionState } from "../product-form-state";

type SectorOption = {
  id: string;
  key: string;
};

export function ProductCategoryCreateDialog({ sectors }: { sectors: SectorOption[] }) {
  const [state, action, pending] = useActionState(
    createProductCategoryAction,
    initialAdminActionState,
  );
  const hasSector = sectors.length > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="rounded-lg"
          disabled={!hasSector}
          title={hasSector ? "Yeni ürün kategorisi oluştur" : "Önce bir sektör oluşturmalısın"}
          variant="outline"
        >
          <Tag />
          Kategori Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-xl border border-border bg-card text-card-foreground sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Yeni ürün kategorisi</DialogTitle>
          <DialogDescription>
            Kategori seçilen sektöre bağlanır ve ürün formunda yalnızca o sektör için gösterilir.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="grid gap-5">
          <FormGrid>
            <Field label="Sektör">
              <Select defaultValue={sectors[0]?.id} name="sectorId" required>
                {sectors.map((sector) => (
                  <option key={sector.id} value={sector.id}>{sector.key}</option>
                ))}
              </Select>
            </Field>
            <Field label="Kategori anahtarı" hint="Seçilen sektör içinde benzersiz olmalıdır.">
              <Input autoComplete="off" name="key" placeholder="OUTERWEAR" required />
            </Field>
            <Field label="Ad anahtarı">
              <Input name="nameKey" placeholder="category.outerwear.name" required />
            </Field>
            <Field label="Açıklama anahtarı">
              <Input name="descriptionKey" placeholder="category.outerwear.description" />
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
              {pending ? "Kategori oluşturuluyor…" : "Kategoriyi Oluştur"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
