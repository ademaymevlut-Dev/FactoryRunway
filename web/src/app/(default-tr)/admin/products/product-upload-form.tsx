"use client";

import { useActionState, useEffect, useRef } from "react";

import { uploadProductImagesAction } from "../actions";
import { initialAdminActionState } from "../product-form-state";
import { Field, Input, Select } from "../form-ui";
import { useProductPresentationDraft } from "./[id]/product-presentation-draft-context";

export function ProductUploadForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(uploadProductImagesAction, initialAdminActionState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    clearLocalImagePreview,
    hasLocalImagePreview,
    setLocalImagePreview,
  } = useProductPresentationDraft();

  useEffect(() => {
    if (pending || state.status !== "success") return;

    clearLocalImagePreview();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [clearLocalImagePreview, pending, state.status]);

  const resetLocalPreview = () => {
    clearLocalImagePreview();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <input name="productId" type="hidden" value={productId} />
      <Field label="Görünüm">
        <Select name="view"><option value="FRONT">FRONT</option><option value="BACK">BACK</option></Select>
      </Field>
      <Field label="PNG / WEBP master" hint="En fazla 4 MB">
        <Input
          accept="image/png,image/webp"
          name="imageFile"
          onChange={(event) => {
            fileInputRef.current = event.currentTarget;
            setLocalImagePreview(event.currentTarget.files?.[0] ?? null);
          }}
          required
          type="file"
        />
      </Field>
      {hasLocalImagePreview ? (
        <button
          className="game-button-secondary w-fit md:col-span-2"
          onClick={resetLocalPreview}
          type="button"
        >
          Kayıtlı görsele dön
        </button>
      ) : null}
      <button className="game-button-primary md:col-span-2" disabled={pending} type="submit">
        {pending ? "Yükleniyor..." : "Görselleri Yükle"}
      </button>
      {state.message ? <p className={state.status === "error" ? "text-red-300" : "text-emerald-300"}>{state.message}</p> : null}
    </form>
  );
}
