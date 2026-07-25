"use client";

import { useCallback, useMemo, useReducer } from "react";
import { flushSync } from "react-dom";

import { useShowcasePlayback } from "../../hooks/use-showcase-playback";
import {
  formatShiftSimulationNumber,
} from "./shift-simulation-formatters";
import { createShiftSimulationSceneModel } from "./shift-simulation-scene-model";
import {
  createInitialShiftSimulationSceneState,
  reduceShiftSimulationScene,
} from "./shift-simulation-scene-state";
import type {
  ShiftSimulationLocale,
  ShiftSimulationSceneCopy,
  ShiftSimulationSceneData,
  ShiftSimulationTarget,
} from "./shift-simulation-scene-types";
import { ShiftSimulationSceneView } from "./shift-simulation-scene-view";
import { createShiftSimulationTimeline } from "./shift-simulation-timeline";

export type ShiftSimulationSceneProps = {
  copy: ShiftSimulationSceneCopy;
  data: ShiftSimulationSceneData;
  locale: ShiftSimulationLocale;
  numberLocale: string;
};

export function ShiftSimulationScene({
  copy,
  data,
  locale,
  numberLocale,
}: ShiftSimulationSceneProps) {
  const model = useMemo(
    () => createShiftSimulationSceneModel(data, locale, copy),
    [copy, data, locale],
  );
  const [state, dispatch] = useReducer(
    reduceShiftSimulationScene,
    data,
    createInitialShiftSimulationSceneState,
  );
  const createTimeline = useCallback(
    (root: HTMLElement) =>
      createShiftSimulationTimeline(root, data, {
        formatNumber: (value) =>
          formatShiftSimulationNumber(value, numberLocale),
        formatProgressAria: (progressPercent) =>
          `${copy.progressAriaLabel}: %${progressPercent}`,
        onBottleneck: () =>
          dispatch({ type: "highlight-bottleneck" }),
        onCalloutChange: (target) =>
          dispatch({ target, type: "select-target" }),
        onComplete: () =>
          dispatch({
            completionMessage: copy.completionLiveMessage,
            data,
            type: "complete",
          }),
        onEvent: (eventId) => {
          const event = model.events.find(
            (candidate) => candidate.id === eventId,
          );

          if (event) {
            dispatch({
              eventId,
              liveMessage: event.copy.liveMessage,
              type: "show-event",
            });
          }
        },
        onOpenSummary: () =>
          dispatch({
            completionMessage: copy.completionLiveMessage,
            type: "open-summary",
          }),
        onStart: () => dispatch({ type: "start" }),
      }),
    [copy, data, model.events, numberLocale],
  );
  const showReducedMotionResult = useCallback(() => {
    dispatch({
      completionMessage: copy.completionLiveMessage,
      data,
      type: "show-reduced-motion-result",
    });
  }, [copy.completionLiveMessage, data]);
  const { prefersReducedMotion, restart, rootRef, seek } =
    useShowcasePlayback({
      createTimeline,
      onReducedMotionResult: showReducedMotionResult,
    });
  const handleStart = useCallback(() => {
    if (state.status !== "idle") return;
    flushSync(() => dispatch({ type: "start" }));
    restart();
  }, [restart, state.status]);
  const handleCalloutSelect = useCallback(
    (target: ShiftSimulationTarget) => {
      dispatch({ target, type: "select-target" });
      seek(target);
    },
    [seek],
  );
  const handleReplay = useCallback(() => {
    flushSync(() => dispatch({ data, type: "replay" }));

    if (prefersReducedMotion) {
      dispatch({
        completionMessage: copy.completionLiveMessage,
        data,
        type: "show-reduced-motion-result",
      });
      return;
    }

    restart();
  }, [
    copy.completionLiveMessage,
    data,
    prefersReducedMotion,
    restart,
  ]);

  return (
    <ShiftSimulationSceneView
      copy={copy}
      data={data}
      model={model}
      numberLocale={numberLocale}
      onCalloutSelect={handleCalloutSelect}
      onReplay={handleReplay}
      onStart={handleStart}
      rootRef={rootRef}
      state={state}
    />
  );
}
