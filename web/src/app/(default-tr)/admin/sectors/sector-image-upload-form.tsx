"use client";

import { useActionState } from "react";

import { Field, Input } from "../form-ui";
import { initialAdminActionState } from "../product-form-state";
import { uploadSectorImageAction } from "./sector-actions";

type SectorImageSlot = "FEATURED" | "SLIM";

export function SectorImageUploadForm({
  sectorId,
  slot,
}: {
  sectorId: string;
  slot: SectorImageSlot;
}) {
  const [state, action, pending] = useActionState(
    uploadSectorImageAction,
    initialAdminActionState,
  );

  return (
    <form action={action} className="grid gap-2">
      <input name="sectorId" type="hidden" value={sectorId} />
      <input name="slot" type="hidden" value={slot} />
      <Field label="PNG / WEBP master" hint="En fazla 4.5 MB">
        <Input accept="image/png,image/webp" name="imageFile" required type="file" />
      </Field>
      <button className="game-button-primary" disabled={pending} type="submit">
        {pending ? "WEBP hazırlanıyor..." : "Yükle"}
      </button>
      {state.message ? (
        <p
          aria-live="polite"
          className={state.status === "error" ? "text-destructive" : "text-primary"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
