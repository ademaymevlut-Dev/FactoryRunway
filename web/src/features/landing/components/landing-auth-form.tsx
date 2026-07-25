"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  LoaderCircle,
  LogIn,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { createPlayerAction, loginAction } from "@/app/user-actions";
import {
  initialPublicAuthState,
  type AuthMessageCode,
  type PublicAuthState,
} from "@/lib/auth/public-auth-state";

import type { LandingContent } from "../content/types";

type AccountTab = "login" | "player";

type LandingAuthFormProps = {
  copy: LandingContent["auth"];
};

export function LandingAuthForm({ copy }: LandingAuthFormProps) {
  const [activeTab, setActiveTab] = useState<AccountTab>("login");
  const [loginState, loginFormAction] = useActionState(
    loginAction,
    initialPublicAuthState,
  );
  const [playerState, playerFormAction] = useActionState(
    createPlayerAction,
    initialPublicAuthState,
  );
  const accountTabs = [
    { key: "login", label: copy.loginTab },
    { key: "player", label: copy.registerTab },
  ] as const;

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    tabIndex: number,
  ) {
    const lastTabIndex = accountTabs.length - 1;
    let nextTabIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextTabIndex = tabIndex === lastTabIndex ? 0 : tabIndex + 1;
    } else if (event.key === "ArrowLeft") {
      nextTabIndex = tabIndex === 0 ? lastTabIndex : tabIndex - 1;
    } else if (event.key === "Home") {
      nextTabIndex = 0;
    } else if (event.key === "End") {
      nextTabIndex = lastTabIndex;
    }

    if (nextTabIndex === null) return;

    event.preventDefault();
    const nextTab = accountTabs[nextTabIndex];

    if (!nextTab) return;

    setActiveTab(nextTab.key);
    document.getElementById(`account-tab-${nextTab.key}`)?.focus();
  }

  return (
    <div className="space-y-5">
      <div
        aria-label={copy.tabsAriaLabel}
        aria-orientation="horizontal"
        className="game-tabs"
        role="tablist"
      >
        {accountTabs.map((tab, tabIndex) => (
          <button
            aria-controls={`account-panel-${tab.key}`}
            aria-selected={activeTab === tab.key}
            className={
              activeTab === tab.key ? "game-tab is-active" : "game-tab"
            }
            id={`account-tab-${tab.key}`}
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            onKeyDown={(event) => handleTabKeyDown(event, tabIndex)}
            role="tab"
            tabIndex={activeTab === tab.key ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "login" ? (
        <form
          action={loginFormAction}
          aria-labelledby="account-tab-login"
          className="space-y-4"
          id="account-panel-login"
          role="tabpanel"
        >
          <FormField
            copy={copy}
            errorCode={loginState.fieldErrors?.email}
            icon={<Mail size={18} />}
            label={copy.emailLabel}
            name="email"
            placeholder={copy.emailPlaceholder}
            type="email"
          />
          <FormField
            copy={copy}
            errorCode={loginState.fieldErrors?.password}
            icon={<ShieldCheck size={18} />}
            label={copy.passwordLabel}
            name="password"
            placeholder={copy.passwordPlaceholder}
            type="password"
          />
          <FormMessage copy={copy} state={loginState} />
          <SubmitButton
            icon={<LogIn size={18} />}
            label={copy.loginButton}
          />
        </form>
      ) : (
        <form
          action={playerFormAction}
          aria-labelledby="account-tab-player"
          className="space-y-4"
          id="account-panel-player"
          role="tabpanel"
        >
          <FormField
            copy={copy}
            errorCode={playerState.fieldErrors?.name}
            icon={<UserRound size={18} />}
            label={copy.nameLabel}
            name="name"
            placeholder={copy.namePlaceholder}
          />
          <FormField
            copy={copy}
            errorCode={playerState.fieldErrors?.email}
            icon={<Mail size={18} />}
            label={copy.emailLabel}
            name="email"
            placeholder={copy.emailPlaceholder}
            type="email"
          />
          <FormField
            copy={copy}
            errorCode={playerState.fieldErrors?.password}
            icon={<ShieldCheck size={18} />}
            label={copy.passwordLabel}
            name="password"
            placeholder={copy.passwordPlaceholder}
            type="password"
          />
          <FormMessage copy={copy} state={playerState} />
          <SubmitButton
            icon={<UserRound size={18} />}
            label={copy.registerButton}
          />
        </form>
      )}
    </div>
  );
}

function FormField({
  copy,
  errorCode,
  icon,
  label,
  name,
  placeholder,
  type = "text",
}: {
  copy: LandingContent["auth"];
  errorCode?: AuthMessageCode;
  icon: ReactNode;
  label: string;
  name: "email" | "name" | "password";
  placeholder: string;
  type?: "email" | "password" | "text";
}) {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;

  return (
    <label className="block space-y-2" htmlFor={fieldId}>
      <span className="text-sm font-medium text-secondary-foreground">
        {label}
      </span>
      <span className="game-input-wrap">
        {icon}
        <input
          aria-describedby={errorCode ? errorId : undefined}
          aria-invalid={errorCode ? true : undefined}
          className="game-input"
          id={fieldId}
          name={name}
          placeholder={placeholder}
          required
          type={type}
        />
      </span>
      {errorCode ? (
        <span
          className="block text-xs font-semibold text-red-400"
          id={errorId}
        >
          {copy.messages[errorCode]}
        </span>
      ) : null}
    </label>
  );
}

function FormMessage({
  copy,
  state,
}: {
  copy: LandingContent["auth"];
  state: PublicAuthState;
}) {
  if (!state.messageCode) {
    return null;
  }

  return (
    <p
      aria-live="polite"
      className="rounded-lg border border-destructive bg-destructive/20 px-3 py-2 text-sm text-destructive-foreground"
      role="status"
    >
      {copy.messages[state.messageCode]}
    </p>
  );
}

function SubmitButton({ icon, label }: { icon: ReactNode; label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-disabled={pending}
      className="game-button-primary w-full"
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
      ) : (
        icon
      )}
      {label}
    </button>
  );
}
