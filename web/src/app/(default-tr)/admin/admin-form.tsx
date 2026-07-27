"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";

import {
  initialAdminActionState,
  type AdminActionState,
} from "./product-form-state";

type AdminFormAction = (
  previousState: AdminActionState,
  formData: FormData,
) => Promise<AdminActionState>;

export function AdminForm({
  action,
  children,
  className,
}: {
  action: AdminFormAction;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialAdminActionState,
  );

  return (
    <form action={formAction} aria-busy={pending} className={className}>
      {children}
      {state.message ? (
        <p
          className={
            state.status === "error"
              ? "rounded-lg border border-destructive bg-destructive/20 px-3 py-2 text-sm text-destructive-foreground"
              : "rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary"
          }
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

