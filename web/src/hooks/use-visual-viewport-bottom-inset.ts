"use client";

import { useEffect, type RefObject } from "react";

const VISUAL_VIEWPORT_BOTTOM_PROPERTY = "--visual-viewport-bottom";

export function useVisualViewportBottomInset(
  containerRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const container = containerRef.current;
    const visualViewport = window.visualViewport;

    if (!container || !visualViewport) return;

    let animationFrame = 0;
    const syncBottomInset = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const layoutViewportHeight = window.innerHeight;
        const visualViewportBottom = visualViewport.offsetTop + visualViewport.height;
        const bottomInset = Math.max(
          0,
          Math.round(layoutViewportHeight - visualViewportBottom),
        );

        container.style.setProperty(
          VISUAL_VIEWPORT_BOTTOM_PROPERTY,
          `${bottomInset}px`,
        );
      });
    };

    syncBottomInset();
    window.addEventListener("resize", syncBottomInset, { passive: true });
    visualViewport.addEventListener("resize", syncBottomInset, { passive: true });
    visualViewport.addEventListener("scroll", syncBottomInset, { passive: true });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", syncBottomInset);
      visualViewport.removeEventListener("resize", syncBottomInset);
      visualViewport.removeEventListener("scroll", syncBottomInset);
      container.style.removeProperty(VISUAL_VIEWPORT_BOTTOM_PROPERTY);
    };
  }, [containerRef]);
}
