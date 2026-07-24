import {
  ContentStatus,
  Prisma,
  ProductImageVariant,
  ProductImageView,
} from "@/generated/prisma/client";
import type { ShowcaseCatalogSource } from "@/features/landing/showcase/showcase-mapper";
import type { ShowcaseSelection } from "@/features/landing/showcase/showcase-selection";
import { getPrisma } from "@/lib/db";

const showcaseProductSelect = {
  key: true,
  name: true,
  status: true,
  cardPrimaryColor: true,
  cardSecondaryColor: true,
  cardGradientFrom: true,
  cardGradientTo: true,
  cardSvgIconAccentColor: true,
  images: {
    where: {
      view: ProductImageView.FRONT,
      variant: ProductImageVariant.CARD,
    },
    select: {
      url: true,
    },
  },
  category: {
    select: {
      key: true,
      status: true,
      translations: {
        where: { locale: { in: ["tr", "en"] } },
        select: {
          locale: true,
          name: true,
        },
      },
    },
  },
  productType: {
    select: {
      key: true,
      status: true,
      translations: {
        where: { locale: { in: ["tr", "en"] } },
        select: {
          locale: true,
          name: true,
        },
      },
    },
  },
  allowedColors: {
    where: {
      isActive: true,
      colorVariant: {
        status: ContentStatus.ACTIVE,
      },
    },
    orderBy: [
      { sortOrder: "asc" },
      { colorVariant: { key: "asc" } },
    ],
    select: {
      sortOrder: true,
      colorVariant: {
        select: {
          key: true,
          hexCode: true,
          status: true,
          translations: {
            where: { locale: { in: ["tr", "en"] } },
            select: {
              locale: true,
              name: true,
            },
          },
        },
      },
    },
  },
  routeSteps: {
    where: {
      isRequired: true,
    },
    orderBy: {
      sequence: "asc",
    },
    select: {
      sequence: true,
      workloadPointsPerUnit: true,
      canOutsource: true,
      department: {
        select: {
          key: true,
          status: true,
          translations: {
            where: { locale: { in: ["tr", "en"] } },
            select: {
              locale: true,
              name: true,
            },
          },
        },
      },
    },
  },
} as const satisfies Prisma.ProductSelect;

export async function readShowcaseCatalogSource(
  selection: ShowcaseSelection,
): Promise<ShowcaseCatalogSource> {
  const sector = await getPrisma().sector.findUnique({
    where: {
      key: selection.sectorKey,
    },
    select: {
      key: true,
      status: true,
      products: {
        where: {
          key: {
            in: [...selection.productKeys],
          },
        },
        select: showcaseProductSelect,
      },
    },
  });

  if (!sector) {
    throw new Error(`Showcase sector bulunamadı: ${selection.sectorKey}`);
  }

  return {
    sectorKey: sector.key,
    status: sector.status,
    products: sector.products,
  };
}
