import { redirect } from "next/navigation";

import {
  ContentStatus,
  CustomerOrderStatus,
  ProductImageVariant,
  ProductImageView,
  TutorialKey,
  TutorialStatus,
} from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { USER_ROLES } from "@/lib/auth/roles";
import { getPrisma } from "@/lib/db";
import {
  localizedMetadataString,
  localizedMetadataStringArray,
  normalizeLocale,
  numberLocale,
  translatedDescription,
  translatedName,
  type SupportedLocale,
} from "@/lib/i18n/locales";

import {
  FirstOrderClient,
  type FirstOrderView,
} from "./first-order-client";
import { firstOrderCopy } from "./first-order-copy";

export const dynamic = "force-dynamic";

type Translation = {
  locale: string;
  name?: string | null;
  description?: string | null;
};

type Metadata = Record<string, unknown>;

export default async function FirstOrderPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/");
  if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN) {
    redirect("/admin");
  }

  const prisma = getPrisma();
  const playerProfile = await prisma.playerProfile.findUnique({
    where: { userId: user.id },
    include: {
      factories: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          tutorialProgress: {
            where: { tutorialKey: TutorialKey.FIRST_ORDER },
            take: 1,
          },
          customerOrders: {
            where: {
              status: {
                in: [
                  CustomerOrderStatus.ACTIVE,
                  CustomerOrderStatus.IN_PRODUCTION,
                  CustomerOrderStatus.READY_TO_SHIP,
                ],
              },
            },
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  });

  const factory = playerProfile?.factories[0];
  const locale = normalizeLocale(playerProfile?.preferredLocale);

  if (!playerProfile || !factory) redirect("/onboarding");

  const firstTutorial = factory.tutorialProgress[0];
  if (firstTutorial?.status === TutorialStatus.COMPLETED) {
    redirect("/player");
  }

  if (firstTutorial?.customerOrderId || factory.customerOrders.length > 0) {
    redirect("/player/first-order/simulation");
  }

  const options = await loadFirstOrderOptions(prisma, factory.sectorId);

  const orders = options.map((option, index) =>
    buildFirstOrderView({
      option,
      index,
      currentDay: factory.currentDay,
      currencyCode: factory.currencyCode,
      locale,
    }),
  );

  return (
    <main className="h-screen overflow-hidden bg-background text-foreground">
      <div className="relative mx-auto flex h-screen w-full max-w-[1440px] items-center justify-center px-5 py-5 lg:px-6 lg:py-6">
        <FirstOrderClient
          currentDay={factory.currentDay}
          factoryName={factory.name}
          locale={locale}
          orders={orders}
        />
      </div>
    </main>
  );
}

function buildFirstOrderView({
  option,
  index,
  currentDay,
  currencyCode,
  locale,
}: {
  option: Awaited<ReturnType<typeof loadFirstOrderOptions>>[number];
  index: number;
  currentDay: number;
  currencyCode: string;
  locale: SupportedLocale;
}): FirstOrderView {
  const product = option.product;
  const metadata = readMetadata(option.metadata);
  const productMetadata = readMetadata(product.metadata);
  const copy = firstOrderCopy[locale];
  const categoryName = displayName(product.category.translations, product.category.key, locale);
  const typeName = displayName(product.productType.translations, product.productType.key, locale);
  const description = displayDescription(product.translations, locale);
  const totalPriceCents =
    moneyCents(metadata.offerPriceCents, metadata.offerPrice) ??
    (moneyCents(metadata.unitPriceCents, metadata.unitPrice) ??
      product.baseUnitPriceCents) *
      option.defaultQuantity;
  const unitPriceCents = Math.max(
    0,
    Math.round(totalPriceCents / option.defaultQuantity),
  );
  const imageUrl = pickProductImage(product.images);
  const routeLabel = product.routeSteps.length
    ? product.routeSteps
        .map((step) => displayName(step.department.translations, step.department.key, locale))
        .join(" → ")
    : copy.selection.routePending;

  return {
    id: option.id,
    orderIndex: String(index + 1).padStart(2, "0"),
    customerName:
      localizedMetadataString(metadata, "customerName", locale) ??
      localizedMetadataString(productMetadata, "customerName", locale) ??
      product.name,
    productName:
      localizedMetadataString(metadata, "orderTitle", locale) ??
      localizedMetadataString(productMetadata, "orderTitle", locale) ??
      typeName,
    productCode: product.code ?? product.key,
    collectionName:
      localizedMetadataString(metadata, "collection", locale) ??
      localizedMetadataString(productMetadata, "collection", locale) ??
      categoryName,
    themeName:
      localizedMetadataString(metadata, "theme", locale) ??
      localizedMetadataString(productMetadata, "theme", locale) ??
      typeName,
    difficultyLabel:
      localizedMetadataString(metadata, "difficulty", locale) ??
      productTierLabel(product.tier, locale),
    statusLabel: localizedMetadataString(metadata, "statusLabel", locale) ?? copy.selection.statusOpen,
    quantityLabel: copy.selection.quantity(formatNumber(option.defaultQuantity, locale)),
    deliveryLabel: copy.selection.deliveryDays(option.targetDeliveryDays),
    requestedDateLabel: copy.selection.requestedDay(currentDay + option.targetDeliveryDays),
    totalPriceLabel: formatMoney(totalPriceCents, currencyCode, locale),
    unitPriceLabel: formatMoney(unitPriceCents, currencyCode, locale),
    routeLabel,
    imageUrl,
    cardCopy: cardCopy(metadata, description, locale),
    colors: {
      primary: product.cardPrimaryColor,
      secondary: product.cardSecondaryColor,
      gradientFrom: product.cardGradientFrom,
      gradientTo: product.cardGradientTo,
      text: product.cardTextColor,
      icon: product.cardSvgIconColor,
      iconAccent: product.cardSvgIconAccentColor,
    },
  };
}

function loadFirstOrderOptions(
  prisma: ReturnType<typeof getPrisma>,
  sectorId: string,
) {
  return prisma.firstOrderProductOption.findMany({
    where: {
      sectorId,
      tutorialKey: TutorialKey.FIRST_ORDER,
      status: ContentStatus.ACTIVE,
    },
    orderBy: [{ sortOrder: "asc" }, { product: { name: "asc" } }],
    take: 3,
    include: {
      product: {
        include: {
          category: { include: { translations: true } },
          productType: { include: { translations: true } },
          translations: true,
          images: {
            where: { view: ProductImageView.FRONT },
            orderBy: [{ sortOrder: "asc" }],
          },
          routeSteps: {
            orderBy: { sequence: "asc" },
            include: {
              department: { include: { translations: true } },
            },
          },
        },
      },
    },
  });
}

function pickProductImage(
  images: Array<{
    url: string;
    variant: ProductImageVariant;
  }>,
) {
  return (
    images.find((image) => image.variant === ProductImageVariant.CARD)?.url ??
    images.find((image) => image.variant === ProductImageVariant.DETAIL)?.url ??
    images.find((image) => image.variant === ProductImageVariant.THUMBNAIL)?.url ??
    images[0]?.url ??
    null
  );
}

function readMetadata(value: unknown): Metadata {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Metadata)
    : {};
}

function moneyCents(centsValue: unknown, currencyValue: unknown) {
  return positiveInteger(centsValue) ?? currencyToCents(currencyValue);
}

function positiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}

function currencyToCents(value: unknown) {
  const parsed =
    typeof value === "string"
      ? Number(value.replace(",", "."))
      : value;

  if (typeof parsed !== "number" || !Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return Math.round(parsed * 100);
}

function cardCopy(
  metadata: Metadata,
  description: string | null,
  locale: SupportedLocale,
) {
  const lines = localizedMetadataStringArray(metadata, "cardCopy", locale);

  if (lines?.length) return lines.slice(0, 3);

  const descriptionLines = description
    ?.split(/[.!?]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);

  return descriptionLines?.length
    ? descriptionLines.map((line) => `${line}.`)
    : [description ?? localizedMetadataString(metadata, "orderTitle", locale) ?? ""].filter(Boolean);
}

function displayName(
  translations: Translation[],
  fallback: string,
  locale: SupportedLocale,
) {
  return translatedName(translations, fallback, locale);
}

function displayDescription(
  translations: Translation[],
  locale: SupportedLocale,
) {
  return translatedDescription(translations, locale);
}

function productTierLabel(tier: string, locale: SupportedLocale) {
  const labels = firstOrderCopy[locale].productTier as Record<string, string>;

  return labels[tier] ?? tier;
}

function formatNumber(value: number, locale: SupportedLocale) {
  return new Intl.NumberFormat(numberLocale(locale)).format(value);
}

function formatMoney(
  cents: number,
  currencyCode: string,
  locale: SupportedLocale,
) {
  const amount = new Intl.NumberFormat(numberLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);

  return `${amount} ${currencyCode}`;
}
