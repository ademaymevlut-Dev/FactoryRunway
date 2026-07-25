import type { Metadata } from "next";

import "../globals.css";

export const metadata: Metadata = {
  description: "Factory Runway fabrika yönetim simülasyonu.",
  title: "Factory Runway",
};

export default function TurkishRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="h-full font-sans antialiased" lang="tr">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
