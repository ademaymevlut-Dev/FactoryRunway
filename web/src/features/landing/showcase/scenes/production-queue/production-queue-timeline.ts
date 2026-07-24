import { gsap } from "gsap";

import type { ProductionQueueTarget } from "./production-queue-scene-types";

export type ProductionQueueTimelineCallbacks = {
  onCalloutChange: (target: ProductionQueueTarget) => void;
  onComplete: () => void;
  onFlipComplete: () => void;
  onPlay: () => void;
  onReorder: () => void;
  onShowUpdate: () => void;
  onStartReorder: () => void;
};

type QueuePosition = {
  element: HTMLElement;
  id: string;
  top: number;
};

function requireSceneElement<T extends Element>(
  root: HTMLElement,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Production queue showcase hedefi bulunamadı: ${selector}`);
  }

  return element;
}

function measureQueueRows(root: HTMLElement): QueuePosition[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>("[data-production-queue-item]"),
  ).map((element) => ({
    element,
    id: element.dataset.productionQueueItem ?? "",
    top: element.getBoundingClientRect().top,
  }));
}

function playQueueFlip(
  root: HTMLElement,
  onReorder: () => void,
  onComplete: () => void,
) {
  const firstPositions = new Map(
    measureQueueRows(root).map(({ id, top }) => [id, top]),
  );

  onReorder();

  const lastPositions = measureQueueRows(root);
  const movingRows = lastPositions
    .map(({ element, id, top }) => ({
      deltaY: (firstPositions.get(id) ?? top) - top,
      element,
    }))
    .filter(({ deltaY }) => Math.abs(deltaY) > 0.5);

  if (movingRows.length === 0) {
    onComplete();
    return;
  }

  for (const { deltaY, element } of movingRows) {
    gsap.set(element, {
      willChange: "transform",
      y: deltaY,
      zIndex: element.dataset.movedItem === "true" ? 12 : 4,
    });
  }

  gsap.to(
    movingRows.map(({ element }) => element),
    {
      clearProps: "transform,zIndex,willChange",
      duration: 0.72,
      ease: "power3.inOut",
      onComplete,
      stagger: 0.025,
      y: 0,
    },
  );
}

export function createProductionQueueTimeline(
  root: HTMLElement,
  callbacks: ProductionQueueTimelineCallbacks,
) {
  const stage = requireSceneElement<HTMLElement>(
    root,
    "[data-showcase-stage-content]",
  );
  const queuePanel = requireSceneElement<HTMLElement>(
    root,
    '[data-showcase-target="production-queue-list"]',
  );
  const detail = requireSceneElement<HTMLElement>(
    root,
    "[data-production-queue-detail]",
  );
  const calloutRail = requireSceneElement<HTMLElement>(
    root,
    "[data-showcase-callout-column]",
  );
  const movedRow = requireSceneElement<HTMLElement>(
    root,
    '[data-production-queue-item="queue-sportise"]',
  );
  const timeline = gsap.timeline({
    defaults: { duration: 0.46, ease: "power2.out" },
    paused: true,
  });

  const runFlip = () => {
    timeline.pause();
    playQueueFlip(root, callbacks.onReorder, () => {
      callbacks.onFlipComplete();
      timeline.resume();
    });
  };

  gsap.set(stage, { autoAlpha: 0, y: 22 });
  gsap.set(queuePanel, { autoAlpha: 0, x: -20 });
  gsap.set(detail, { autoAlpha: 0, y: 16 });
  gsap.set(calloutRail, { autoAlpha: 0, x: 18 });

  timeline
    .addLabel("production-queue-list", 0.8)
    .call(callbacks.onPlay, [], 0)
    .to(stage, { autoAlpha: 1, duration: 0.52, y: 0 }, 0)
    .to(queuePanel, { autoAlpha: 1, x: 0 }, 0.12)
    .to(detail, { autoAlpha: 1, y: 0 }, 0.2)
    .to(calloutRail, { autoAlpha: 1, x: 0 }, 0.28)
    .call(
      () => callbacks.onCalloutChange("production-queue-list"),
      [],
      0.55,
    )
    .addLabel("queue-delivery-risk", 1.35)
    .call(
      () => callbacks.onCalloutChange("queue-delivery-risk"),
      [],
      1.35,
    )
    .addLabel("queue-remaining", 2.15)
    .call(
      () => callbacks.onCalloutChange("queue-remaining"),
      [],
      2.15,
    )
    .addLabel("queue-planned", 2.95)
    .call(() => callbacks.onCalloutChange("queue-planned"), [], 2.95)
    .addLabel("queue-drag-handle", 3.75)
    .call(
      () => callbacks.onCalloutChange("queue-drag-handle"),
      [],
      3.75,
    )
    .call(callbacks.onStartReorder, [], 4.2)
    .to(
      movedRow,
      {
        boxShadow:
          "0 18px 36px color-mix(in srgb, var(--primary) 20%, transparent)",
        duration: 0.24,
        scale: 1.012,
        y: -8,
      },
      4.2,
    )
    .to(
      movedRow,
      {
        boxShadow: "none",
        duration: 0.18,
        scale: 1,
        y: 0,
      },
      4.52,
    )
    .call(runFlip, [], 4.76)
    .addLabel("queue-updated-plan", 5.05)
    .call(
      () => callbacks.onCalloutChange("queue-updated-plan"),
      [],
      5.05,
    )
    .call(callbacks.onShowUpdate, [], 5.55)
    .call(callbacks.onComplete, [], 6.05);

  return timeline;
}
