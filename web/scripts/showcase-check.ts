import {
  formatShowcaseCatalogError,
  serializeShowcaseCatalog,
} from "@/features/landing/showcase/showcase-catalog";
import { showcaseSelection } from "@/features/landing/showcase/showcase-selection";

import {
  parseGeneratedShowcaseCatalog,
  readGeneratedShowcaseCatalog,
} from "./showcase-files";

async function main() {
  const contents = await readGeneratedShowcaseCatalog();
  const canonicalContents = serializeShowcaseCatalog(
    parseGeneratedShowcaseCatalog(contents),
    showcaseSelection,
  );

  if (contents !== canonicalContents) {
    throw new Error(
      "Generated showcase JSON canonical format veya deterministik sıra ile eşleşmiyor.",
    );
  }

  console.log("Showcase catalog canonical check passed.");
}

main().catch((error) => {
  console.error(formatShowcaseCatalogError(error));
  process.exitCode = 1;
});
