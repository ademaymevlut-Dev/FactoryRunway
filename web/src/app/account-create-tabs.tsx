"use client";

import type { ReactNode } from "react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  LoaderCircle,
  LogIn,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { initialCreateUserState, type CreateUserState } from "@/lib/auth/create-user-state";

import { createPlayerAction, loginAction } from "./user-actions";

type AccountTab = "login" | "player";

const accountTabs: Array<{ key: AccountTab; label: string }> = [
  { key: "login", label: "Login" },
  { key: "player", label: "Create Player" },
];

export function AccountCreateTabs() {
  const [activeTab, setActiveTab] = useState<AccountTab>("login");
  const [loginState, loginActionState] = useActionState(loginAction, initialCreateUserState);
  const [playerState, playerAction] = useActionState(createPlayerAction, initialCreateUserState);

  return (
    <div className="space-y-5">
      <div className="game-tabs" role="tablist" aria-label="Hesap işlemleri">
        {accountTabs.map((tab) => (
          <button
            aria-selected={activeTab === tab.key}
            className={activeTab === tab.key ? "game-tab is-active" : "game-tab"}
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "login" ? (
        <form action={loginActionState} className="space-y-4">
          <FormField
            error={loginState.fieldErrors?.email}
            icon={<Mail size={18} />}
            label="E-posta"
            name="email"
            placeholder="factory@runway.com"
            type="email"
          />
          <FormField
            error={loginState.fieldErrors?.password}
            icon={<ShieldCheck size={18} />}
            label="Şifre"
            name="password"
            placeholder="Şifren"
            type="password"
          />
          <FormMessage state={loginState} />
          <SubmitButton icon={<LogIn size={18} />} label="Giriş Yap" />
        </form>
      ) : (
        <form action={playerAction} className="space-y-4">
          <FormField
            error={playerState.fieldErrors?.name}
            icon={<UserRound size={18} />}
            label="Oyuncu adı"
            name="name"
            placeholder="Mevlüt"
          />
          <FormField
            error={playerState.fieldErrors?.email}
            icon={<Mail size={18} />}
            label="E-posta"
            name="email"
            placeholder="player@factoryrunway.com"
            type="email"
          />
          <FormField
            error={playerState.fieldErrors?.password}
            icon={<ShieldCheck size={18} />}
            label="Şifre"
            name="password"
            placeholder="En az 8 karakter"
            type="password"
          />
          <FormMessage state={playerState} />
          <SubmitButton icon={<UserRound size={18} />} label="Player Oluştur" />
        </form>
      )}
    </div>
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
      <span className="text-sm font-medium text-secondary-foreground">{label}</span>
      <div className="game-input-wrap">
        {icon}
        <input className="game-input" name={name} placeholder={placeholder} required type={type} />
      </div>
      {error ? <span className="block text-xs font-semibold text-red-400">{error}</span> : null}
    </label>
  );
}

function FormMessage({ state }: { state: CreateUserState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p className="rounded-lg border border-destructive bg-destructive/20 px-3 py-2 text-sm text-destructive-foreground">
      {state.message}
    </p>
  );
}

function SubmitButton({ icon, label }: { icon: ReactNode; label: string }) {
  const { pending } = useFormStatus();

  return (
    <button className="game-button-primary w-full" disabled={pending} type="submit">
      {pending ? <LoaderCircle className="animate-spin" size={18} /> : icon}
      {label}
    </button>
  );
}
