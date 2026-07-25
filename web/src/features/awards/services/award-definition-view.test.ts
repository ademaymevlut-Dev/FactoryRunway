import assert from "node:assert/strict";
import test from "node:test";

import { AwardCategory, AwardScope } from "@/generated/prisma/enums";

import { buildAwardDefinitionViews } from "./award-definition-view";

test("award definition view locale'e göre translation seçer", () => {
  const views = buildAwardDefinitionViews({
    definitions: [
      {
        category: AwardCategory.DELIVERY,
        id: "award-1",
        key: "first_delivery",
        rewardCashCents: BigInt(5000),
        rewardMetadata: { runwayTokens: 1 },
        rewardXp: 25,
        scope: AwardScope.FACTORY,
        scopeKey: "GLOBAL",
        sortOrder: 20,
        targetValue: 1,
        translations: [
          {
            description: "İlk teslimatı tamamla.",
            locale: "tr",
            name: "İlk Teslimat",
          },
          {
            description: "Complete the first delivery.",
            locale: "en",
            name: "First Delivery",
          },
        ],
      },
    ],
    locale: "en",
  });

  assert.equal(views[0]?.name, "First Delivery");
  assert.equal(views[0]?.description, "Complete the first delivery.");
  assert.equal(views[0]?.rewardCashCents, "5000");
});

test("award definition view eksik locale için EN ve key fallback korur", () => {
  const views = buildAwardDefinitionViews({
    definitions: [
      {
        category: AwardCategory.PRODUCTION,
        id: "award-2",
        key: "fallback_award",
        rewardCashCents: null,
        rewardMetadata: null,
        rewardXp: 0,
        scope: AwardScope.FACTORY,
        scopeKey: "GLOBAL",
        sortOrder: 10,
        targetValue: 0,
        translations: [
          {
            description: null,
            locale: "en",
            name: "Fallback Award",
          },
        ],
      },
      {
        category: AwardCategory.FIRST_TIME,
        id: "award-3",
        key: "no_translation",
        rewardCashCents: null,
        rewardMetadata: null,
        rewardXp: 0,
        scope: AwardScope.FACTORY,
        scopeKey: "GLOBAL",
        sortOrder: 5,
        targetValue: 2,
        translations: [],
      },
    ],
    locale: "tr",
  });

  assert.equal(views[0]?.key, "no_translation");
  assert.equal(views[0]?.name, "no_translation");
  assert.equal(views[1]?.name, "Fallback Award");
  assert.equal(views[1]?.targetValue, 1);
});
