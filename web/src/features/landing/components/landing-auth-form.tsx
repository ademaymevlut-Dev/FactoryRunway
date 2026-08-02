"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Factory,
  LoaderCircle,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
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
  compact?: boolean;
  defaultTab?: AccountTab;
  idPrefix?: string;
  locale: LandingContent["locale"];
  tabLabels?: Record<AccountTab, string>;
};

export function LandingAuthForm({
  compact = false,
  copy,
  defaultTab = "login",
  idPrefix,
  locale,
  tabLabels,
}: LandingAuthFormProps) {
  const [activeTab, setActiveTab] = useState<AccountTab>(defaultTab);
  const [loginState, loginFormAction] = useActionState(
    loginAction,
    initialPublicAuthState,
  );
  const [playerState, playerFormAction] = useActionState(
    createPlayerAction,
    initialPublicAuthState,
  );
  const accountTabs = [
    { key: "login", label: tabLabels?.login ?? copy.loginTab },
    { key: "player", label: tabLabels?.player ?? copy.registerTab },
  ] as const;
  const getPanelId = (tab: AccountTab) =>
    idPrefix ? `account-${idPrefix}-panel-${tab}` : `account-panel-${tab}`;
  const getTabId = (tab: AccountTab) =>
    idPrefix ? `account-${idPrefix}-tab-${tab}` : `account-tab-${tab}`;

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
    document.getElementById(getTabId(nextTab.key))?.focus();
  }

  return (
    <div
      className={
        compact
          ? "landing-auth-stack landing-auth-stack-compact"
          : "landing-auth-stack"
      }
    >
      {!compact ? (
        <>
          <div className="landing-auth-card-head">
            <span className="landing-auth-brand-mark">
              <Factory aria-hidden="true" size={18} />
            </span>
            <div>
              <p className="landing-auth-kicker">{copy.accountCardEyebrow}</p>
              <h3>{copy.accountCardTitle}</h3>
              <p>{copy.accountCardDescription}</p>
            </div>
          </div>

          <GoogleButton copy={copy} locale={locale} />

          <div className="landing-auth-divider">
            <span>{copy.emailDivider}</span>
          </div>
        </>
      ) : null}

      <div
        aria-label={copy.tabsAriaLabel}
        aria-orientation="horizontal"
        className="landing-auth-tabs"
        role="tablist"
      >
        {accountTabs.map((tab, tabIndex) => (
          <button
            aria-controls={getPanelId(tab.key)}
            aria-selected={activeTab === tab.key}
            className={
              activeTab === tab.key
                ? "landing-auth-tab is-active"
                : "landing-auth-tab"
            }
            id={getTabId(tab.key)}
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
          aria-labelledby={getTabId("login")}
          className="landing-auth-form"
          id={getPanelId("login")}
          role="tabpanel"
        >
          <input name="locale" type="hidden" value={locale} />
          <FormField
            autoComplete="email"
            copy={copy}
            errorCode={loginState.fieldErrors?.email}
            icon={<Mail size={18} />}
            label={copy.emailLabel}
            name="email"
            placeholder={copy.emailPlaceholder}
            type="email"
          />
          <FormField
            autoComplete="current-password"
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
          aria-labelledby={getTabId("player")}
          className="landing-auth-form"
          id={getPanelId("player")}
          role="tabpanel"
        >
          <input name="locale" type="hidden" value={locale} />
          <FormField
            autoComplete="name"
            copy={copy}
            errorCode={playerState.fieldErrors?.name}
            icon={<UserRound size={18} />}
            label={copy.nameLabel}
            name="name"
            placeholder={copy.namePlaceholder}
          />
          <FormField
            autoComplete="email"
            copy={copy}
            errorCode={playerState.fieldErrors?.email}
            icon={<Mail size={18} />}
            label={copy.emailLabel}
            name="email"
            placeholder={copy.emailPlaceholder}
            type="email"
          />
          <FormField
            autoComplete="new-password"
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

      {compact ? (
        <>
          <div className="landing-auth-divider">
            <span>{copy.emailDivider}</span>
          </div>
          <GoogleButton copy={copy} locale={locale} />
        </>
      ) : null}
    </div>
  );
}

function GoogleButton({
  copy,
  locale,
}: Pick<LandingAuthFormProps, "copy" | "locale">) {
  return (
    <a
      className="landing-google-button"
      href={`/api/auth/google?locale=${locale}`}
    >
      <GoogleIcon />
      <span>{copy.googleButton}</span>
      <Sparkles aria-hidden="true" className="landing-google-spark" size={16} />
    </a>
  );
}

function FormField({
  autoComplete,
  copy,
  errorCode,
  icon,
  label,
  name,
  placeholder,
  type = "text",
}: {
  autoComplete: "current-password" | "email" | "name" | "new-password";
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
    <label className="landing-auth-field" htmlFor={fieldId}>
      <span className="landing-auth-label">{label}</span>
      <span className="landing-auth-input-wrap">
        {icon}
        <input
          autoCapitalize={name === "name" ? "words" : "none"}
          autoComplete={autoComplete}
          aria-describedby={errorCode ? errorId : undefined}
          aria-invalid={errorCode ? true : undefined}
          className="landing-auth-input"
          id={fieldId}
          inputMode={type === "email" ? "email" : undefined}
          name={name}
          placeholder={placeholder}
          required
          spellCheck={name === "name"}
          type={type}
        />
      </span>
      {errorCode ? (
        <span
          className="landing-auth-error"
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
      className="landing-auth-message"
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
      className="landing-auth-submit"
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

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="landing-google-icon"
      viewBox="0 0 24 24"
    >
      <path
        d="M21.8 12.23c0-.78-.07-1.52-.2-2.23H12v4.26h5.5a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.04-4.4 3.04-7.67Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.75 0 5.06-.9 6.75-2.45l-3.3-2.56c-.92.61-2.1.97-3.45.97-2.65 0-4.9-1.79-5.7-4.2H2.9v2.64A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.3 13.76A6 6 0 0 1 6 12c0-.61.1-1.2.3-1.76V7.6H2.9A10 10 0 0 0 2 12c0 1.6.38 3.1.9 4.4l3.4-2.64Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.04c1.5 0 2.84.52 3.9 1.53l2.93-2.93A9.83 9.83 0 0 0 12 2a10 10 0 0 0-9.1 5.6l3.4 2.64c.8-2.41 3.05-4.2 5.7-4.2Z"
        fill="#EA4335"
      />
    </svg>
  );
}
