import type { Metadata } from "next";

import "../globals.css";

const factoryRunwayIcon = {
  type: "image/svg+xml",
  url: "/factoryRunway.svg",
};

export const metadata: Metadata = {
  icons: {
    icon: [factoryRunwayIcon],
    shortcut: [factoryRunwayIcon],
  },
};

export default function EnglishRootLayout({
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
