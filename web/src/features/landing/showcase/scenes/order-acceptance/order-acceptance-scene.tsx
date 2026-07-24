"use client";

import { useCallback, useMemo, useReducer } from "react";

import { useShowcasePlayback } from "../../hooks/use-showcase-playback";
import { createOrderAcceptanceSceneModel } from "./order-acceptance-scene-model";
import {
  createInitialOrderAcceptanceSceneState,
  reduceOrderAcceptanceScene,
} from "./order-acceptance-scene-state";
import type {
  OrderAcceptanceSceneCopy,
  OrderAcceptanceSceneData,
  OrderAcceptanceTarget,
  ShowcaseLocale,
} from "./order-acceptance-scene-types";
import { OrderAcceptanceSceneView } from "./order-acceptance-scene-view";
import { createOrderAcceptanceTimeline } from "./order-acceptance-timeline";

export type OrderAcceptanceSceneProps = {
  copy: OrderAcceptanceSceneCopy;
  data: OrderAcceptanceSceneData;
  locale: ShowcaseLocale;
  numberLocale: string;
};

export function OrderAcceptanceScene({
  copy,
  data,
  locale,
  numberLocale,
}: OrderAcceptanceSceneProps) {
  const model = useMemo(
    () => createOrderAcceptanceSceneModel(data, locale, copy),
    [copy, data, locale],
  );
  const [state, dispatch] = useReducer(
    reduceOrderAcceptanceScene,
    data.selectedOfferId,
    createInitialOrderAcceptanceSceneState,
  );
  const createTimeline = useCallback(
    (root: HTMLElement) =>
      createOrderAcceptanceTimeline(root, {
        onAccept: () => dispatch({ type: "accept" }),
        onCalloutChange: (target) =>
          dispatch({ target, type: "select-target" }),
        onComplete: () => dispatch({ type: "complete" }),
        onPlay: () => dispatch({ type: "play" }),
      }),
    [],
  );
  const showReducedMotionResult = useCallback(() => {
    dispatch({ type: "show-reduced-motion-result" });
  }, []);
  const { prefersReducedMotion, restart, rootRef, seek } =
    useShowcasePlayback({
      createTimeline,
      onReducedMotionResult: showReducedMotionResult,
    });
  const handleAccept = useCallback(() => {
    dispatch({ type: "accept" });
    seek("accepted");
  }, [seek]);
  const handleCalloutSelect = useCallback(
    (target: OrderAcceptanceTarget) => {
      dispatch({ target, type: "select-target" });
      seek(target);
    },
    [seek],
  );
  const handleReplay = useCallback(() => {
    dispatch({
      selectedOfferId: data.selectedOfferId,
      type: "replay",
    });

    if (prefersReducedMotion) {
      dispatch({ type: "show-reduced-motion-result" });
      return;
    }

    restart();
  }, [data.selectedOfferId, prefersReducedMotion, restart]);

  return (
    <OrderAcceptanceSceneView
      copy={copy}
      locale={locale}
      model={model}
      numberLocale={numberLocale}
      onAccept={handleAccept}
      onCalloutSelect={handleCalloutSelect}
      onReplay={handleReplay}
      rootRef={rootRef}
      sceneId={data.sceneId}
      state={state}
    />
  );
}
