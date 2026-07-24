import { cn } from "@/lib/utils";

import type { ProductionQueueTarget } from "./production-queue-scene-types";

export function getProductionQueueTargetClass(
  activeTarget: ProductionQueueTarget | null,
  target: ProductionQueueTarget,
  className?: string,
) {
  const isActive = activeTarget === target;

  return cn(
    "relative rounded-xl transition-[opacity,transform,box-shadow] duration-300",
    activeTarget && !isActive && "opacity-[0.62]",
    isActive &&
      "z-10 scale-[1.01] shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_72%,transparent),0_0_30px_color-mix(in_srgb,var(--primary)_18%,transparent)]",
    className,
  );
}
