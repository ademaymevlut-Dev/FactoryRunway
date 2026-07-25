import type { Ref } from "react";

import { ShowcaseCalloutRail } from "../../components/showcase-callout-rail";
import { ShowcaseNotification } from "../../components/showcase-notification";
import { ShowcaseReplayButton } from "../../components/showcase-replay-button";
import { ShowcaseStageFrame } from "../../components/showcase-stage-frame";
import { ProductionQueueDetail } from "./production-queue-detail";
import { ProductionQueueList } from "./production-queue-list";
import type { ProductionQueueSceneState } from "./production-queue-scene-state";
import type {
  ProductionQueueSceneCopy,
  ProductionQueueSceneModel,
  ProductionQueueTarget,
} from "./production-queue-scene-types";

export type ProductionQueueSceneViewProps = {
  copy: ProductionQueueSceneCopy;
  model: ProductionQueueSceneModel;
  numberLocale: string;
  onCalloutSelect: (target: ProductionQueueTarget) => void;
  onReplay: () => void;
  rootRef?: Ref<HTMLElement>;
  sceneId: string;
  state: ProductionQueueSceneState;
};

export function ProductionQueueSceneView({
  copy,
  model,
  numberLocale,
  onCalloutSelect,
  onReplay,
  rootRef,
  sceneId,
  state,
}: ProductionQueueSceneViewProps) {
  return (
    <ShowcaseStageFrame
      description={copy.sectionDescription}
      eyebrow={copy.sectionEyebrow}
      id={sceneId}
      rootRef={rootRef}
      title={copy.sectionTitle}
    >
      <div
        className="relative p-3 sm:p-5 lg:p-6"
        data-production-queue-scene
        data-scene-status={state.status}
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
          data-production-queue-live-region
          role="status"
        >
          {state.liveMessage}
        </p>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(245px,0.75fr)_270px] xl:items-start">
          <ProductionQueueList
            activeTarget={state.activeTarget}
            copy={copy}
            model={model}
            numberLocale={numberLocale}
            state={state}
          />

          <ProductionQueueDetail
            copy={copy}
            model={model}
            numberLocale={numberLocale}
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

        <div className="mt-4 flex justify-end border-t border-white/8 pt-4">
          <ShowcaseReplayButton
            disabled={state.status !== "completed"}
            label={copy.replayLabel}
            onReplay={onReplay}
          />
        </div>
      </div>
    </ShowcaseStageFrame>
  );
}
