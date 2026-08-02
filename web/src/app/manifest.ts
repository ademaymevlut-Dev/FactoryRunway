import type { MetadataRoute } from "next";

import {
  FACTORY_RUNWAY_APP_NAME,
  FACTORY_RUNWAY_BACKGROUND_COLOR,
  FACTORY_RUNWAY_DESCRIPTION,
  FACTORY_RUNWAY_SHORT_NAME,
  FACTORY_RUNWAY_THEME_COLOR,
} from "./pwa-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: FACTORY_RUNWAY_BACKGROUND_COLOR,
    description: FACTORY_RUNWAY_DESCRIPTION,
    display: "standalone",
    icons: [
      {
        purpose: "any",
        sizes: "192x192",
        src: "/icons/factoryrunway-192.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "512x512",
        src: "/icons/factoryrunway-512.png",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/icons/factoryrunway-maskable-512.png",
        type: "image/png",
      },
    ],
    id: "/game",
    name: FACTORY_RUNWAY_APP_NAME,
    scope: "/",
    short_name: FACTORY_RUNWAY_SHORT_NAME,
    start_url: "/game",
    theme_color: FACTORY_RUNWAY_THEME_COLOR,
  };
}

