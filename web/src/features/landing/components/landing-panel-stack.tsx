"use client";

import { gsap } from "gsap";
import { useReducedMotion } from "motion/react";
import {
  type PropsWithChildren,
  useEffect,
  useRef,
} from "react";

export function LandingPanelStack({ children }: PropsWithChildren) {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;

    if (!root || prefersReducedMotion) {
      return;
    }

    let cancelled = false;
    let context: gsap.Context | null = null;
    let media: gsap.MatchMedia | null = null;
    let refreshFrame: number | null = null;

    async function setupPanelStack() {
      const { ScrollTrigger } = await import("gsap/dist/ScrollTrigger");

      if (cancelled || !root) {
        return;
      }

      gsap.registerPlugin(ScrollTrigger);

      const header = document.querySelector<HTMLElement>(
        "[data-landing-header]",
      );
      const getHeaderHeight = () =>
        Math.ceil(header?.getBoundingClientRect().height ?? 0);
      const getPanelPinStart = (panel: HTMLElement) => {
        const availableHeight = window.innerHeight - getHeaderHeight();

        return panel.offsetHeight > availableHeight
          ? "bottom bottom"
          : `top ${getHeaderHeight()}px`;
      };
      const updateHeaderHeight = () => {
        root.style.setProperty(
          "--landing-header-height",
          `${getHeaderHeight()}px`,
        );
      };

      updateHeaderHeight();
      ScrollTrigger.addEventListener("refreshInit", updateHeaderHeight);

      context = gsap.context(() => {
        media = gsap.matchMedia();

        media.add("(min-width: 1024px)", () => {
          const panels = gsap.utils.toArray<HTMLElement>(
            "[data-landing-panel]",
            root,
          );

          panels.forEach((panel, index) => {
            const content =
              panel.querySelector<HTMLElement>(
                "[data-landing-panel-content]",
              ) ?? panel;

            gsap.set(panel, { zIndex: index + 1 });

            if (index > 0) {
              gsap.fromTo(
                content,
                { scale: 0.988, y: 72 },
                {
                  ease: "none",
                  scale: 1,
                  scrollTrigger: {
                    end: () => `top ${getHeaderHeight()}px`,
                    invalidateOnRefresh: true,
                    scrub: 1.2,
                    start: "top bottom",
                    trigger: panel,
                  },
                  y: 0,
                },
              );
            }

            const nextPanel = panels[index + 1];

            if (!nextPanel) {
              return;
            }

            ScrollTrigger.create({
              anticipatePin: 1,
              end: () => `top ${getHeaderHeight()}px`,
              endTrigger: nextPanel,
              invalidateOnRefresh: true,
              pin: panel,
              pinSpacing: false,
              start: () => getPanelPinStart(panel),
              trigger: panel,
            });
          });
        });

        media.add("(max-width: 1023px)", () => {
          const panels = gsap.utils.toArray<HTMLElement>(
            "[data-landing-panel]",
            root,
          );

          panels.slice(1).forEach((panel) => {
            const content =
              panel.querySelector<HTMLElement>(
                "[data-landing-panel-content]",
              ) ?? panel;

            gsap.fromTo(
              content,
              { autoAlpha: 0.72, y: 40 },
              {
                autoAlpha: 1,
                duration: 0.72,
                ease: "power2.out",
                scrollTrigger: {
                  start: "top 88%",
                  toggleActions: "play none none reverse",
                  trigger: panel,
                },
                y: 0,
              },
            );
          });
        });
      }, root);

      refreshFrame = window.requestAnimationFrame(() =>
        ScrollTrigger.refresh(),
      );

      return () => {
        ScrollTrigger.removeEventListener(
          "refreshInit",
          updateHeaderHeight,
        );
      };
    }

    let removeRefreshListener: (() => void) | undefined;

    void setupPanelStack().then((cleanup) => {
      if (cancelled) {
        cleanup?.();
        return;
      }

      removeRefreshListener = cleanup;
    });

    return () => {
      cancelled = true;
      removeRefreshListener?.();

      if (refreshFrame !== null) {
        window.cancelAnimationFrame(refreshFrame);
      }

      media?.revert();
      context?.revert();
      root.style.removeProperty("--landing-header-height");
    };
  }, [prefersReducedMotion]);

  return (
    <div
      className="landing-panel-stack"
      data-landing-panel-stack
      ref={rootRef}
    >
      {children}
    </div>
  );
}
