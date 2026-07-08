"use client";

import { useActionState } from "react";

import { createSectorAction } from "../content-actions";
import { Field, FormGrid, Input, Options, Select } from "../form-ui";
import { initialAdminActionState } from "../product-form-state";

const sectorStatuses = [
  "ACTIVE",
  "LOCKED",
  "COMING_SOON",
  "PURCHASABLE",
  "IN_DEVELOPMENT",
  "ARCHIVED",
] as const;

export function SectorCreateForm() {
  const [state, action, pending] = useActionState(createSectorAction, initialAdminActionState);

  return (
    <form action={action} className="grid gap-5">
      <FormGrid>
        <Field label="Sektör anahtarı" hint="Benzersiz ve kısa bir anahtar kullan: textile">
          <Input autoComplete="off" name="key" placeholder="textile" required />
        </Field>
        <Field label="Türkçe ad">
          <Input name="nameTr" placeholder="Tekstil" required />
        </Field>
        <Field label="İngilizce ad">
          <Input name="nameEn" placeholder="Textile" />
        </Field>
        <Field label="Türkçe açıklama">
          <Input name="descriptionTr" placeholder="Tekstil üretim sektörü" />
        </Field>
        <Field label="İngilizce açıklama">
          <Input name="descriptionEn" placeholder="Textile manufacturing sector" />
        </Field>
        <Field label="Durum">
          <Select defaultValue="IN_DEVELOPMENT" name="status">
            <Options values={sectorStatuses} />
          </Select>
        </Field>
        <Field label="Sıralama">
          <Input defaultValue="0" min="0" name="sortOrder" type="number" required />
        </Field>
        <Field label="Featured görsel URL" hint="İsteğe bağlıdır. Upload sonrası otomatik dolar.">
          <Input name="photoUrl" placeholder="https://..." type="url" />
        </Field>
        <Field label="Slim görsel URL" hint="İsteğe bağlıdır. Upload sonrası otomatik dolar.">
          <Input name="slimPhotoUrl" placeholder="https://..." type="url" />
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

      <button className="game-button-primary w-full sm:w-fit" disabled={pending} type="submit">
        {pending ? "Sektör oluşturuluyor…" : "Sektörü Oluştur"}
      </button>
    </form>
  );
}
