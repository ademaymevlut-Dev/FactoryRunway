"use client";

import { useReducedMotion } from "motion/react";
import {
  Children,
  Fragment,
  type PropsWithChildren,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";

const DESKTOP_PANEL_SCROLL_DISTANCE_MULTIPLIER = 2.7;
const DESKTOP_PANEL_SCROLL_SPACER_FACTOR =
  DESKTOP_PANEL_SCROLL_DISTANCE_MULTIPLIER - 1;
const LANDING_MOTION_MEDIA_QUERY = "(min-width: 768px)";
type GsapInstance = (typeof import("gsap"))["gsap"];
type GsapContext = ReturnType<GsapInstance["context"]>;
type GsapMatchMedia = ReturnType<GsapInstance["matchMedia"]>;

function subscribeToLandingMotionViewport(callback: () => void) {
  const mediaQuery = window.matchMedia(LANDING_MOTION_MEDIA_QUERY);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getLandingMotionViewportSnapshot() {
  return window.matchMedia(LANDING_MOTION_MEDIA_QUERY).matches;
}

export function LandingPanelStack({ children }: PropsWithChildren) {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const supportsLandingMotion = useSyncExternalStore(
    subscribeToLandingMotionViewport,
    getLandingMotionViewportSnapshot,
    () => false,
  );
  const panels = Children.toArray(children);

  useEffect(() => {
    const root = rootRef.current;

    if (!root || prefersReducedMotion || !supportsLandingMotion) {
      return;
    }

    let cancelled = false;
    let context: GsapContext | null = null;
    let media: GsapMatchMedia | null = null;
    let refreshFrame: number | null = null;

    async function setupPanelStack() {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/dist/ScrollTrigger"),
      ]);

      if (cancelled || !root) {
        return;
      }

      gsap.registerPlugin(ScrollTrigger);

      const header = document.querySelector<HTMLElement>(
        "[data-landing-header]",
      );
      const getHeaderHeight = () =>
        Math.ceil(header?.getBoundingClientRect().height ?? 0);
      const getAvailablePanelHeight = () =>
        Math.max(window.innerHeight - getHeaderHeight(), 1);
      const getPanelPinStart = (panel: HTMLElement) => {
        const availableHeight = getAvailablePanelHeight();

        return panel.offsetHeight > availableHeight
          ? "bottom bottom"
          : `top ${getHeaderHeight()}px`;
      };
      const updateScrollMetrics = () => {
        const headerHeight = getHeaderHeight();
        const spacerHeight = Math.round(
          Math.max(window.innerHeight - headerHeight, 1) *
            DESKTOP_PANEL_SCROLL_SPACER_FACTOR,
        );

        root.style.setProperty(
          "--landing-header-height",
          `${headerHeight}px`,
        );
        root.style.setProperty(
          "--landing-panel-scroll-spacer-height",
          `${spacerHeight}px`,
        );
      };

      updateScrollMetrics();
      ScrollTrigger.addEventListener("refreshInit", updateScrollMetrics);

      context = gsap.context(() => {
        media = gsap.matchMedia();

        media.add("(min-width: 1024px)", () => {
          root.dataset.landingPanelStackReady = "true";
          updateScrollMetrics();

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

          return () => {
            delete root.dataset.landingPanelStackReady;
          };
        });

        media.add("(min-width: 768px) and (max-width: 1023px)", () => {
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
          updateScrollMetrics,
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
      delete root.dataset.landingPanelStackReady;
      root.style.removeProperty("--landing-header-height");
      root.style.removeProperty("--landing-panel-scroll-spacer-height");
    };
  }, [prefersReducedMotion, supportsLandingMotion]);

  return (
    <div
      className="landing-panel-stack"
      data-landing-panel-stack
      ref={rootRef}
    >
      {panels.map((panel, index) => (
        <Fragment key={index}>
          {panel}
          {index < panels.length - 1 ? (
            <div
              aria-hidden="true"
              className="landing-panel-scroll-spacer"
              data-landing-panel-scroll-spacer
            />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
