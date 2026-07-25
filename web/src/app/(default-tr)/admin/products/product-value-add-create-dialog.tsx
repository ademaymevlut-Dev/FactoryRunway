"use client";

import { Sparkles } from "lucide-react";
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

import { createProductValueAddCategoryAction } from "../content-actions";
import { Field, FormGrid, Input, Options, Select, enumOptions } from "../form-ui";
import { initialAdminActionState } from "../product-form-state";

type SectorOption = {
  id: string;
  key: string;
};

export function ProductValueAddCreateDialog({ sectors }: { sectors: SectorOption[] }) {
  const [state, action, pending] = useActionState(
    createProductValueAddCategoryAction,
    initialAdminActionState,
  );
  const hasSector = sectors.length > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="rounded-lg"
          disabled={!hasSector}
          title={hasSector ? "Katma değer kategorisi oluştur" : "Önce bir sektör oluşturmalısın"}
          variant="outline"
        >
          <Sparkles />
          Katma Değer Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-xl border border-border bg-card text-card-foreground sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Yeni katma değer kategorisi</DialogTitle>
          <DialogDescription>
            Sektöre bağlı standart değeri oluştur. Ürün formunda serbest metin yerine bu katalog kullanılacaktır.
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
            <Field label="Katma değer anahtarı" hint="Örn. PLAIN, PRINTED veya EMBROIDERED.">
              <Input autoComplete="off" name="key" placeholder="PLAIN" required />
            </Field>
            <Field label="Ad anahtarı">
              <Input name="nameKey" placeholder="valueAdd.plain.name" required />
            </Field>
            <Field label="Açıklama anahtarı">
              <Input name="descriptionKey" placeholder="valueAdd.plain.description" />
            </Field>
            <Field label="XP çarpanı (bps)" hint="10000 = 1.00x, 11000 = 1.10x">
              <Input defaultValue="10000" min="1" name="progressionMultiplierBps" type="number" required />
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
              {pending ? "Kategori oluşturuluyor…" : "Katma Değeri Oluştur"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
