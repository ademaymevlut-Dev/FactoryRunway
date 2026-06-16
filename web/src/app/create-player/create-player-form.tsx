"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Factory, LoaderCircle, Mail, ShieldCheck, UserRound } from "lucide-react";

import { initialCreateUserState } from "@/lib/auth/create-user-state";

import { createPlayerAction } from "../user-actions";

export function CreatePlayerForm() {
  const [state, formAction] = useActionState(
    createPlayerAction,
    initialCreateUserState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormField
        error={state.fieldErrors?.name}
        icon={<UserRound size={18} />}
        label="Oyuncu adı"
        name="name"
        placeholder="Mevlüt"
      />
      <FormField
        error={state.fieldErrors?.factoryName}
        icon={<Factory size={18} />}
        label="Fabrika adı"
        name="factoryName"
        placeholder="Factory Runway Atelier"
      />
      <FormField
        error={state.fieldErrors?.email}
        icon={<Mail size={18} />}
        label="E-posta"
        name="email"
        placeholder="player@factoryrunway.com"
        type="email"
      />
      <FormField
        error={state.fieldErrors?.password}
        icon={<ShieldCheck size={18} />}
        label="Şifre"
        name="password"
        placeholder="En az 8 karakter"
        type="password"
      />

      {state.message ? (
        <p className="rounded-[8px] border border-[var(--fr-red)]/35 bg-[var(--fr-red-soft)] px-3 py-2 text-sm text-[var(--fr-soft)]">
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function FormField({
  error,
  icon,
  label,
  name,
  placeholder,
  type = "text",
}: {
  error?: string;
  icon: ReactNode;
  label: string;
  name: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[var(--fr-soft)]">{label}</span>
      <div className="game-input-wrap">
        {icon}
        <input
          className="game-input"
          name={name}
          placeholder={placeholder}
          required
          type={type}
        />
      </div>
      {error ? <span className="block text-xs font-semibold text-[var(--fr-red)]">{error}</span> : null}
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="game-button-primary w-full" disabled={pending} type="submit">
      {pending ? <LoaderCircle className="animate-spin" size={18} /> : <UserRound size={18} />}
      Player Oluştur
    </button>
  );
}
