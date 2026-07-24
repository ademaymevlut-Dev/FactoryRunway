import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type OrderMetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
};

export function OrderMetricCard({
  icon: Icon,
  label,
  value,
}: OrderMetricCardProps) {
  return (
    <div className="flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-background/60 px-2 py-1.5">
      <span className="grid size-6 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary">
        <Icon size={13} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] text-muted-foreground">{label}</span>
        <strong className="mt-0.5 block min-w-0 text-sm text-foreground">
          {typeof value === "string" ? (
            <span className="block truncate">{value}</span>
          ) : (
            value
          )}
        </strong>
      </span>
    </div>
  );
}
