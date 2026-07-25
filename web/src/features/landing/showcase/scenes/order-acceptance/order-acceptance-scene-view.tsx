import type { Ref } from "react";

import { ShowcaseCalloutRail } from "../../components/showcase-callout-rail";
import { ShowcaseNotification } from "../../components/showcase-notification";
import { ShowcaseReplayButton } from "../../components/showcase-replay-button";
import { ShowcaseStageFrame } from "../../components/showcase-stage-frame";
import type { OrderAcceptanceSceneState } from "./order-acceptance-scene-state";
import { isOrderAcceptanceAccepted } from "./order-acceptance-scene-state";
import type {
  OrderAcceptanceSceneCopy,
  OrderAcceptanceSceneModel,
  OrderAcceptanceTarget,
} from "./order-acceptance-scene-types";
import { getOrderAcceptanceTargetClass } from "./order-acceptance-target";
import { OrderOfferDetail } from "./order-offer-detail";
import { OrderOfferList } from "./order-offer-list";

export type OrderAcceptanceSceneViewProps = {
  copy: OrderAcceptanceSceneCopy;
  model: OrderAcceptanceSceneModel;
  numberLocale: string;
  onAccept: () => void;
  onCalloutSelect: (target: OrderAcceptanceTarget) => void;
  onReplay: () => void;
  rootRef?: Ref<HTMLElement>;
  sceneId: string;
  state: OrderAcceptanceSceneState;
};

export function OrderAcceptanceSceneView({
  copy,
  model,
  numberLocale,
  onAccept,
  onCalloutSelect,
  onReplay,
  rootRef,
  sceneId,
  state,
}: OrderAcceptanceSceneViewProps) {
  const accepted = isOrderAcceptanceAccepted(state);

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
        data-order-acceptance-scene
        data-scene-status={state.status}
        data-showcase-stage-content
      >
        <ShowcaseNotification
          body={copy.acceptedNotificationDescription}
          title={copy.acceptedNotificationTitle}
          visible={state.isNotificationVisible}
        />

        <div className="grid gap-3 xl:grid-cols-[230px_minmax(0,1fr)_270px] xl:items-start">
          <div
            className={getOrderAcceptanceTargetClass(
              state.activeTarget,
              "order-offer-list",
            )}
            data-highlighted={state.activeTarget === "order-offer-list"}
            data-showcase-target="order-offer-list"
          >
            <OrderOfferList
              copy={copy}
              numberLocale={numberLocale}
              offers={model.offers}
              selectedOfferId={state.selectedOfferId}
            />
          </div>

          <OrderOfferDetail
            accepted={accepted}
            activeTarget={state.activeTarget}
            copy={copy}
            model={model}
            numberLocale={numberLocale}
            onAccept={onAccept}
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
            disabled={!accepted}
            label={copy.replayLabel}
            onReplay={onReplay}
          />
        </div>
      </div>
    </ShowcaseStageFrame>
  );
}
