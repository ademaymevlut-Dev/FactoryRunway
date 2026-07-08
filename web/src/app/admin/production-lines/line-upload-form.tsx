"use client";

import { useActionState } from "react";

import { Field, Input } from "../form-ui";
import { initialAdminActionState } from "../product-form-state";
import { uploadLineVisualAssetsAction } from "./production-line-actions";

export function LineUploadForm({ lineId }: { lineId: string }) {
  const [state, action, pending] = useActionState(uploadLineVisualAssetsAction, initialAdminActionState);
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <input name="productionLineTemplateId" type="hidden" value={lineId} />
      <Field label="Alt metin">
        <Input name="altText" placeholder="Kesim atölyesi üretim hattı" />
      </Field>
      <Field label="PNG / WEBP master" hint="En fazla 4.5 MB">
        <Input
          accept="image/png,image/webp"
          name="imageFile"
          required
          type="file"
        />
      </Field>
      <button
        className="game-button-primary md:col-span-2"
        disabled={pending}
        type="submit"
      >
        {pending ? "WEBP varyantları hazırlanıyor…" : "WEBP Görselleri Oluştur"}
      </button>
      {state.message ? (
        <p
          aria-live="polite"
          className={
            state.status === "error"
              ? "text-destructive"
              : "text-primary"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
