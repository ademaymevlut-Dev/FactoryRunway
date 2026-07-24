import {
  formatShowcaseCatalogError,
  validateShowcaseCatalog,
} from "@/features/landing/showcase/showcase-catalog";
import { showcaseSelection } from "@/features/landing/showcase/showcase-selection";

import {
  parseGeneratedShowcaseCatalog,
  readGeneratedShowcaseCatalog,
} from "./showcase-files";

async function main() {
  const contents = await readGeneratedShowcaseCatalog();
  const catalog = validateShowcaseCatalog(
    parseGeneratedShowcaseCatalog(contents),
    showcaseSelection,
  );

  console.log(
    `Showcase catalog valid: ${catalog.sectorKey} (${catalog.products.length} products)`,
  );
}

main().catch((error) => {
  console.error(formatShowcaseCatalogError(error));
  process.exitCode = 1;
});
