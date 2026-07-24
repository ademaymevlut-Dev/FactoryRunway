import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  type LucideIcon,
} from "lucide-react";

export type NotificationToastTone =
  | "danger"
  | "info"
  | "success"
  | "warning";

export type NotificationToastViewProps = {
  body: string;
  title: string;
  tone: NotificationToastTone;
};

const toneClasses: Record<NotificationToastTone, string> = {
  danger: "border-red-400/25 bg-red-500/10 text-red-100",
  info: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
  success: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
  warning: "border-amber-400/25 bg-amber-500/10 text-amber-100",
};

const toneIcons: Record<NotificationToastTone, LucideIcon> = {
  danger: AlertTriangle,
  info: Info,
  success: CheckCircle2,
  warning: Bell,
};

export function NotificationToastView({
  body,
  title,
  tone,
}: NotificationToastViewProps) {
  const Icon = toneIcons[tone];

  return (
    <article
      className={`pointer-events-auto rounded-lg border p-3 shadow-xl backdrop-blur ${toneClasses[tone]}`}
      data-notification-toast-view
      data-notification-tone={tone}
    >
      <div className="flex items-start gap-2">
        <Icon aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 opacity-80">{body}</p>
        </div>
      </div>
    </article>
  );
}
