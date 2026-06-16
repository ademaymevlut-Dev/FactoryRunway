import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Factory Runway",
  description: "Factory management simulation UI lab.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className="h-full font-sans antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
