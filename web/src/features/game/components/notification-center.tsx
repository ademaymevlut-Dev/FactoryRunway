import { NotificationToastView } from "@/components/game-presentation/notification-toast-view";
import type { GameNotification } from "../types";

export function NotificationCenter({
  notifications,
}: {
  notifications: GameNotification[];
}) {
  return (
    <aside className="pointer-events-none absolute right-4 top-[7.35rem] z-20 hidden w-80 space-y-2 xl:block">
      {notifications.slice(0, 3).map((notification) => (
        <NotificationToastView
          body={notification.body}
          key={notification.id}
          title={notification.title}
          tone={notification.tone}
        />
      ))}
    </aside>
  );
}
