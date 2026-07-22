import assert from "node:assert/strict";
import test from "node:test";

import { buildProductTierUnlockNotifications } from "./game-snapshot";

test("seviye işlemi eşikleri geçtiğinde ilgili ürün grubu mesajlarını üretir", () => {
  const notifications = buildProductTierUnlockNotifications([
    {
      metadata: {
        currentLevel: 20,
        leveledUp: true,
        previousLevel: 4,
      },
    },
  ]);

  assert.deepEqual(
    notifications.map((notification) => notification.id),
    ["product-tier-unlocked-standard", "product-tier-unlocked-premium"],
  );
  assert.match(notifications[1]?.body ?? "", /Premium siparişleri/);
});

test("eşik geçmeyen XP işleminde ürün grubu mesajı oluşmaz", () => {
  assert.deepEqual(
    buildProductTierUnlockNotifications([
      { metadata: { currentLevel: 19, previousLevel: 18 } },
    ]),
    [],
  );
});
