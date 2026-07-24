"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { cn } from "@/lib/utils";

export type ProductRouteTimelineStep = {
  active?: boolean;
  canOutsource: boolean;
  departmentKey: string;
  label: string;
  sequence: number;
  workloadLabel?: string;
  workloadPointsPerUnit: number;
};

export type ProductRouteTimelineProps = {
  emptyLabel?: string;
  outsourceLabel?: string;
  steps: readonly ProductRouteTimelineStep[];
  title?: string;
};

export function ProductRouteTimeline({
  emptyLabel = "-",
  outsourceLabel,
  steps,
  title,
}: ProductRouteTimelineProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const viewportRef = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);
  const accessibleLabel =
    title ?? (steps.map((step) => step.label).join(" > ") || emptyLabel);

  useEffect(() => {
    const text = textRef.current;
    const viewport = viewportRef.current;

    if (!text || !viewport) return;

    const measure = () => {
      setDistance(Math.max(0, text.scrollWidth - viewport.clientWidth));
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(text);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [steps]);

  return (
    <span
      aria-label={accessibleLabel}
      className="block max-w-full overflow-hidden"
      data-product-route-timeline
      ref={viewportRef}
      title={accessibleLabel}
    >
      <span
        className={cn(
          "inline-block whitespace-nowrap pr-3",
          distance > 0 && "order-route-marquee",
        )}
        ref={textRef}
        style={
          {
            "--order-route-marquee-distance": `${distance}px`,
          } as CSSProperties
        }
      >
        {steps.length === 0
          ? emptyLabel
          : steps.map((step, index) => (
              <span
                aria-current={step.active ? "step" : undefined}
                className={cn(
                  "inline",
                  step.active && "text-primary",
                )}
                data-active={step.active ?? false}
                data-can-outsource={step.canOutsource}
                data-department-key={step.departmentKey}
                data-route-sequence={step.sequence}
                data-workload-points={step.workloadPointsPerUnit}
                key={`${step.departmentKey}:${step.sequence}`}
              >
                {index > 0 ? (
                  <span aria-hidden="true" className="text-muted-foreground">
                    {" > "}
                  </span>
                ) : null}
                <span>{step.label}</span>
                {step.workloadLabel ? (
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                    {step.workloadLabel}
                  </span>
                ) : null}
                {step.canOutsource && outsourceLabel ? (
                  <span className="ml-1 rounded border border-fuchsia-300/30 bg-fuchsia-400/10 px-1 text-[9px] font-semibold text-fuchsia-100">
                    {outsourceLabel}
                  </span>
                ) : null}
              </span>
            ))}
      </span>
    </span>
  );
}
