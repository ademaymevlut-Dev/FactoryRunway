import type { Metadata, Viewport } from "next";

export const FACTORY_RUNWAY_APP_NAME = "FactoryRunway";
export const FACTORY_RUNWAY_SHORT_NAME = "FactoryRun";
export const FACTORY_RUNWAY_DESCRIPTION =
  "Web-based factory management simulation game.";

// Mirrors the permanent dark palette's --background token in globals.css.
export const FACTORY_RUNWAY_THEME_COLOR = "#232429";
export const FACTORY_RUNWAY_BACKGROUND_COLOR = FACTORY_RUNWAY_THEME_COLOR;

const factoryRunwayBrowserIcon = {
  type: "image/svg+xml",
  url: "/factoryRunway.svg",
};

export const factoryRunwayRootMetadata: Metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: FACTORY_RUNWAY_APP_NAME,
  },
  description: FACTORY_RUNWAY_DESCRIPTION,
  icons: {
    apple: [
      {
        sizes: "180x180",
        type: "image/png",
        url: "/apple-icon.png",
      },
    ],
    icon: [factoryRunwayBrowserIcon],
    shortcut: [factoryRunwayBrowserIcon],
  },
  title: "Factory Runway",
};

export const factoryRunwayRootViewport: Viewport = {
  initialScale: 1,
  themeColor: FACTORY_RUNWAY_THEME_COLOR,
  width: "device-width",
};

export const factoryRunwayGameViewport: Viewport = {
  ...factoryRunwayRootViewport,
  viewportFit: "cover",
};
