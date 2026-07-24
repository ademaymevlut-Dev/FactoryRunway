export type ShowcaseSelection = {
  readonly sectorKey: string;
  readonly productKeys: readonly string[];
};

export function validateShowcaseSelection(
  selection: ShowcaseSelection,
): void {
  if (!selection.sectorKey.trim()) {
    throw new Error("Showcase sector key boş olamaz.");
  }

  if (selection.productKeys.length === 0) {
    throw new Error("Showcase product key listesi boş olamaz.");
  }

  const seen = new Set<string>();

  for (const [index, productKey] of selection.productKeys.entries()) {
    if (!productKey.trim()) {
      throw new Error(`Showcase productKeys[${index}] boş olamaz.`);
    }

    if (seen.has(productKey)) {
      throw new Error(`Tekrarlı showcase product key: ${productKey}`);
    }

    seen.add(productKey);
  }
}

export const showcaseSelection = {
  sectorKey: "textile",
  productKeys: [
    "clavier_tshirt",
    "sportise_twinset",
    "backham_blazer",
  ],
} as const;

validateShowcaseSelection(showcaseSelection);
