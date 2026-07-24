import { CheckCircle2, Clock3, Play, Route } from "lucide-react";

import { ProductRouteTimeline } from "@/components/game-presentation/product-route-timeline";
import { ShiftProgressView } from "@/components/game-presentation/shift-progress-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { formatShiftSimulationNumber } from "./shift-simulation-formatters";
import type { ShiftSimulationSceneState } from "./shift-simulation-scene-state";
import type {
  ShiftSimulationLocale,
  ShiftSimulationSceneCopy,
  ShiftSimulationSceneData,
  ShiftSimulationSceneModel,
} from "./shift-simulation-scene-types";
import { getShiftSimulationTargetClass } from "./shift-simulation-target";

export type ShiftSimulationPlanProps = {
  copy: ShiftSimulationSceneCopy;
  data: ShiftSimulationSceneData;
  locale: ShiftSimulationLocale;
  model: ShiftSimulationSceneModel;
  numberLocale: string;
  onStart: () => void;
  state: ShiftSimulationSceneState;
};

export function ShiftSimulationPlan({
  copy,
  data,
  locale,
  model,
  numberLocale,
  onStart,
  state,
}: ShiftSimulationPlanProps) {
  const completed =
    state.status === "completed" || state.status === "summary_open";
  const running = state.status !== "idle" && !completed;
  const progressPercent = Math.round(state.progress * 100);
  const routeSteps = model.product.route.map((step) => ({
    canOutsource: step.canOutsource,
    departmentKey: step.departmentKey,
    label: step.labels[locale],
    sequence: step.sequence,
    workloadLabel: `${formatShiftSimulationNumber(
      step.workloadPointsPerUnit,
      numberLocale,
    )} ${copy.workloadUnitLabel}`,
    workloadPointsPerUnit: step.workloadPointsPerUnit,
  }));

  return (
    <div
      className="rounded-xl border border-white/10 bg-background/52 p-3 sm:p-4"
      data-shift-simulation-plan
    >
      <div className="flex flex-col gap-3 border-b border-white/8 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold text-foreground">
              {model.product.name}
            </h3>
            <Badge
              className="border-cyan-300/25 bg-cyan-400/8 text-cyan-100"
              variant="outline"
            >
              <Clock3 aria-hidden="true" className="mr-1" size={12} />
              {copy.acceleratedLabel}
            </Badge>
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
            {copy.wipNotice}
          </p>
        </div>

        <div
          className={getShiftSimulationTargetClass(
            state.activeTarget,
            "shift-start",
          )}
          data-highlighted={state.activeTarget === "shift-start"}
          data-showcase-target="shift-start"
        >
          <Button
            className="w-full gap-2 bg-primary font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto"
            data-shift-start-button
            disabled={state.status !== "idle"}
            onClick={onStart}
            type="button"
          >
            {completed ? (
              <CheckCircle2 aria-hidden="true" size={16} />
            ) : running ? (
              <Clock3 aria-hidden="true" size={16} />
            ) : (
              <Play aria-hidden="true" size={16} />
            )}
            {completed
              ? copy.completedButtonLabel
              : running
                ? copy.runningButtonLabel
                : copy.startButtonLabel}
          </Button>
        </div>
      </div>

      <div
        className={getShiftSimulationTargetClass(
          state.activeTarget,
          "shift-progress",
          "mt-3 border border-border bg-card/48 p-3",
        )}
        data-highlighted={state.activeTarget === "shift-progress"}
        data-showcase-target="shift-progress"
      >
        <ShiftProgressView
          ariaLabel={`${copy.progressAriaLabel}: %${progressPercent}`}
          completed={completed}
          currentTimeLabel={state.displayTime}
          endLabel={data.shift.endTime}
          label={copy.progressLabel}
          progress={state.progress}
          progressLabel={`%${progressPercent}`}
          startLabel={data.shift.startTime}
        />
      </div>

      <div className="mt-3 rounded-lg border border-border bg-background/55 p-2.5">
        <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <Route aria-hidden="true" size={13} />
          {copy.routeLabel}
        </p>
        <ProductRouteTimeline steps={routeSteps} title={copy.routeLabel} />
      </div>
    </div>
  );
}
