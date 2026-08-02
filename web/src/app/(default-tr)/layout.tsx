import type { Metadata, Viewport } from "next";

import {
  factoryRunwayRootMetadata,
  factoryRunwayRootViewport,
} from "../pwa-config";

import "../globals.css";

export const metadata: Metadata = factoryRunwayRootMetadata;
export const viewport: Viewport = factoryRunwayRootViewport;

export default function DefaultRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="h-full font-sans antialiased" lang="en">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
