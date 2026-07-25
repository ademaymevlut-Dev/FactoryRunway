import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { USER_ROLES } from "@/lib/auth/roles";
import { getPrisma } from "@/lib/db";
import {
  normalizeLocale,
  translatedDescription,
  translatedName,
  type SupportedLocale,
} from "@/lib/i18n/locales";

import { OnboardingExperience, type OnboardingSector } from "./onboarding-experience";

export const dynamic = "force-dynamic";

type SectorBlueprint = {
  key: string;
  photoUrl: string;
  slimPhotoUrl: string;
  status: string;
  playable: boolean;
  copy: Record<
    SupportedLocale,
    {
      title: string;
      shortTitle: string;
      eyebrow: string;
      description: string;
      bullets: string[];
    }
  >;
};

const sectorBlueprints = [
  {
    key: "textile",
    photoUrl: "/sector-images/textile_sector_1600x700.png",
    slimPhotoUrl: "/sector-images/textile_sector_1600x700.png",
    status: "ACTIVE",
    playable: true,
    copy: {
      tr: {
        title: "Textile",
        shortTitle: "Textile",
        eyebrow: "Aktif beta sektörü",
        description: "Kesimden dikime, ütüden sevkiyata kadar tüm üretim sürecini yönet.",
        bullets: [
          "Kesim, dikim ve ütü-paketleme ile başlar.",
          "Nakış, baskı, yıkama ve boyama ilk aşamada outsource edilir.",
          "Small Workshop sahnesiyle oyuna girer.",
        ],
      },
      en: {
        title: "Textile",
        shortTitle: "Textile",
        eyebrow: "Active beta sector",
        description: "Manage the full production flow from cutting and sewing to ironing and shipping.",
        bullets: [
          "Starts with cutting, sewing, and ironing/packing.",
          "Embroidery, printing, washing, and dyeing begin as outsourced processes.",
          "You enter the game at the Small Workshop stage.",
        ],
      },
    },
  },
  {
    key: "toy",
    photoUrl: "/sector-images/textile_sector_1600x700.png",
    slimPhotoUrl: "/sector-images/textile_sector_1600x700.png",
    status: "COMING_SOON",
    playable: false,
    copy: {
      tr: {
        title: "Toy Factory",
        shortTitle: "Toy Factory",
        eyebrow: "Yakında",
        description: "Renkli üretim hatları, eğlenceli ürünler ve farklı üretim dinamikleri.",
        bullets: [
          "Plastik, kumaş ve paketleme akışları farklılaşır.",
          "Sezonluk talep dalgaları daha belirgin olur.",
          "Beta sonrası sektör paketi olarak açılır.",
        ],
      },
      en: {
        title: "Toy Factory",
        shortTitle: "Toy Factory",
        eyebrow: "Coming soon",
        description: "Colorful production lines, playful products, and a different operating rhythm.",
        bullets: [
          "Plastic, fabric, and packing flows change the factory logic.",
          "Seasonal demand swings become more visible.",
          "Opens as a sector pack after beta.",
        ],
      },
    },
  },
  {
    key: "furniture",
    photoUrl: "/sector-images/textile_sector_1600x700.png",
    slimPhotoUrl: "/sector-images/textile_sector_1600x700.png",
    status: "COMING_SOON",
    playable: false,
    copy: {
      tr: {
        title: "Furniture",
        shortTitle: "Furniture",
        eyebrow: "Yakında",
        description: "Atölye planlama, hassas üretim ve teslimat dengesini yönet.",
        bullets: [
          "Daha uzun üretim döngüleriyle kapasite planlaması öne çıkar.",
          "Malzeme ve teslimat riski daha ağır hissedilir.",
          "Beta sonrası sektör paketi olarak açılır.",
        ],
      },
      en: {
        title: "Furniture",
        shortTitle: "Furniture",
        eyebrow: "Coming soon",
        description: "Balance workshop planning, precision production, and delivery discipline.",
        bullets: [
          "Longer production cycles make capacity planning central.",
          "Material and delivery risk feel heavier.",
          "Opens as a sector pack after beta.",
        ],
      },
    },
  },
  {
    key: "chocolate",
    photoUrl: "/sector-images/textile_sector_1600x700.png",
    slimPhotoUrl: "/sector-images/textile_sector_1600x700.png",
    status: "COMING_SOON",
    playable: false,
    copy: {
      tr: {
        title: "Chocolate",
        shortTitle: "Chocolate",
        eyebrow: "Yakında",
        description: "Hız, kalite ve lezzet odaklı üretim süreçlerini deneyimle.",
        bullets: [
          "Tazelik, parti takibi ve kalite kararları öne çıkar.",
          "Fire ve hız dengesi daha görünür hale gelir.",
          "Beta sonrası sektör paketi olarak açılır.",
        ],
      },
      en: {
        title: "Chocolate",
        shortTitle: "Chocolate",
        eyebrow: "Coming soon",
        description: "Experience production decisions shaped by speed, quality, and freshness.",
        bullets: [
          "Freshness, batch tracking, and quality decisions come forward.",
          "Waste and speed tradeoffs become more visible.",
          "Opens as a sector pack after beta.",
        ],
      },
    },
  },
] satisfies SectorBlueprint[];

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN) {
    redirect("/admin");
  }

  const prisma = getPrisma();
  const [playerProfile, dbSectors] = await Promise.all([
    prisma.playerProfile.findUnique({
      where: { userId: user.id },
      select: {
        preferredLocale: true,
        _count: {
          select: { factories: true },
        },
      },
    }),
    prisma.sector.findMany({
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
      select: {
        id: true,
        key: true,
        status: true,
        photoUrl: true,
        slimPhotoUrl: true,
        translations: {
          select: {
            locale: true,
            name: true,
            description: true,
          },
        },
      },
    }),
  ]);

  if (playerProfile && playerProfile._count.factories > 0) {
    redirect("/player");
  }

  const locale = normalizeLocale(playerProfile?.preferredLocale);

  return (
    <OnboardingExperience
      locale={locale}
      sectors={mergeSectorsWithDatabase(dbSectors, locale)}
    />
  );
}

function mergeSectorsWithDatabase(
  dbSectors: Array<{
    id: string;
    key: string;
    status: string;
    photoUrl: string | null;
    slimPhotoUrl: string | null;
    translations: Array<{
      locale: string;
      name: string;
      description: string | null;
    }>;
  }>,
  locale: SupportedLocale,
): OnboardingSector[] {
  const byNormalizedKey = new Map(
    dbSectors.map((sector) => [normalizeSectorKey(sector.key), sector]),
  );

  return sectorBlueprints.map((blueprint) => {
    const dbSector = findMatchingSector(byNormalizedKey, blueprint.key);
    const status = dbSector?.status ?? blueprint.status;
    const blueprintCopy = blueprint.copy[locale];
    const title = dbSector
      ? translatedName(dbSector.translations, blueprintCopy.title, locale)
      : blueprintCopy.title;

    return {
      key: blueprint.key,
      id: dbSector?.id ?? blueprint.key,
      title,
      shortTitle: dbSector ? title : blueprintCopy.shortTitle,
      eyebrow: blueprintCopy.eyebrow,
      description: dbSector
        ? translatedDescription(dbSector.translations, locale) ?? blueprintCopy.description
        : blueprintCopy.description,
      bullets: blueprintCopy.bullets,
      photoUrl: dbSector?.photoUrl ?? blueprint.photoUrl,
      slimPhotoUrl: dbSector?.slimPhotoUrl ?? dbSector?.photoUrl ?? blueprint.slimPhotoUrl,
      status,
      playable: status === "ACTIVE",
    };
  });
}

function findMatchingSector(
  sectorsByKey: Map<string, {
    id: string;
    key: string;
    status: string;
    photoUrl: string | null;
    slimPhotoUrl: string | null;
    translations: Array<{
      locale: string;
      name: string;
      description: string | null;
    }>;
  }>,
  blueprintKey: string,
) {
  const aliases: Record<string, string[]> = {
    textile: ["textile", "tekstil"],
    toy: ["toy", "toys", "oyuncak"],
    furniture: ["furniture", "mobilya"],
    chocolate: ["chocolate", "cikolata", "çikolata"],
  };

  const keys = aliases[blueprintKey] ?? [blueprintKey];

  for (const key of keys) {
    const sector = sectorsByKey.get(normalizeSectorKey(key));

    if (sector) {
      return sector;
    }
  }

  return undefined;
}

function normalizeSectorKey(key: string) {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
