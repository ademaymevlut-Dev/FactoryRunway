import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { USER_ROLES } from "@/lib/auth/roles";
import { getPrisma } from "@/lib/db";

import { OnboardingExperience, type OnboardingSector } from "./onboarding-experience";

export const dynamic = "force-dynamic";

const sectorBlueprints = [
  {
    key: "textile",
    title: "Textile",
    shortTitle: "Textile",
    eyebrow: "Aktif beta sektörü",
    description: "Kesimden dikime, ütüden sevkiyata kadar tüm üretim sürecini yönet.",
    bullets: [
      "Kesim, dikim ve ütü-paketleme ile başlar.",
      "Nakış, baskı, yıkama ve boyama ilk aşamada outsource edilir.",
      "Small Workshop sahnesiyle oyuna girer.",
    ],
    photoUrl: "/sector-images/textile_sector_1600x700.png",
    slimPhotoUrl: "/sector-images/textile_sector_1600x700.png",
    status: "ACTIVE",
    playable: true,
  },
  {
    key: "toy",
    title: "Toy Factory",
    shortTitle: "Toy Factory",
    eyebrow: "Yakında",
    description: "Renkli üretim hatları, eğlenceli ürünler ve farklı üretim dinamikleri.",
    bullets: [
      "Plastik, kumaş ve paketleme akışları farklılaşır.",
      "Sezonluk talep dalgaları daha belirgin olur.",
      "Beta sonrası sektör paketi olarak açılır.",
    ],
    photoUrl: "/sector-images/textile_sector_1600x700.png",
    slimPhotoUrl: "/sector-images/textile_sector_1600x700.png",
    status: "COMING_SOON",
    playable: false,
  },
  {
    key: "furniture",
    title: "Furniture",
    shortTitle: "Furniture",
    eyebrow: "Yakında",
    description: "Atölye planlama, hassas üretim ve teslimat dengesini yönet.",
    bullets: [
      "Daha uzun üretim döngüleriyle kapasite planlaması öne çıkar.",
      "Malzeme ve teslimat riski daha ağır hissedilir.",
      "Beta sonrası sektör paketi olarak açılır.",
    ],
    photoUrl: "/sector-images/textile_sector_1600x700.png",
    slimPhotoUrl: "/sector-images/textile_sector_1600x700.png",
    status: "COMING_SOON",
    playable: false,
  },
  {
    key: "chocolate",
    title: "Chocolate",
    shortTitle: "Chocolate",
    eyebrow: "Yakında",
    description: "Hız, kalite ve lezzet odaklı üretim süreçlerini deneyimle.",
    bullets: [
      "Tazelik, parti takibi ve kalite kararları öne çıkar.",
      "Fire ve hız dengesi daha görünür hale gelir.",
      "Beta sonrası sektör paketi olarak açılır.",
    ],
    photoUrl: "/sector-images/textile_sector_1600x700.png",
    slimPhotoUrl: "/sector-images/textile_sector_1600x700.png",
    status: "COMING_SOON",
    playable: false,
  },
] satisfies OnboardingSector[];

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

  return <OnboardingExperience sectors={mergeSectorsWithDatabase(dbSectors)} />;
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
): OnboardingSector[] {
  const byNormalizedKey = new Map(
    dbSectors.map((sector) => [normalizeSectorKey(sector.key), sector]),
  );

  return sectorBlueprints.map((blueprint) => {
    const dbSector = findMatchingSector(byNormalizedKey, blueprint.key);
    const tr = dbSector?.translations.find((translation) => translation.locale === "tr");
    const firstTranslation = dbSector?.translations[0];
    const status = dbSector?.status ?? blueprint.status;

    return {
      ...blueprint,
      id: dbSector?.id ?? blueprint.key,
      title: tr?.name ?? firstTranslation?.name ?? blueprint.title,
      shortTitle: tr?.name ?? firstTranslation?.name ?? blueprint.shortTitle,
      description: tr?.description ?? firstTranslation?.description ?? blueprint.description,
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
