"use client";

import type { ReactNode } from "react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Factory,
  KeyRound,
  LoaderCircle,
  LogIn,
  Mail,
  ShieldCheck,
  UserCog,
  UserRound,
} from "lucide-react";

import { initialCreateUserState, type CreateUserState } from "@/lib/auth/create-user-state";
import { USER_ROLES } from "@/lib/auth/roles";

import { createAdminAction, createPlayerAction, loginAction } from "./user-actions";

type AccountTab = "login" | "player" | "admin";

const accountTabs: Array<{ key: AccountTab; label: string }> = [
  { key: "login", label: "Login" },
  { key: "player", label: "Create Player" },
  { key: "admin", label: "Create Admin" },
];

export function AccountCreateTabs() {
  const [activeTab, setActiveTab] = useState<AccountTab>("login");
  const [loginState, loginActionState] = useActionState(loginAction, initialCreateUserState);
  const [playerState, playerAction] = useActionState(createPlayerAction, initialCreateUserState);
  const [adminState, adminAction] = useActionState(createAdminAction, initialCreateUserState);

  return (
    <div className="space-y-5">
      <div className="game-tabs" role="tablist" aria-label="Kullanıcı oluşturma">
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
      ) : activeTab === "player" ? (
        <form action={playerAction} className="space-y-4">
          <FormField
            error={playerState.fieldErrors?.name}
            icon={<UserRound size={18} />}
            label="Oyuncu adı"
            name="name"
            placeholder="Mevlüt"
          />
          <FormField
            error={playerState.fieldErrors?.factoryName}
            icon={<Factory size={18} />}
            label="Fabrika adı"
            name="factoryName"
            placeholder="Factory Runway Atelier"
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
      ) : (
        <form action={adminAction} className="space-y-4">
          <FormField
            error={adminState.fieldErrors?.name}
            icon={<UserCog size={18} />}
            label="Admin adı"
            name="name"
            placeholder="Admin"
          />
          <FormField
            error={adminState.fieldErrors?.email}
            icon={<Mail size={18} />}
            label="E-posta"
            name="email"
            placeholder="admin@factoryrunway.com"
            type="email"
          />
          <FormField
            error={adminState.fieldErrors?.password}
            icon={<ShieldCheck size={18} />}
            label="Şifre"
            name="password"
            placeholder="En az 8 karakter"
            type="password"
          />
          <RoleSelect error={adminState.fieldErrors?.role} />
          <FormMessage state={adminState} />
          <SubmitButton icon={<UserCog size={18} />} label="Admin Oluştur" />
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
      <span className="text-sm font-medium text-[var(--fr-soft)]">{label}</span>
      <div className="game-input-wrap">
        {icon}
        <input className="game-input" name={name} placeholder={placeholder} required type={type} />
      </div>
      {error ? <span className="block text-xs font-semibold text-[var(--fr-red)]">{error}</span> : null}
    </label>
  );
}

function RoleSelect({ error }: { error?: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[var(--fr-soft)]">Rol</span>
      <div className="game-input-wrap">
        <KeyRound size={18} />
        <select className="game-input" defaultValue={USER_ROLES.ADMIN} name="role">
          <option value={USER_ROLES.ADMIN}>Admin</option>
          <option value={USER_ROLES.SUPER_ADMIN}>Super Admin</option>
        </select>
      </div>
      {error ? <span className="block text-xs font-semibold text-[var(--fr-red)]">{error}</span> : null}
    </label>
  );
}

function FormMessage({ state }: { state: CreateUserState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p className="rounded-[8px] border border-[var(--fr-red)]/35 bg-[var(--fr-red-soft)] px-3 py-2 text-sm text-[var(--fr-soft)]">
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
