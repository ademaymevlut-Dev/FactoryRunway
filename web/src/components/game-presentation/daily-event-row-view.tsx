import {
  Banknote,
  Boxes,
  CheckCircle2,
  Flag,
  Info,
  PackageCheck,
  PlayCircle,
  ReceiptText,
  Sparkles,
  Truck,
  User,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type DailyEventSeverity =
  | "CRITICAL"
  | "INFO"
  | "SUCCESS"
  | "WARNING";

export type DailyEventIconKey =
  | "banknote"
  | "boxes"
  | "check"
  | "flag"
  | "info"
  | "package"
  | "play"
  | "receipt"
  | "sparkles"
  | "truck"
  | "user"
  | "wrench";

export type DailyEventTone =
  | "cyan"
  | "danger"
  | "fuchsia"
  | "info"
  | "machine"
  | "orange"
  | "sky"
  | "success"
  | "violet"
  | "warning";

export type DailyEventRowVariant = "default" | "levelUp";

export type DailyEventRowViewProps = {
  animationDelayMs?: number;
  badgeLabel?: string;
  categoryKey: string;
  categoryLabel: string;
  description: string;
  iconKey?: DailyEventIconKey;
  severity: DailyEventSeverity;
  timestampLabel?: string;
  title: string;
  tone?: DailyEventTone;
  variant?: DailyEventRowVariant;
};

const toneClasses: Record<DailyEventTone, string> = {
  cyan: "border-cyan-300/35 bg-cyan-400/15 text-cyan-100",
  danger: "border-red-300/35 bg-red-400/15 text-red-100",
  fuchsia: "border-fuchsia-300/35 bg-fuchsia-400/15 text-fuchsia-100",
  info: "border-white/10 bg-background/80 text-primary",
  machine: "border-slate-200/35 bg-slate-300/15 text-slate-100",
  orange: "border-orange-300/35 bg-orange-400/15 text-orange-100",
  sky: "border-sky-300/35 bg-sky-400/15 text-sky-100",
  success: "border-emerald-300/35 bg-emerald-400/15 text-emerald-100",
  violet: "border-violet-300/35 bg-violet-400/15 text-violet-100",
  warning: "border-amber-300/35 bg-amber-400/15 text-amber-100",
};

const severityTones: Record<DailyEventSeverity, DailyEventTone> = {
  CRITICAL: "danger",
  INFO: "info",
  SUCCESS: "success",
  WARNING: "orange",
};

const iconByKey: Record<DailyEventIconKey, LucideIcon> = {
  banknote: Banknote,
  boxes: Boxes,
  check: CheckCircle2,
  flag: Flag,
  info: Info,
  package: PackageCheck,
  play: PlayCircle,
  receipt: ReceiptText,
  sparkles: Sparkles,
  truck: Truck,
  user: User,
  wrench: Wrench,
};

export function DailyEventRowView({
  animationDelayMs = 0,
  badgeLabel = "Level Up",
  categoryKey,
  categoryLabel,
  description,
  iconKey = "info",
  severity,
  timestampLabel,
  title,
  tone,
  variant = "default",
}: DailyEventRowViewProps) {
  const Icon = iconByKey[iconKey];
  const resolvedTone = tone ?? severityTones[severity];
  const isLevelUp = variant === "levelUp";

  return (
    <article
      className={[
        "relative grid grid-cols-[auto_1fr] gap-3 overflow-hidden rounded-lg border motion-safe:animate-in motion-safe:fade-in-0",
        isLevelUp
          ? "origin-top border-emerald-200/45 bg-[linear-gradient(135deg,rgba(16,185,129,0.24),rgba(245,158,11,0.18)_46%,rgba(124,58,237,0.22))] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_42px_rgba(16,185,129,0.18)] motion-safe:zoom-in-95 motion-safe:slide-in-from-right-8 motion-safe:slide-in-from-top-1 motion-safe:duration-500"
          : "border-white/10 bg-card/72 p-3 motion-safe:slide-in-from-right-4 motion-safe:duration-300",
      ].join(" ")}
      data-event-category={categoryKey}
      data-event-severity={severity}
      data-event-tone={resolvedTone}
      data-event-variant={variant}
      data-daily-event-row-view
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      {isLevelUp ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-emerald-200/80 shadow-[0_0_18px_rgba(110,231,183,0.65)]"
        />
      ) : null}
      <div
        className={[
          "mt-0.5 grid place-items-center rounded-full border",
          isLevelUp
            ? "size-11 border-emerald-100/55 bg-emerald-300/20 text-emerald-50 shadow-[0_0_24px_rgba(110,231,183,0.34)]"
            : `size-8 ${toneClasses[resolvedTone]}`,
        ].join(" ")}
      >
        <Icon aria-hidden="true" className={isLevelUp ? "size-5" : "size-4"} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          {timestampLabel ? (
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {timestampLabel}
            </span>
          ) : (
            <span />
          )}
          <div className="flex shrink-0 items-center gap-1.5">
            {isLevelUp ? (
              <span className="rounded-full border border-emerald-100/35 bg-emerald-200/15 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-50">
                {badgeLabel}
              </span>
            ) : null}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {categoryLabel}
            </span>
          </div>
        </div>
        <p
          className={
            isLevelUp
              ? "mt-1.5 text-base font-extrabold uppercase leading-tight text-white"
              : "mt-1 text-sm font-medium text-white"
          }
        >
          {title}
        </p>
        <p
          className={
            isLevelUp
              ? "mt-1.5 text-xs font-medium leading-5 text-emerald-50/80"
              : "mt-1 text-xs leading-5 text-muted-foreground"
          }
        >
          {description}
        </p>
      </div>
    </article>
  );
}
