"use client";

import { useTransition } from "react";

import { updatePlayerPreferredLocaleAction } from "@/app/player-locale-actions";
import {
  otherLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales";

type GameLocaleSwitcherProps = {
  locale: SupportedLocale;
  className?: string;
  variant?: "default" | "hud";
};

export function GameLocaleSwitcher({
  className = "",
  locale,
  variant = "default",
}: GameLocaleSwitcherProps) {
  const [isPending, startTransition] = useTransition();
  const nextLocale = otherLocale(locale);
  const currentLabel = locale.toUpperCase();
  const nextLabel = nextLocale.toUpperCase();

  if (variant === "hud") {
    return (
      <label
        className={[
          "inline-flex h-7 items-center rounded-lg border border-card bg-card/70 text-primary transition focus-within:ring-2 focus-within:ring-primary/45 hover:border-primary/40 sm:h-8 xl:h-9",
          className,
        ].filter(Boolean).join(" ")}
      >
        <span className="sr-only">
          {locale === "tr" ? "Dil seç" : "Select language"}
        </span>
        <select
          aria-label={locale === "tr" ? "Dil seç" : "Select language"}
          className="h-full min-w-14 rounded-lg bg-transparent px-2 text-[10px] font-black uppercase tracking-[0.08em] text-primary outline-none disabled:cursor-not-allowed disabled:opacity-60 xl:min-w-16 xl:text-xs"
          disabled={isPending}
          onChange={(event) => {
            const selectedLocale = event.currentTarget.value as SupportedLocale;

            if (selectedLocale === locale) {
              return;
            }

            startTransition(async () => {
              const result =
                await updatePlayerPreferredLocaleAction(selectedLocale);

              if (result.ok) {
                window.location.reload();
              }
            });
          }}
          value={locale}
        >
          <option value="tr">TR</option>
          <option value="en">EN</option>
        </select>
      </label>
    );
  }

  const buttonClassName =
    "inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card/80 px-3 text-xs font-black uppercase tracking-[0.16em] text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <button
      aria-label={
        locale === "tr"
          ? "Dili English olarak değiştir"
          : "Switch language to Turkish"
      }
      className={[
        buttonClassName,
        className,
      ].filter(Boolean).join(" ")}
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await updatePlayerPreferredLocaleAction(nextLocale);

          if (result.ok) {
            window.location.reload();
          }
        });
      }}
      type="button"
    >
      <span aria-current="true" className="text-foreground">
        {currentLabel}
      </span>
      <span className="text-border">/</span>
      <span>{nextLabel}</span>
    </button>
  );
}
