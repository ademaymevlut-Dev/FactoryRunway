import { cn } from "@/lib/utils";

import type { ShiftSimulationTarget } from "./shift-simulation-scene-types";

export function getShiftSimulationTargetClass(
  activeTarget: ShiftSimulationTarget | null,
  target: ShiftSimulationTarget,
  className?: string,
) {
  return cn(
    "relative rounded-xl transition-[border-color,box-shadow,opacity,transform] duration-300",
    activeTarget === target &&
      "z-10 border-primary/60 shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_65%,transparent),0_0_28px_color-mix(in_srgb,var(--primary)_18%,transparent)]",
    className,
  );
}
