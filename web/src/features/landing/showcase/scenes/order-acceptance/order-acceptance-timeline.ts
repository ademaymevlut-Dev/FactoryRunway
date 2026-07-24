import { gsap } from "gsap";

import type { OrderAcceptanceTarget } from "./order-acceptance-scene-types";

export type OrderAcceptanceTimelineCallbacks = {
  onAccept: () => void;
  onCalloutChange: (target: OrderAcceptanceTarget) => void;
  onComplete: () => void;
  onPlay: () => void;
};

const timelineSteps: ReadonlyArray<{
  position: number;
  target: OrderAcceptanceTarget;
}> = [
  { position: 0.8, target: "order-offer-list" },
  { position: 1.45, target: "order-quantity" },
  { position: 2.25, target: "order-delivery" },
  { position: 3.05, target: "order-colors" },
  { position: 3.95, target: "order-route" },
  { position: 4.95, target: "order-accept" },
];

function requireSceneElement<T extends Element>(
  root: HTMLElement,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Order acceptance showcase hedefi bulunamadı: ${selector}`);
  }

  return element;
}

export function createOrderAcceptanceTimeline(
  root: HTMLElement,
  callbacks: OrderAcceptanceTimelineCallbacks,
) {
  const stage = requireSceneElement<HTMLElement>(
    root,
    "[data-showcase-stage-content]",
  );
  const offerList = requireSceneElement<HTMLElement>(
    root,
    '[data-showcase-target="order-offer-list"]',
  );
  const detail = requireSceneElement<HTMLElement>(
    root,
    "[data-order-acceptance-detail]",
  );
  const calloutRail = requireSceneElement<HTMLElement>(
    root,
    "[data-showcase-callout-column]",
  );
  const acceptButton = requireSceneElement<HTMLButtonElement>(
    root,
    "[data-order-accept-button]",
  );
  const timeline = gsap.timeline({
    defaults: { duration: 0.48, ease: "power2.out" },
    paused: true,
  });

  gsap.set(stage, { autoAlpha: 0, y: 20 });
  gsap.set(offerList, { autoAlpha: 0, x: -18 });
  gsap.set(detail, { autoAlpha: 0, y: 16 });
  gsap.set(calloutRail, { autoAlpha: 0, x: 18 });

  timeline
    .call(callbacks.onPlay, [], 0)
    .to(stage, { autoAlpha: 1, duration: 0.5, y: 0 }, 0)
    .to(offerList, { autoAlpha: 1, x: 0 }, 0.12)
    .to(detail, { autoAlpha: 1, y: 0 }, 0.2)
    .to(calloutRail, { autoAlpha: 1, x: 0 }, 0.28);

  for (const step of timelineSteps) {
    timeline
      .addLabel(step.target, step.position)
      .call(() => callbacks.onCalloutChange(step.target), [], step.position);
  }

  timeline
    .to(
      acceptButton,
      { duration: 0.12, ease: "power1.in", scale: 0.96 },
      5.35,
    )
    .to(
      acceptButton,
      { duration: 0.18, ease: "back.out(2)", scale: 1 },
      5.47,
    )
    .addLabel("accepted", 5.65)
    .call(callbacks.onAccept, [], 5.65)
    .call(callbacks.onComplete, [], 6.2);

  return timeline;
}
