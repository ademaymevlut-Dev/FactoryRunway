"use client";

import { Building2 } from "lucide-react";
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

import { createDepartmentAction } from "../content-actions";
import { Field, FormGrid, Input, Options, Select, enumOptions } from "../form-ui";
import { initialAdminActionState } from "../product-form-state";

type SectorOption = {
  id: string;
  key: string;
};

export function DepartmentCreateDialog({ sectors }: { sectors: SectorOption[] }) {
  const [state, action, pending] = useActionState(
    createDepartmentAction,
    initialAdminActionState,
  );
  const hasSector = sectors.length > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="rounded-lg"
          disabled={!hasSector}
          title={hasSector ? "Yeni departman oluştur" : "Önce bir sektör oluşturmalısın"}
          variant="outline"
        >
          <Building2 />
          Departman Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-xl border border-border bg-card text-card-foreground sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Yeni departman</DialogTitle>
          <DialogDescription>
            Üretim hattının bağlanacağı sektör departmanını oluştur.
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
            <Field label="Departman anahtarı" hint="Seçilen sektör içinde benzersiz olmalıdır.">
              <Input autoComplete="off" name="key" placeholder="CUTTING" required />
            </Field>
            <Field label="Ad anahtarı">
              <Input name="nameKey" placeholder="department.cutting.name" required />
            </Field>
            <Field label="Açıklama anahtarı">
              <Input name="descriptionKey" placeholder="department.cutting.description" />
            </Field>
            <Field label="Rota sırası">
              <Input defaultValue="0" min="0" name="routeOrder" type="number" required />
            </Field>
            <Field label="Durum">
              <Select defaultValue="ACTIVE" name="status">
                <Options values={enumOptions.statuses} />
              </Select>
            </Field>
            <Field label="Başlangıç departmanı">
              <input className="size-4 accent-primary" name="isStarter" type="checkbox" />
            </Field>
            <Field label="Fason üretimi destekler">
              <input className="size-4 accent-primary" name="supportsOutsource" type="checkbox" />
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
              {pending ? "Departman oluşturuluyor…" : "Departmanı Oluştur"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
