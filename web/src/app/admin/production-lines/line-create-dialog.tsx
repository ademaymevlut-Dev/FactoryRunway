"use client";

import { Plus } from "lucide-react";
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

import { Field, FormGrid, Input, Options, Select, enumOptions } from "../form-ui";
import { initialAdminActionState } from "../product-form-state";
import { createProductionLineTemplateAction } from "./production-line-actions";

type SectorOption = {
  id: string;
  key: string;
  name: string;
};

type DepartmentOption = {
  id: string;
  key: string;
  name: string;
  sectorId: string;
};

export function LineCreateDialog({
  sectors,
  departments,
}: {
  sectors: SectorOption[];
  departments: DepartmentOption[];
}) {
  const availableSectors = sectors.filter((sector) =>
    departments.some((department) => department.sectorId === sector.id),
  );
  const [sectorId, setSectorId] = useState(availableSectors[0]?.id ?? "");
  const [state, action, pending] = useActionState(
    createProductionLineTemplateAction,
    initialAdminActionState,
  );
  const availableDepartments = departments.filter(
    (department) => department.sectorId === sectorId,
  );
  const canCreateLine = availableSectors.length > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="game-button-primary rounded-lg px-4"
          disabled={!canCreateLine}
          size="lg"
          title={
            canCreateLine
              ? "Yeni üretim hattı oluştur"
              : "Önce Tanımlamalar ekranında aktif bir üretim departmanı oluşturmalısın"
          }
        >
          <Plus />
          Yeni Hat Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-xl border border-border bg-card text-card-foreground sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Yeni üretim hattı ana kaydı
          </DialogTitle>
          <DialogDescription>
            Sektör, üretim departmanı ve dereceyi seç. Kapasite, personel,
            maliyet ve görselleri Details ekranında tamamlayacaksın.
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
                {availableSectors.map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Üretim departmanı"
              hint="Yalnızca Department.kind = PRODUCTION kayıtları gösterilir."
            >
              <Select key={sectorId} name="departmentId" required>
                {availableDepartments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Teknik anahtar"
              hint="Örnek: sewing_workshop"
            >
              <Input
                autoComplete="off"
                name="key"
                placeholder="sewing_workshop"
                required
              />
            </Field>
            <Field label="Üretim derecesi">
              <Select defaultValue="WORKSHOP" name="grade">
                <Options values={enumOptions.grades} />
              </Select>
            </Field>
            <Field label="Sıralama">
              <Input defaultValue="0" min="0" name="sortOrder" type="number" />
            </Field>
            <Field label="Durum">
              <Select defaultValue="DRAFT" name="status">
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
            <button
              className="game-button-primary w-full sm:w-auto"
              disabled={pending}
              type="submit"
            >
              {pending ? "Oluşturuluyor…" : "Hat Ana Kaydını Oluştur"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
