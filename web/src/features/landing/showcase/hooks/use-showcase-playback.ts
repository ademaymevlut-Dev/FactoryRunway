"use client";

import { gsap } from "gsap";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useSyncExternalStore,
} from "react";

export type ShowcaseTimelineFactory = (
  root: HTMLElement,
) => gsap.core.Timeline;

export type UseShowcasePlaybackOptions = {
  createTimeline: ShowcaseTimelineFactory;
  onReducedMotionResult: () => void;
};

type PlaybackControls = {
  restart: () => void;
  seek: (label: string) => void;
};

const idleControls: PlaybackControls = {
  restart: () => undefined,
  seek: () => undefined,
};

function subscribeToReducedMotion(callback: () => void) {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useShowcasePlayback({
  createTimeline,
  onReducedMotionResult,
}: UseShowcasePlaybackOptions) {
  const rootRef = useRef<HTMLElement>(null);
  const controlsRef = useRef<PlaybackControls>(idleControls);
  const hasAutoPlayedRef = useRef(false);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );
  const showReducedMotionResult = useEffectEvent(onReducedMotionResult);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) return;

    if (prefersReducedMotion) {
      hasAutoPlayedRef.current = true;
      showReducedMotionResult();
      controlsRef.current = idleControls;
      return;
    }

    let context: gsap.Context | null = null;
    let isSceneIntersecting = false;
    let shouldResumeOnIntersect = false;
    let timeline: gsap.core.Timeline | null = null;
    let shouldResumeOnVisible = false;

    const initializeTimeline = () => {
      if (timeline) return timeline;

      context = gsap.context(() => {
        timeline = createTimeline(root);
        timeline.pause(0);
      }, root);

      return timeline;
    };

    const restart = () => {
      hasAutoPlayedRef.current = true;
      initializeTimeline()?.restart(true);
    };

    const seek = (label: string) => {
      hasAutoPlayedRef.current = true;
      initializeTimeline()?.pause(label, true);
    };

    controlsRef.current = { restart, seek };

    const observer = new IntersectionObserver(
      (entries) => {
        const sceneEntry = entries[0];
        const visibleReferenceHeight = Math.min(
          sceneEntry?.boundingClientRect.height ?? 0,
          sceneEntry?.rootBounds?.height ?? window.innerHeight,
        );
        const viewportRelativeRatio =
          sceneEntry && visibleReferenceHeight > 0
            ? sceneEntry.intersectionRect.height / visibleReferenceHeight
            : 0;
        const isAutoplayVisible =
          sceneEntry?.isIntersecting &&
          (sceneEntry.intersectionRatio >= 0.35 ||
            viewportRelativeRatio >= 0.35);

        isSceneIntersecting = sceneEntry?.isIntersecting ?? false;

        if (isAutoplayVisible && !hasAutoPlayedRef.current) {
          restart();
        }

        if (
          isSceneIntersecting &&
          shouldResumeOnIntersect &&
          document.visibilityState === "visible"
        ) {
          shouldResumeOnIntersect = false;
          timeline?.resume();
          return;
        }

        if (
          !isSceneIntersecting &&
          timeline?.isActive() &&
          !timeline.paused()
        ) {
          shouldResumeOnIntersect = true;
          timeline.pause();
        }
      },
      { threshold: [0, 0.35, 0.6] },
    );

    const handleVisibilityChange = () => {
      if (!timeline) return;

      if (document.visibilityState === "hidden") {
        shouldResumeOnVisible = timeline.isActive() && !timeline.paused();
        if (shouldResumeOnVisible) timeline.pause();
        return;
      }

      if (shouldResumeOnVisible) {
        shouldResumeOnVisible = false;

        if (isSceneIntersecting) {
          timeline.resume();
        } else {
          shouldResumeOnIntersect = true;
        }
      }
    };

    observer.observe(root);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      timeline?.kill();
      context?.revert();
      controlsRef.current = idleControls;
    };
  }, [createTimeline, prefersReducedMotion]);

  const restart = useCallback(() => {
    controlsRef.current.restart();
  }, []);
  const seek = useCallback((label: string) => {
    controlsRef.current.seek(label);
  }, []);

  return {
    prefersReducedMotion,
    restart,
    rootRef,
    seek,
  };
}
