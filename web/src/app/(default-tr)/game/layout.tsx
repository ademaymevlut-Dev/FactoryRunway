import type { Viewport } from "next";
import type { ReactNode } from "react";

import { factoryRunwayGameViewport } from "../../pwa-config";

export const viewport: Viewport = factoryRunwayGameViewport;

export default function GameLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
