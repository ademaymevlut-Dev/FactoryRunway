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

export type DailyEventRowViewProps = {
  animationDelayMs?: number;
  categoryKey: string;
  categoryLabel: string;
  description: string;
  iconKey?: DailyEventIconKey;
  severity: DailyEventSeverity;
  timestampLabel?: string;
  title: string;
  tone?: DailyEventTone;
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
  categoryKey,
  categoryLabel,
  description,
  iconKey = "info",
  severity,
  timestampLabel,
  title,
  tone,
}: DailyEventRowViewProps) {
  const Icon = iconByKey[iconKey];
  const resolvedTone = tone ?? severityTones[severity];

  return (
    <article
      className="grid grid-cols-[auto_1fr] gap-3 rounded-lg border border-white/10 bg-card/72 p-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-4 motion-safe:duration-300"
      data-event-category={categoryKey}
      data-event-severity={severity}
      data-event-tone={resolvedTone}
      data-daily-event-row-view
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      <div
        className={`mt-0.5 grid size-8 place-items-center rounded-full border ${toneClasses[resolvedTone]}`}
      >
        <Icon aria-hidden="true" className="size-4" />
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
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {categoryLabel}
          </span>
        </div>
        <p className="mt-1 text-sm font-medium text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </article>
  );
}
