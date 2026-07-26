import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PackageCheck } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DailyEventRowView } from "./daily-event-row-view";
import { NotificationToastView } from "./notification-toast-view";
import { ProductColorChips } from "./product-color-chips";
import { ProductRouteTimeline } from "./product-route-timeline";
import { ProductShowcaseCard } from "./product-showcase-card";
import { ProductionQueueRow } from "./production-queue-row";
import { ShiftDepartmentResultView } from "./shift-department-result-view";
import { ShiftProgressView } from "./shift-progress-view";

const presentationDirectory = fileURLToPath(new URL(".", import.meta.url));

function render(element: Parameters<typeof renderToStaticMarkup>[0]) {
  return renderToStaticMarkup(element);
}

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("ortak oyun sunum componentleri uygulama ve veri katmanlarından bağımsızdır", () => {
  const forbiddenDependencies = [
    /@prisma|generated\/prisma/,
    /\/actions(?:\/|")/,
    /useGameUiStore/,
    /next\/navigation/,
    /features\/game\/services/,
    /factoryId/,
    /\bfetch\s*\(/,
    /Math\.random\s*\(/,
    /Intl\.NumberFormat\(["']tr-TR["']/,
  ];

  for (const filename of readdirSync(presentationDirectory).filter((name) =>
    name.endsWith(".tsx"),
  )) {
    const source = readFileSync(
      new URL(filename, import.meta.url),
      "utf8",
    );

    for (const dependency of forbiddenDependencies) {
      assert.doesNotMatch(source, dependency, `${filename}: ${dependency}`);
    }
  }
});

test("ürün showcase kartı ve renk chipleri verilen hazır veriyi gösterir", () => {
  const showcase = render(
    createElement(ProductShowcaseCard, {
      cardColors: {
        gradientFrom: "#101820",
        gradientTo: "#263246",
        primaryColor: "#315A8A",
        secondaryColor: "#C7D4E8",
        svgIconAccentColor: "#FFFFFF",
      },
      imageUrl: null,
      metrics: [
        {
          icon: PackageCheck,
          key: "quantity",
          label: "Quantity",
          value: "1,200 pcs",
        },
      ],
      name: "Clavier T-shirt",
    }),
  );
  const colors = render(
    createElement(ProductColorChips, {
      colors: [
        {
          hexCode: "#263246",
          key: "navy",
          label: "Navy",
          quantityLabel: "700",
        },
        {
          hexCode: "#B3261E",
          key: "red",
          label: "Red",
          quantityLabel: "500",
        },
      ],
      title: "Color distribution",
    }),
  );

  assert.match(showcase, /data-product-showcase-card/);
  assert.match(showcase, /Clavier T-shirt/);
  assert.match(showcase, /Quantity/);
  assert.match(showcase, /1,200 pcs/);
  assert.ok(colors.indexOf("Navy") < colors.indexOf("Red"));
});

test("ürün rotası verilen sırayı, outsource ve aktif adım durumunu korur", () => {
  const route = render(
    createElement(ProductRouteTimeline, {
      outsourceLabel: "Outsource",
      steps: [
        {
          active: true,
          canOutsource: false,
          departmentKey: "cutting",
          label: "Cutting",
          sequence: 1,
          workloadLabel: "12 pts",
          workloadPointsPerUnit: 12,
        },
        {
          canOutsource: true,
          departmentKey: "sewing",
          label: "Sewing",
          sequence: 2,
          workloadLabel: "18 pts",
          workloadPointsPerUnit: 18,
        },
      ],
      title: "Production route",
    }),
  );

  assert.ok(route.indexOf("Cutting") < route.indexOf("Sewing"));
  assert.equal(route.match(/Outsource/g)?.length, 1);
  assert.match(route, /data-route-sequence="1"/);
  assert.match(route, /aria-current="step"/);
});

test("üretim kuyruğu satırı hazır metrik ve durum label'larını gösterir", () => {
  const queueRow = render(
    createElement(ProductionQueueRow, {
      item: {
        completedQuantityLabel: "240",
        dueLabel: "2 days",
        dueTone: "warning",
        footerStatusLabel: "In production",
        inputReadyQuantityLabel: "500",
        modeLabel: "Internal line",
        orderNo: "ORD-1042",
        orderSummaryLabel: "Order: 1,000 · PRD-42",
        plannedProductionLabel: "400 pcs",
        productCode: "CLV-TS",
        productImageUrl: null,
        productName: "Clavier T-shirt",
        productTierLabel: "Basic",
        queueStartLabel: "Ready",
        queueStartTone: "success",
        remainingQuantityLabel: "760",
        warningLabel: "Capacity risk",
      },
      labels: {
        completed: "Completed",
        inputReady: "Input ready",
        planned: "Planned",
        remaining: "Remaining",
      },
      priorityLabel: "1",
      showDragHandle: true,
    }),
  );

  assert.match(queueRow, /data-production-queue-row/);
  assert.match(queueRow, /ORD-1042/);
  assert.match(queueRow, /400 pcs/);
  assert.match(queueRow, /760/);
  assert.match(queueRow, /2 days/);
  assert.match(queueRow, /Capacity risk/);
});

test("shift, olay ve bildirim görünümleri yalnızca verilen durumu yansıtır", () => {
  const progress = render(
    createElement(ShiftProgressView, {
      ariaLabel: "Shift 42 percent complete",
      currentTimeLabel: "11:47",
      endLabel: "17:00",
      label: "Day 4 shift",
      progress: 0.42,
      progressLabel: "42%",
      startLabel: "08:00",
    }),
  );
  const department = render(
    createElement(ShiftDepartmentResultView, {
      activeLineLabel: "2 lines",
      departmentLabel: "Sewing",
      isFinal: true,
      metrics: [
        { key: "planned", label: "Planned", value: 400 },
        { key: "produced", label: "Produced", value: 360 },
      ],
      numberLocale: "en-US",
      processedProductsLabel: "Processed products",
      utilizationAriaLabel: "Department utilization 90 percent",
      utilizationPercent: 90,
      utilizationTone: "success",
    }),
  );
  const event = render(
    createElement(DailyEventRowView, {
      categoryKey: "MACHINE",
      categoryLabel: "Machine",
      description: "The line needs attention.",
      severity: "CRITICAL",
      timestampLabel: "12:10",
      title: "Machine issue",
    }),
  );
  const levelUpEvent = render(
    createElement(DailyEventRowView, {
      categoryKey: "SYSTEM",
      categoryLabel: "System",
      description: "+120 XP unlocked a new level.",
      iconKey: "sparkles",
      severity: "SUCCESS",
      timestampLabel: "16:32",
      title: "Reached level 7",
      tone: "violet",
      variant: "levelUp",
    }),
  );
  const notification = render(
    createElement(NotificationToastView, {
      body: "Order was accepted.",
      title: "Order accepted",
      tone: "success",
    }),
  );

  assert.match(progress, /data-progress="0.42"/);
  assert.match(progress, /translateX\(-58%\)/);
  assert.match(department, /data-utilization-percent="90"/);
  assert.match(department, /data-metric-value="400"/);
  assert.match(event, /data-event-tone="danger"/);
  assert.match(event, /data-event-variant="default"/);
  assert.match(event, /Machine issue/);
  assert.match(levelUpEvent, /data-event-variant="levelUp"/);
  assert.match(levelUpEvent, /Level Up/);
  assert.match(levelUpEvent, /Reached level 7/);
  assert.match(notification, /data-notification-tone="success"/);
});

test("oyun containerları ortak görünümleri kullanırken davranış sahipliğini korur", () => {
  const orders = read("../../features/orders/components/orders-panel.tsx");
  const queue = read(
    "../../features/production-queue/components/department-queue-panel.tsx",
  );
  const shiftHud = read(
    "../../features/game/components/shift-playback-hud.tsx",
  );
  const shiftCard = read(
    "../../features/game/components/shift-department-card.tsx",
  );
  const shiftProgress = read(
    "../../features/game/components/shift-progress-bar.tsx",
  );
  const dailyEvents = read(
    "../../features/game/components/daily-event-panel.tsx",
  );
  const notifications = read(
    "../../features/game/components/notification-center.tsx",
  );

  assert.match(orders, /ProductShowcaseCard/);
  assert.match(orders, /ProductColorChips/);
  assert.match(orders, /ProductRouteTimeline/);
  assert.match(orders, /acceptMarketOrderAction/);
  assert.match(queue, /ProductionQueueRow/);
  assert.match(queue, /SortableItemHandle/);
  assert.match(queue, /updateDepartmentWorkloadPriorityAction/);
  assert.match(shiftProgress, /ShiftProgressView/);
  assert.match(shiftCard, /ShiftDepartmentResultView/);
  assert.match(shiftHud, /useGameUiStore/);
  assert.match(shiftHud, /getShiftPlaybackMinute/);
  assert.match(dailyEvents, /DailyEventRowView/);
  assert.match(dailyEvents, /useGameUiStore/);
  assert.match(dailyEvents, /prefers-reduced-motion/);
  assert.match(notifications, /NotificationToastView/);
});
