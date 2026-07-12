import {
  CustomerOrderStatus,
  ProductImageVariant,
  ProductionOrderStatus,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";

import type {
  GameWarehouseView,
  WarehouseInboundItem,
  WarehouseProductDepotItem,
  WarehouseTabKey,
} from "../types";

const locale = "tr";
const materialReadyOffsetDays = 1;
const productDepotDepartmentKey = "product_warehouse";
const finalPackingDepartmentKey = "ironing_packing";
const warehouseKeys = [
  "fabric_warehouse",
  "accessory_warehouse",
  productDepotDepartmentKey,
] satisfies WarehouseTabKey[];

type TranslationRecord = {
  locale: string;
  name: string;
};

export async function getWarehouseView(input: {
  currentDay: number;
  factoryId: string;
  sectorId: string;
}): Promise<GameWarehouseView> {
  const prisma = getPrisma();
  const [departments, materialOrders, productOrders] = await Promise.all([
    prisma.department.findMany({
      where: {
        key: { in: [...warehouseKeys] },
        sectorId: input.sectorId,
      },
      select: {
        key: true,
        translations: {
          where: { locale },
          select: { locale: true, name: true },
        },
      },
    }),
    prisma.customerOrder.findMany({
      where: {
        factoryId: input.factoryId,
        status: {
          in: [
            CustomerOrderStatus.ACTIVE,
            CustomerOrderStatus.IN_PRODUCTION,
          ],
        },
      },
      orderBy: [
        { acceptedDay: "asc" },
        { targetDeliveryDay: "asc" },
        { createdAt: "asc" },
      ],
      select: {
        acceptedDay: true,
        id: true,
        items: {
          orderBy: { sortOrder: "asc" },
          select: {
            product: {
              select: {
                code: true,
                images: {
                  orderBy: { sortOrder: "asc" },
                  select: {
                    pathname: true,
                    url: true,
                    variant: true,
                  },
                  where: {
                    variant: {
                      in: [
                        ProductImageVariant.CARD,
                        ProductImageVariant.THUMBNAIL,
                      ],
                    },
                  },
                },
                name: true,
              },
            },
            productSnapshot: true,
          },
          take: 1,
        },
        metadata: true,
        orderNo: true,
        targetDeliveryDay: true,
        totalQuantity: true,
        virtualCustomer: {
          select: { name: true },
        },
      },
      take: 80,
    }),
    prisma.productionOrder.findMany({
      where: {
        factoryId: input.factoryId,
        customerOrder: {
          status: {
            in: [
              CustomerOrderStatus.ACTIVE,
              CustomerOrderStatus.IN_PRODUCTION,
              CustomerOrderStatus.READY_TO_SHIP,
              CustomerOrderStatus.PARTIALLY_SHIPPED,
            ],
          },
        },
        OR: [
          {
            status: {
              in: [
                ProductionOrderStatus.READY_TO_SHIP,
                ProductionOrderStatus.COMPLETED,
              ],
            },
          },
          {
            routeProgress: {
              some: {
                completedQuantity: { gt: 0 },
                department: { key: finalPackingDepartmentKey },
              },
            },
          },
        ],
      },
      orderBy: [
        { targetDeliveryDay: "asc" },
        { acceptedDay: "asc" },
        { createdAt: "asc" },
      ],
      select: {
        completedDay: true,
        completedQuantity: true,
        customerOrder: {
          select: {
            id: true,
            orderNo: true,
            shippedQuantity: true,
            targetDeliveryDay: true,
            virtualCustomer: {
              select: { name: true },
            },
          },
        },
        customerOrderItem: {
          select: {
            product: {
              select: {
                code: true,
                images: {
                  orderBy: { sortOrder: "asc" },
                  select: {
                    pathname: true,
                    url: true,
                    variant: true,
                  },
                  where: {
                    variant: {
                      in: [
                        ProductImageVariant.CARD,
                        ProductImageVariant.THUMBNAIL,
                      ],
                    },
                  },
                },
                name: true,
              },
            },
            productSnapshot: true,
            quantity: true,
            shippedQuantity: true,
          },
        },
        id: true,
        plannedQuantity: true,
        productionNo: true,
        routeProgress: {
          where: {
            completedQuantity: { gt: 0 },
            department: { key: finalPackingDepartmentKey },
          },
          orderBy: { sequence: "desc" },
          select: {
            completedQuantity: true,
          },
          take: 1,
        },
        shiftLineResults: {
          where: {
            department: { key: finalPackingDepartmentKey },
            producedQuantity: { gt: 0 },
          },
          orderBy: { createdAt: "desc" },
          select: {
            producedQuantity: true,
            shiftSimulation: {
              select: { gameDay: true },
            },
          },
          take: 1,
        },
        status: true,
        targetDeliveryDay: true,
      },
      take: 80,
    }),
  ]);

  const departmentLabels = buildDepartmentLabels(departments);
  const fabricItems = buildInboundItems({
    currentDay: input.currentDay,
    materialKey: "fabric_warehouse",
    orders: materialOrders,
  });
  const accessoryItems = buildInboundItems({
    currentDay: input.currentDay,
    materialKey: "accessory_warehouse",
    orders: materialOrders,
  });
  const productItems = productOrders
    .map((order) => toProductDepotItem(order, input.currentDay))
    .filter((item): item is WarehouseProductDepotItem => item !== null)
    .sort(sortProductDepotItems);
  const productReadyQuantity = productItems.reduce(
    (total, item) => total + item.quantityInDepot,
    0,
  );

  return {
    accessory: {
      items: accessoryItems,
      key: "accessory_warehouse",
      label: departmentLabels.get("accessory_warehouse") ?? "Aksesuar Depo",
    },
    currentDay: input.currentDay,
    fabric: {
      items: fabricItems,
      key: "fabric_warehouse",
      label: departmentLabels.get("fabric_warehouse") ?? "Kumaş Depo",
    },
    product: {
      items: productItems,
      key: "product_warehouse",
      label: departmentLabels.get("product_warehouse") ?? "Ürün Depo",
    },
    summary: {
      inboundTotal: fabricItems.length + accessoryItems.length,
      nextDeliveryLabel: getFirstLabel(productItems, "deliveryLabel"),
      nextInboundLabel: getFirstLabel(
        [...fabricItems, ...accessoryItems].sort(sortInboundItems),
        "arrivalLabel",
      ),
      productReadyQuantityLabel: `${formatNumber(productReadyQuantity)} adet`,
      productReadyTotal: productItems.length,
    },
  };
}

function buildDepartmentLabels(
  departments: Array<{ key: string; translations: TranslationRecord[] }>,
) {
  return new Map(
    departments.map((department) => [
      department.key,
      pickTranslation(department.translations, department.key),
    ]),
  );
}

function buildInboundItems({
  currentDay,
  materialKey,
  orders,
}: {
  currentDay: number;
  materialKey: "fabric_warehouse" | "accessory_warehouse";
  orders: Array<{
    acceptedDay: number;
    id: string;
    items: Array<{
      product: {
        code: string | null;
        images: Array<{
          pathname: string | null;
          url: string;
          variant: ProductImageVariant;
        }>;
        name: string;
      };
      productSnapshot: unknown;
    }>;
    metadata: unknown;
    orderNo: string;
    targetDeliveryDay: number;
    totalQuantity: number;
    virtualCustomer: { name: string } | null;
  }>;
}): WarehouseInboundItem[] {
  return orders
    .map((order) => {
      const materialReadyDay = getMaterialReadyDay(order, materialKey);
      const daysRemaining = materialReadyDay - currentDay;

      if (daysRemaining <= 0) {
        return null;
      }

      const item = order.items[0];

      return {
        arrivalLabel: formatArrivalLabel(daysRemaining),
        customerName: order.virtualCustomer?.name ?? "Müşteri",
        daysRemaining,
        deliveryLabel: formatDeliveryLabel(order.targetDeliveryDay - currentDay),
        id: `${materialKey}:${order.id}`,
        kind: "inbound",
        orderId: order.id,
        orderNo: order.orderNo,
        productCode: getProductCode(item),
        productImageUrl: getProductImageUrl(item),
        productName: getProductName(item),
        quantity: order.totalQuantity,
        quantityLabel: `${formatNumber(order.totalQuantity)} adet`,
        statusLabel: "Yolda",
        tone: daysRemaining <= 1 ? "warning" : "info",
      } satisfies WarehouseInboundItem;
    })
    .filter((item): item is WarehouseInboundItem => item !== null)
    .sort(sortInboundItems);
}

function toProductDepotItem(
  order: {
    completedDay: number | null;
    completedQuantity: number;
    customerOrder: {
      id: string;
      orderNo: string;
      shippedQuantity: number;
      targetDeliveryDay: number;
      virtualCustomer: { name: string } | null;
    };
    customerOrderItem: {
      product: {
        code: string | null;
        images: Array<{
          pathname: string | null;
          url: string;
          variant: ProductImageVariant;
        }>;
        name: string;
      };
      productSnapshot: unknown;
      quantity: number;
      shippedQuantity: number;
    };
    id: string;
    plannedQuantity: number;
    productionNo: string;
    routeProgress: Array<{
      completedQuantity: number;
    }>;
    shiftLineResults: Array<{
      producedQuantity: number;
      shiftSimulation: {
        gameDay: number;
      };
    }>;
    targetDeliveryDay: number;
  },
  currentDay: number,
): WarehouseProductDepotItem | null {
  const packedQuantity = Math.max(
    order.completedQuantity,
    order.routeProgress[0]?.completedQuantity ?? 0,
  );
  const shippedQuantity = Math.max(
    order.customerOrder.shippedQuantity,
    order.customerOrderItem.shippedQuantity,
  );
  const quantityInDepot = Math.max(0, packedQuantity - shippedQuantity);

  if (quantityInDepot <= 0) {
    return null;
  }

  const lastResult = order.shiftLineResults[0];
  const finishedDay = lastResult?.shiftSimulation.gameDay ?? order.completedDay;
  const daysUntilDelivery = order.customerOrder.targetDeliveryDay - currentDay;

  return {
    customerName: order.customerOrder.virtualCustomer?.name ?? "Müşteri",
    daysUntilDelivery,
    deliveryLabel: formatDeliveryLabel(daysUntilDelivery),
    finishedLabel: formatFinishedLabel(finishedDay, currentDay),
    id: `product_warehouse:${order.id}`,
    kind: "product",
    lastProducedQuantityLabel: lastResult
      ? `${formatNumber(lastResult.producedQuantity)} adet`
      : "-",
    orderId: order.customerOrder.id,
    orderNo: order.customerOrder.orderNo,
    plannedQuantityLabel: `${formatNumber(order.plannedQuantity)} adet`,
    productCode: getProductCode(order.customerOrderItem),
    productImageUrl: getProductImageUrl(order.customerOrderItem),
    productName: getProductName(order.customerOrderItem),
    productionNo: order.productionNo,
    productionOrderId: order.id,
    quantityInDepot,
    quantityInDepotLabel: `${formatNumber(quantityInDepot)} adet`,
    statusLabel: "Teslime hazır",
    tone:
      daysUntilDelivery < 0
        ? "danger"
        : daysUntilDelivery <= 1
          ? "warning"
          : "success",
  };
}

function getMaterialReadyDay(
  order: { acceptedDay: number; metadata: unknown },
  materialKey: "fabric_warehouse" | "accessory_warehouse",
) {
  const metadata = readRecord(order.metadata);
  const materialSpecificKey =
    materialKey === "fabric_warehouse" ? "fabricReadyDay" : "accessoryReadyDay";

  return (
    readNumber(metadata[materialSpecificKey]) ??
    readNumber(metadata.materialReadyDay) ??
    order.acceptedDay + materialReadyOffsetDays
  );
}

function getProductName(
  item:
    | {
        product: { name: string };
        productSnapshot: unknown;
      }
    | undefined,
) {
  if (!item) return "Ürün";

  return readString(readRecord(item.productSnapshot).name) ?? item.product.name;
}

function getProductCode(
  item:
    | {
        product: { code: string | null };
        productSnapshot: unknown;
      }
    | undefined,
) {
  if (!item) return "-";

  return readString(readRecord(item.productSnapshot).code) ?? item.product.code ?? "-";
}

function getProductImageUrl(
  item:
    | {
        product: {
          images: Array<{
            pathname: string | null;
            url: string;
            variant: ProductImageVariant;
          }>;
        };
      }
    | undefined,
) {
  if (!item) return null;

  const cardImage = item.product.images.find(
    (image) => image.variant === ProductImageVariant.CARD,
  );
  const thumbnailImage = item.product.images.find(
    (image) => image.variant === ProductImageVariant.THUMBNAIL,
  );
  const image = cardImage ?? thumbnailImage ?? item.product.images[0];

  return image?.url ?? image?.pathname ?? null;
}

function getFirstLabel<T extends "arrivalLabel" | "deliveryLabel">(
  items: Array<Record<T, string>>,
  key: T,
) {
  return items[0]?.[key] ?? "-";
}

function sortInboundItems(first: WarehouseInboundItem, second: WarehouseInboundItem) {
  return (
    first.daysRemaining - second.daysRemaining ||
    first.orderNo.localeCompare(second.orderNo)
  );
}

function sortProductDepotItems(
  first: WarehouseProductDepotItem,
  second: WarehouseProductDepotItem,
) {
  return (
    first.daysUntilDelivery - second.daysUntilDelivery ||
    first.orderNo.localeCompare(second.orderNo)
  );
}

function formatArrivalLabel(daysRemaining: number) {
  if (daysRemaining <= 0) return "depoda";
  if (daysRemaining === 1) return "yarın geliyor";

  return `${daysRemaining} gün sonra geliyor`;
}

function formatDeliveryLabel(daysRemaining: number) {
  if (daysRemaining < 0) return `${Math.abs(daysRemaining)} gün gecikti`;
  if (daysRemaining === 0) return "bugün teslim";
  if (daysRemaining === 1) return "yarın teslim";

  return `${daysRemaining} gün sonra teslim`;
}

function formatFinishedLabel(finishedDay: number | null | undefined, currentDay: number) {
  if (finishedDay == null) return "son paket kaydı yok";

  const daysAgo = currentDay - finishedDay;

  if (daysAgo <= 0) return "bugün tamamlandı";
  if (daysAgo === 1) return "dün tamamlandı";

  return `${daysAgo} gün önce tamamlandı`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function pickTranslation(translations: TranslationRecord[], fallbackKey: string) {
  return (
    translations.find((translation) => translation.locale === locale)?.name ??
    translations[0]?.name ??
    toTitle(fallbackKey)
  );
}

function toTitle(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}
