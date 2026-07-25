import type { Ref } from "react";

import { ShowcaseCalloutRail } from "../../components/showcase-callout-rail";
import { ShowcaseNotification } from "../../components/showcase-notification";
import { ShowcaseReplayButton } from "../../components/showcase-replay-button";
import { ShowcaseStageFrame } from "../../components/showcase-stage-frame";
import { ShiftSimulationDepartments } from "./shift-simulation-departments";
import { ShiftSimulationEvents } from "./shift-simulation-events";
import { ShiftSimulationPlan } from "./shift-simulation-plan";
import type { ShiftSimulationSceneState } from "./shift-simulation-scene-state";
import { ShiftSimulationSummary } from "./shift-simulation-summary";
import type {
  ShiftSimulationSceneCopy,
  ShiftSimulationSceneData,
  ShiftSimulationSceneModel,
  ShiftSimulationTarget,
} from "./shift-simulation-scene-types";

export type ShiftSimulationSceneViewProps = {
  copy: ShiftSimulationSceneCopy;
  data: ShiftSimulationSceneData;
  model: ShiftSimulationSceneModel;
  numberLocale: string;
  onCalloutSelect: (target: ShiftSimulationTarget) => void;
  onReplay: () => void;
  onStart: () => void;
  rootRef?: Ref<HTMLElement>;
  state: ShiftSimulationSceneState;
};

export function ShiftSimulationSceneView({
  copy,
  data,
  model,
  numberLocale,
  onCalloutSelect,
  onReplay,
  onStart,
  rootRef,
  state,
}: ShiftSimulationSceneViewProps) {
  return (
    <ShowcaseStageFrame
      description={copy.sectionDescription}
      eyebrow={copy.sectionEyebrow}
      id={data.sceneId}
      rootRef={rootRef}
      title={copy.sectionTitle}
    >
      <div
        className="relative p-3 sm:p-5 lg:p-6"
        data-scene-status={state.status}
        data-shift-simulation-scene
        data-showcase-stage-content
      >
        <ShowcaseNotification
          body={copy.notificationDescription}
          title={copy.notificationTitle}
          visible={state.isNotificationVisible}
        />
        <p
          aria-live="polite"
          className="sr-only"
          data-shift-simulation-live-region
          role="status"
        >
          {state.liveMessage}
        </p>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px_270px] xl:items-start">
          <div data-shift-main-column>
            <ShiftSimulationPlan
              copy={copy}
              data={data}
              model={model}
              numberLocale={numberLocale}
              onStart={onStart}
              state={state}
            />
            <ShiftSimulationDepartments
              copy={copy}
              model={model}
              numberLocale={numberLocale}
              state={state}
            />
          </div>

          <ShiftSimulationEvents
            copy={copy}
            data={data}
            model={model}
            state={state}
          />

          <aside
            className="rounded-xl border border-white/10 bg-background/38 p-3"
            data-showcase-callout-column
          >
            <ShowcaseCalloutRail
              activeTarget={state.activeTarget}
              ariaLabel={copy.calloutRailLabel}
              callouts={copy.callouts}
              onSelect={onCalloutSelect}
            />
          </aside>
        </div>

        <ShiftSimulationSummary
          copy={copy}
          highlighted={state.activeTarget === "shift-summary"}
          isOpen={state.isSummaryOpen}
          model={model}
          numberLocale={numberLocale}
          sceneId={data.sceneId}
        />

        <div className="mt-4 flex justify-end border-t border-white/8 pt-4">
          <ShowcaseReplayButton
            disabled={state.status !== "summary_open"}
            label={copy.replayLabel}
            onReplay={onReplay}
          />
        </div>
      </div>
    </ShowcaseStageFrame>
  );
}
