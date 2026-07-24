import { NotificationToastView } from "@/components/game-presentation/notification-toast-view";
import { cn } from "@/lib/utils";

export type ShowcaseNotificationProps = {
  body: string;
  title: string;
  visible: boolean;
};

export function ShowcaseNotification({
  body,
  title,
  visible,
}: ShowcaseNotificationProps) {
  return (
    <div
      aria-hidden={!visible}
      aria-live="polite"
      className={cn(
        "pointer-events-none absolute right-3 top-3 z-30 w-[min(21rem,calc(100%-1.5rem))] translate-y-2 opacity-0 transition-[opacity,transform] duration-300 sm:right-5 sm:top-5 xl:right-[300px]",
        visible && "translate-y-0 opacity-100",
      )}
      data-showcase-notification
      role="status"
    >
      <NotificationToastView body={body} title={title} tone="success" />
    </div>
  );
}
