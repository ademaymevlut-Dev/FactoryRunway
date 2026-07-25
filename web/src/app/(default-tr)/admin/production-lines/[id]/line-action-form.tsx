"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";

import type { AdminActionState } from "../../product-form-state";
import { initialAdminActionState } from "../../product-form-state";

type LineAction = (
  previousState: AdminActionState,
  formData: FormData,
) => Promise<AdminActionState>;

export function LineActionForm({
  action,
  buttonLabel,
  children,
  className = "grid gap-5",
  pendingLabel = "Kaydediliyor…",
}: {
  action: LineAction;
  buttonLabel: string;
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialAdminActionState,
  );

  return (
    <form action={formAction} className={className}>
      {children}
      {state.message ? (
        <p
          aria-live="polite"
          className={
            state.status === "error"
              ? "rounded-lg border border-destructive bg-destructive/20 px-3 py-2 text-sm text-destructive-foreground"
              : "rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary"
          }
        >
          {state.message}
        </p>
      ) : null}
      <button
        className="game-button-primary w-full sm:w-fit"
        disabled={pending}
        type="submit"
      >
        {pending ? pendingLabel : buttonLabel}
      </button>
    </form>
  );
}
