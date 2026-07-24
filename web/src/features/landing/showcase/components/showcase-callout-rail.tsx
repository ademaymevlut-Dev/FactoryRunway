import { cn } from "@/lib/utils";

export type ShowcaseCallout<TTarget extends string> = {
  description: string;
  id: string;
  number: string;
  target: TTarget;
  title: string;
};

export type ShowcaseCalloutRailProps<TTarget extends string> = {
  activeTarget: TTarget | null;
  ariaLabel: string;
  callouts: readonly ShowcaseCallout<TTarget>[];
  onSelect: (target: TTarget) => void;
};

export function ShowcaseCalloutRail<TTarget extends string>({
  activeTarget,
  ariaLabel,
  callouts,
  onSelect,
}: ShowcaseCalloutRailProps<TTarget>) {
  return (
    <nav aria-label={ariaLabel} data-showcase-callout-rail>
      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {callouts.map((callout) => {
          const isActive = callout.target === activeTarget;

          return (
            <li key={callout.id}>
              <button
                aria-pressed={isActive}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-xl border border-white/10 bg-background/55 p-3 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
                  isActive &&
                    "border-primary/60 bg-primary/10 shadow-[0_0_24px_color-mix(in_srgb,var(--primary)_16%,transparent)]",
                )}
                data-callout-target={callout.target}
                onClick={() => onSelect(callout.target)}
                type="button"
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 font-mono text-xs font-semibold text-muted-foreground transition-colors",
                    isActive &&
                      "border-primary/50 bg-primary/15 text-primary",
                  )}
                >
                  {callout.number}
                </span>
                <span className="min-w-0">
                  <strong className="block text-sm font-semibold text-foreground">
                    {callout.title}
                  </strong>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {callout.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
