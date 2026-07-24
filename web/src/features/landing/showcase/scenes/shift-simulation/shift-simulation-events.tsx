import { Activity, Wrench } from "lucide-react";

import {
  DailyEventRowView,
  type DailyEventSeverity,
} from "@/components/game-presentation/daily-event-row-view";

import { formatShiftSimulationTime } from "./shift-simulation-formatters";
import type { ShiftSimulationSceneState } from "./shift-simulation-scene-state";
import type {
  ShiftSimulationSceneCopy,
  ShiftSimulationSceneData,
  ShiftSimulationSceneModel,
  ShiftEventSeverity,
} from "./shift-simulation-scene-types";
import { getShiftSimulationTargetClass } from "./shift-simulation-target";

const severityByEventSeverity: Record<
  ShiftEventSeverity,
  DailyEventSeverity
> = {
  critical: "CRITICAL",
  info: "INFO",
  warning: "WARNING",
};

export type ShiftSimulationEventsProps = {
  copy: ShiftSimulationSceneCopy;
  data: ShiftSimulationSceneData;
  model: ShiftSimulationSceneModel;
  state: ShiftSimulationSceneState;
};

export function ShiftSimulationEvents({
  copy,
  data,
  model,
  state,
}: ShiftSimulationEventsProps) {
  const visibleEvents = model.events.filter((event) =>
    state.visibleEventIds.includes(event.id),
  );

  return (
    <section
      aria-labelledby={`${data.sceneId}-events-title`}
      aria-live="polite"
      className={getShiftSimulationTargetClass(
        state.activeTarget,
        "shift-event",
        "border border-white/10 bg-background/48 p-3",
      )}
      data-highlighted={state.activeTarget === "shift-event"}
      data-shift-simulation-events
      data-showcase-target="shift-event"
    >
      <h3
        className="flex items-center gap-2 text-sm font-semibold text-foreground"
        id={`${data.sceneId}-events-title`}
      >
        <Activity aria-hidden="true" className="text-primary" size={16} />
        {copy.eventPanelTitle}
      </h3>

      <div className="mt-3">
        {visibleEvents.length > 0 ? (
          visibleEvents.map((event) => (
            <DailyEventRowView
              categoryKey={event.departmentKey}
              categoryLabel={event.copy.categoryLabel}
              description={event.copy.description}
              iconKey="wrench"
              key={event.id}
              severity={severityByEventSeverity[event.severity]}
              timestampLabel={formatShiftSimulationTime(
                data.shift.startTime,
                data.shift.endTime,
                event.triggerProgress,
              )}
              title={event.copy.title}
              tone="machine"
            />
          ))
        ) : (
          <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-white/10 bg-card/35 p-4 text-center">
            <div>
              <Wrench
                aria-hidden="true"
                className="mx-auto text-muted-foreground"
                size={20}
              />
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {copy.eventWaitingLabel}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
