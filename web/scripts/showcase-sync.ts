import {
  formatShowcaseCatalogError,
  serializeShowcaseCatalog,
} from "@/features/landing/showcase/showcase-catalog";
import { mapShowcaseCatalog } from "@/features/landing/showcase/showcase-mapper";
import {
  showcaseSelection,
  validateShowcaseSelection,
} from "@/features/landing/showcase/showcase-selection";
import { getPrisma } from "@/lib/db";

import { readShowcaseCatalogSource } from "./showcase-catalog-source";
import {
  showcaseCatalogFilePath,
  writeGeneratedShowcaseCatalogAtomically,
} from "./showcase-files";

async function main() {
  validateShowcaseSelection(showcaseSelection);
  const prisma = getPrisma();

  try {
    const source = await readShowcaseCatalogSource(showcaseSelection);
    const catalog = mapShowcaseCatalog(source, showcaseSelection);
    const serialized = serializeShowcaseCatalog(catalog, showcaseSelection);

    await writeGeneratedShowcaseCatalogAtomically(serialized);

    console.log(
      `Showcase catalog synced: ${showcaseCatalogFilePath} (${catalog.products.length} products)`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(formatShowcaseCatalogError(error));
  process.exitCode = 1;
});
