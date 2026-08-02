import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import sharp from "sharp";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const brandAsset = join(projectRoot, "public", "factoryRunway.svg");
// Matches FACTORY_RUNWAY_THEME_COLOR and the --background token.
const themeColor = "#232429";
// The SVG's own viewBox padding leaves the visible standard mark at ~66%.
const standardMarkContainerScale = 0.82;
// The same padding leaves the visible maskable mark at ~54%.
const maskableMarkContainerScale = 0.68;
const iconSpecs = [
  {
    destination: join(projectRoot, "src", "app", "apple-icon.png"),
    markScale: standardMarkContainerScale,
    size: 180,
  },
  {
    destination: join(
      projectRoot,
      "public",
      "icons",
      "factoryrunway-192.png",
    ),
    markScale: standardMarkContainerScale,
    size: 192,
  },
  {
    destination: join(
      projectRoot,
      "public",
      "icons",
      "factoryrunway-512.png",
    ),
    markScale: standardMarkContainerScale,
    size: 512,
  },
  {
    destination: join(
      projectRoot,
      "public",
      "icons",
      "factoryrunway-maskable-512.png",
    ),
    markScale: maskableMarkContainerScale,
    size: 512,
  },
];

for (const { destination, markScale, size } of iconSpecs) {
  const markSize = Math.round(size * markScale);
  const mark = await sharp(brandAsset)
    .resize(markSize, markSize, {
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  await mkdir(dirname(destination), { recursive: true });
  await sharp({
    create: {
      background: themeColor,
      channels: 3,
      height: size,
      width: size,
    },
  })
    .composite([{ gravity: "centre", input: mark }])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(destination);
}
