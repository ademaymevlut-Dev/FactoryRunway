import type { Viewport } from "next";
import type { ReactNode } from "react";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function GameLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
