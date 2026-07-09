import { AlertTriangle, Bell, CheckCircle2, Info } from "lucide-react";

import type { GameNotification } from "../types";

const toneClasses: Record<GameNotification["tone"], string> = {
  danger: "border-red-400/25 bg-red-500/10 text-red-100",
  info: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
  success: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
  warning: "border-amber-400/25 bg-amber-500/10 text-amber-100",
};

const toneIcons = {
  danger: AlertTriangle,
  info: Info,
  success: CheckCircle2,
  warning: Bell,
} satisfies Record<GameNotification["tone"], typeof Bell>;

export function NotificationCenter({
  notifications,
}: {
  notifications: GameNotification[];
}) {
  return (
    <aside className="pointer-events-none absolute right-4 top-[7.35rem] z-20 hidden w-80 space-y-2 xl:block">
      {notifications.slice(0, 3).map((notification) => {
        const Icon = toneIcons[notification.tone];

        return (
          <div
            className={`pointer-events-auto rounded-lg border p-3 shadow-xl backdrop-blur ${toneClasses[notification.tone]}`}
            key={notification.id}
          >
            <div className="flex items-start gap-2">
              <Icon className="mt-0.5 shrink-0" size={16} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{notification.title}</p>
                <p className="mt-1 text-xs leading-5 opacity-80">{notification.body}</p>
              </div>
            </div>
          </div>
        );
      })}
    </aside>
  );
}
