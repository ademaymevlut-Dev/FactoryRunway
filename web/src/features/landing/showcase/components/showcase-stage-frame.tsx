import type { ReactNode, Ref } from "react";

export type ShowcaseStageFrameProps = {
  children: ReactNode;
  description: string;
  eyebrow: string;
  id: string;
  rootRef?: Ref<HTMLElement>;
  title: string;
};

export function ShowcaseStageFrame({
  children,
  description,
  eyebrow,
  id,
  rootRef,
  title,
}: ShowcaseStageFrameProps) {
  const titleId = `${id}-title`;

  return (
    <section
      aria-labelledby={titleId}
      className="relative scroll-mt-20 py-6 sm:py-8 lg:py-10"
      data-showcase-stage-frame
      id={id}
      ref={rootRef}
    >
      <div className="mb-5 max-w-3xl sm:mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-readable">
          {eyebrow}
        </p>
        <h2
          className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl lg:text-4xl"
          id={titleId}
        >
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>

      <div className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-card/90 shadow-2xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,color-mix(in_srgb,var(--primary)_15%,transparent),transparent_28%),radial-gradient(circle_at_84%_18%,rgba(255,69,0,0.08),transparent_24%),linear-gradient(140deg,rgba(255,255,255,0.035),transparent_42%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:42px_42px]"
        />
        <div className="relative">{children}</div>
      </div>
    </section>
  );
}
