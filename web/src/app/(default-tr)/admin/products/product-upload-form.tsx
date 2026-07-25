"use client";

import { useActionState } from "react";

import { uploadProductImagesAction } from "../actions";
import { initialAdminActionState } from "../product-form-state";
import { Field, Input, Select } from "../form-ui";

export function ProductUploadForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(uploadProductImagesAction, initialAdminActionState);
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <input name="productId" type="hidden" value={productId} />
      <Field label="Görünüm">
        <Select name="view"><option value="FRONT">FRONT</option><option value="BACK">BACK</option></Select>
      </Field>
      <Field label="PNG / WEBP master">
        <Input accept="image/png,image/webp" name="imageFile" required type="file" />
      </Field>
      <button className="game-button-primary md:col-span-2" disabled={pending} type="submit">
        {pending ? "Yükleniyor..." : "Görselleri Yükle"}
      </button>
      {state.message ? <p className={state.status === "error" ? "text-red-300" : "text-emerald-300"}>{state.message}</p> : null}
    </form>
  );
}
