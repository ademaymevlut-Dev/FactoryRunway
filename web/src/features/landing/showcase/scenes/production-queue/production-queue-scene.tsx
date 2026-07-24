"use client";

import { useCallback, useMemo, useReducer } from "react";
import { flushSync } from "react-dom";

import { useShowcasePlayback } from "../../hooks/use-showcase-playback";
import { createProductionQueueSceneModel } from "./production-queue-scene-model";
import {
  createInitialProductionQueueSceneState,
  reduceProductionQueueScene,
} from "./production-queue-scene-state";
import type {
  ProductionQueueLocale,
  ProductionQueueSceneCopy,
  ProductionQueueSceneData,
  ProductionQueueTarget,
} from "./production-queue-scene-types";
import { ProductionQueueSceneView } from "./production-queue-scene-view";
import { createProductionQueueTimeline } from "./production-queue-timeline";

export type ProductionQueueSceneProps = {
  copy: ProductionQueueSceneCopy;
  data: ProductionQueueSceneData;
  locale: ProductionQueueLocale;
  numberLocale: string;
};

export function ProductionQueueScene({
  copy,
  data,
  locale,
  numberLocale,
}: ProductionQueueSceneProps) {
  const model = useMemo(
    () => createProductionQueueSceneModel(data, locale, copy),
    [copy, data, locale],
  );
  const [state, dispatch] = useReducer(
    reduceProductionQueueScene,
    data,
    createInitialProductionQueueSceneState,
  );
  const createTimeline = useCallback(
    (root: HTMLElement) =>
      createProductionQueueTimeline(root, {
        onCalloutChange: (target) =>
          dispatch({ target, type: "select-target" }),
        onComplete: () => dispatch({ type: "complete" }),
        onFlipComplete: () => dispatch({ type: "finish-reorder" }),
        onPlay: () => dispatch({ type: "play" }),
        onReorder: () => {
          flushSync(() => dispatch({ data, type: "reorder" }));
        },
        onShowUpdate: () =>
          dispatch({
            liveMessage: copy.liveReorderMessage,
            type: "show-update",
          }),
        onStartReorder: () => dispatch({ type: "start-reorder" }),
      }),
    [copy.liveReorderMessage, data],
  );
  const showReducedMotionResult = useCallback(() => {
    dispatch({
      data,
      liveMessage: copy.liveReorderMessage,
      type: "show-reduced-motion-result",
    });
  }, [copy.liveReorderMessage, data]);
  const { prefersReducedMotion, restart, rootRef, seek } =
    useShowcasePlayback({
      createTimeline,
      onReducedMotionResult: showReducedMotionResult,
    });
  const handleCalloutSelect = useCallback(
    (target: ProductionQueueTarget) => {
      dispatch({ target, type: "select-target" });
      seek(target);
    },
    [seek],
  );
  const handleReplay = useCallback(() => {
    flushSync(() => dispatch({ data, type: "replay" }));

    if (prefersReducedMotion) {
      dispatch({
        data,
        liveMessage: copy.liveReorderMessage,
        type: "show-reduced-motion-result",
      });
      return;
    }

    restart();
  }, [
    copy.liveReorderMessage,
    data,
    prefersReducedMotion,
    restart,
  ]);

  return (
    <ProductionQueueSceneView
      copy={copy}
      locale={locale}
      model={model}
      numberLocale={numberLocale}
      onCalloutSelect={handleCalloutSelect}
      onReplay={handleReplay}
      rootRef={rootRef}
      sceneId={data.sceneId}
      state={state}
    />
  );
}
