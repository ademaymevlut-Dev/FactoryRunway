import { gsap } from "gsap";

import { formatShiftSimulationTime } from "./shift-simulation-formatters";
import type {
  ShiftSimulationSceneData,
  ShiftSimulationTarget,
} from "./shift-simulation-scene-types";

export type ShiftSimulationTimelineCallbacks = {
  formatNumber: (value: number) => string;
  formatProgressAria: (progressPercent: number) => string;
  onBottleneck: () => void;
  onCalloutChange: (target: ShiftSimulationTarget) => void;
  onComplete: () => void;
  onEvent: (eventId: string) => void;
  onOpenSummary: () => void;
  onStart: () => void;
};

function requireSceneElement<T extends Element>(
  root: HTMLElement,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Shift simulation showcase hedefi bulunamadı: ${selector}`);
  }

  return element;
}

export function createShiftSimulationTimeline(
  root: HTMLElement,
  data: ShiftSimulationSceneData,
  callbacks: ShiftSimulationTimelineCallbacks,
) {
  const stage = requireSceneElement<HTMLElement>(
    root,
    "[data-showcase-stage-content]",
  );
  const mainColumn = requireSceneElement<HTMLElement>(
    root,
    "[data-shift-main-column]",
  );
  const eventsPanel = requireSceneElement<HTMLElement>(
    root,
    "[data-shift-simulation-events]",
  );
  const calloutRail = requireSceneElement<HTMLElement>(
    root,
    "[data-showcase-callout-column]",
  );
  const summary = requireSceneElement<HTMLElement>(
    root,
    '[data-showcase-target="shift-summary"]',
  );
  const startButton = requireSceneElement<HTMLButtonElement>(
    root,
    "[data-shift-start-button]",
  );
  const progressView = requireSceneElement<HTMLElement>(
    root,
    "[data-shift-progress-view]",
  );
  const progressBar = requireSceneElement<HTMLElement>(
    progressView,
    '[role="progressbar"]',
  );
  const progressIndicator = requireSceneElement<HTMLElement>(
    progressView,
    '[data-slot="progress-indicator"]',
  );
  const currentTime = requireSceneElement<HTMLElement>(
    progressView,
    "[data-shift-current-time]",
  );
  const progressLabel = requireSceneElement<HTMLElement>(
    progressView,
    "[data-shift-progress-label]",
  );
  const actualOutputs = Object.fromEntries(
    data.departments.map((department) => {
      const departmentRoot = requireSceneElement<HTMLElement>(
        root,
        `[data-shift-department-key="${department.departmentKey}"]`,
      );
      const metric = requireSceneElement<HTMLElement>(
        departmentRoot,
        '[data-shift-department-metric="actual"]',
      );
      const output = requireSceneElement<HTMLSpanElement>(metric, "span");

      return [department.departmentKey, output];
    }),
  ) as Record<string, HTMLSpanElement>;
  const progressProxy = { value: 0 };
  const quantityProxies = Object.fromEntries(
    data.departments.map((department) => [
      department.departmentKey,
      { value: 0 },
    ]),
  ) as Record<string, { value: number }>;
  const shiftDurationSeconds = data.shift.playbackDurationMs / 1_000;
  const shiftStartPosition = 0.8;
  const event = data.events[0];
  const eventPosition =
    shiftStartPosition + shiftDurationSeconds * event.triggerProgress;
  const shiftEndPosition = shiftStartPosition + shiftDurationSeconds;
  const updateProgress = () => {
    const progress = Math.min(1, Math.max(0, progressProxy.value));
    const progressPercent = Math.round(progress * 100);

    progressIndicator.style.transform = `translateX(-${
      100 - progressPercent
    }%)`;
    progressBar.setAttribute("aria-valuenow", String(progressPercent));
    progressBar.setAttribute(
      "aria-label",
      callbacks.formatProgressAria(progressPercent),
    );
    progressView.dataset.progress = progress.toFixed(3);
    currentTime.textContent = formatShiftSimulationTime(
      data.shift.startTime,
      data.shift.endTime,
      progress,
    );
    progressLabel.textContent = `%${progressPercent}`;
  };
  const updateQuantity = (departmentKey: string) => {
    const output = actualOutputs[departmentKey];
    const proxy = quantityProxies[departmentKey];

    if (output && proxy) {
      output.textContent = callbacks.formatNumber(Math.round(proxy.value));
    }
  };
  const resetVisuals = () => {
    progressProxy.value = 0;
    updateProgress();

    for (const department of data.departments) {
      quantityProxies[department.departmentKey].value = 0;
      updateQuantity(department.departmentKey);
    }
  };
  const timeline = gsap.timeline({
    defaults: { duration: 0.46, ease: "power2.out" },
    paused: true,
  });

  gsap.set(stage, { autoAlpha: 0, y: 22 });
  gsap.set(mainColumn, { autoAlpha: 0, x: -18 });
  gsap.set(eventsPanel, { autoAlpha: 0, y: 14 });
  gsap.set(calloutRail, { autoAlpha: 0, x: 18 });
  gsap.set(summary, { autoAlpha: 0, y: 14 });

  timeline
    .addLabel("shift-start", 0.8)
    .call(resetVisuals, [], 0)
    .to(stage, { autoAlpha: 1, duration: 0.52, y: 0 }, 0)
    .to(mainColumn, { autoAlpha: 1, x: 0 }, 0.12)
    .to(eventsPanel, { autoAlpha: 1, y: 0 }, 0.2)
    .to(calloutRail, { autoAlpha: 1, x: 0 }, 0.28)
    .to(summary, { autoAlpha: 1, y: 0 }, 0.32)
    .call(() => callbacks.onCalloutChange("shift-start"), [], 0.35)
    .call(callbacks.onStart, [], 0.4)
    .to(
      startButton,
      { duration: 0.12, ease: "power1.in", scale: 0.96 },
      0.48,
    )
    .to(
      startButton,
      { duration: 0.18, ease: "back.out(2)", scale: 1 },
      0.6,
    )
    .addLabel("shift-progress", shiftStartPosition)
    .call(
      () => callbacks.onCalloutChange("shift-progress"),
      [],
      shiftStartPosition,
    )
    .to(
      progressProxy,
      {
        duration: shiftDurationSeconds,
        ease: "none",
        onUpdate: updateProgress,
        value: 1,
      },
      shiftStartPosition,
    )
    .addLabel("shift-planned", 1.8)
    .call(() => callbacks.onCalloutChange("shift-planned"), [], 1.8);

  for (const department of data.departments) {
    const proxy = quantityProxies[department.departmentKey];

    if (department.departmentKey === event.departmentKey) {
      const preEventQuantity = Math.round(
        department.plannedQuantity * event.triggerProgress,
      );

      timeline
        .to(
          proxy,
          {
            duration: shiftDurationSeconds * event.triggerProgress,
            ease: "none",
            onUpdate: () => updateQuantity(department.departmentKey),
            value: preEventQuantity,
          },
          shiftStartPosition,
        )
        .to(
          proxy,
          {
            duration: shiftDurationSeconds * (1 - event.triggerProgress),
            ease: "power1.out",
            onUpdate: () => updateQuantity(department.departmentKey),
            value: department.actualQuantity,
          },
          eventPosition,
        );
      continue;
    }

    timeline.to(
      proxy,
      {
        duration: shiftDurationSeconds,
        ease: "none",
        onUpdate: () => updateQuantity(department.departmentKey),
        value: department.actualQuantity,
      },
      shiftStartPosition,
    );
  }

  timeline
    .addLabel("shift-event", eventPosition)
    .call(() => callbacks.onEvent(event.id), [], eventPosition)
    .call(
      () => callbacks.onCalloutChange("shift-event"),
      [],
      eventPosition,
    )
    .addLabel("shift-bottleneck", shiftEndPosition - 1.15)
    .call(callbacks.onBottleneck, [], shiftEndPosition - 1.15)
    .call(
      () => callbacks.onCalloutChange("shift-bottleneck"),
      [],
      shiftEndPosition - 1.15,
    )
    .call(callbacks.onComplete, [], shiftEndPosition + 0.02)
    .addLabel("shift-summary", shiftEndPosition + 0.18)
    .call(callbacks.onOpenSummary, [], shiftEndPosition + 0.18)
    .call(
      () => callbacks.onCalloutChange("shift-summary"),
      [],
      shiftEndPosition + 0.2,
    );

  return timeline;
}
