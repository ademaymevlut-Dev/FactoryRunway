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
  FirstOrderClient,
  type FirstOrderView,
} from "./first-order-client";

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
    }),
  );

  return (
    <main className="h-screen overflow-hidden bg-background text-foreground">
      <div className="relative mx-auto flex h-screen w-full max-w-[1440px] items-center justify-center px-5 py-5 lg:px-6 lg:py-6">
        <FirstOrderClient
          currentDay={factory.currentDay}
          factoryName={factory.name}
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
}: {
  option: Awaited<ReturnType<typeof loadFirstOrderOptions>>[number];
  index: number;
  currentDay: number;
  currencyCode: string;
}): FirstOrderView {
  const product = option.product;
  const metadata = readMetadata(option.metadata);
  const productMetadata = readMetadata(product.metadata);
  const categoryName = displayName(product.category.translations, product.category.key);
  const typeName = displayName(product.productType.translations, product.productType.key);
  const description = displayDescription(product.translations);
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
        .map((step) => displayName(step.department.translations, step.department.key))
        .join(" → ")
    : "Rota bekleniyor";

  return {
    id: option.id,
    orderIndex: String(index + 1).padStart(2, "0"),
    customerName:
      stringValue(metadata.customerName) ??
      stringValue(productMetadata.customerName) ??
      product.name,
    productName:
      stringValue(metadata.orderTitle) ??
      stringValue(productMetadata.orderTitle) ??
      typeName,
    productCode: product.code ?? product.key,
    collectionName:
      stringValue(metadata.collection) ??
      stringValue(productMetadata.collection) ??
      categoryName,
    themeName:
      stringValue(metadata.theme) ??
      stringValue(productMetadata.theme) ??
      typeName,
    difficultyLabel:
      stringValue(metadata.difficulty) ?? productTierLabel(product.tier),
    statusLabel: stringValue(metadata.statusLabel) ?? "Teklif açık",
    quantityLabel: `${formatNumber(option.defaultQuantity)} adet`,
    deliveryLabel: `${option.targetDeliveryDays} gün`,
    requestedDateLabel: `Day ${currentDay + option.targetDeliveryDays}`,
    totalPriceLabel: formatMoney(totalPriceCents, currencyCode),
    unitPriceLabel: formatMoney(unitPriceCents, currencyCode),
    routeLabel,
    imageUrl,
    cardCopy: cardCopy(metadata, description),
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

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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

function cardCopy(metadata: Metadata, description: string | null) {
  const lines = metadata.cardCopy;

  if (
    Array.isArray(lines) &&
    lines.every((line) => typeof line === "string") &&
    lines.length > 0
  ) {
    return lines.slice(0, 3) as string[];
  }

  const descriptionLines = description
    ?.split(/[.!?]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);

  return descriptionLines?.length
    ? descriptionLines.map((line) => `${line}.`)
    : [description ?? stringValue(metadata.orderTitle) ?? ""].filter(Boolean);
}

function displayName(translations: Translation[], fallback: string) {
  return (
    translations.find((translation) => translation.locale === "tr")?.name ??
    translations.find((translation) => translation.locale === "en")?.name ??
    fallback
  );
}

function displayDescription(translations: Translation[]) {
  return (
    translations.find((translation) => translation.locale === "tr")?.description ??
    translations.find((translation) => translation.locale === "en")?.description ??
    null
  );
}

function productTierLabel(tier: string) {
  const labels: Record<string, string> = {
    BASIC: "Kolay",
    STANDARD: "Orta",
    PREMIUM: "Zor",
    LUXURY: "Uzman",
  };

  return labels[tier] ?? tier;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatMoney(cents: number, currencyCode: string) {
  const amount = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);

  return `${amount} ${currencyCode}`;
}
