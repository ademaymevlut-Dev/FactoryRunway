import pg from "pg";

import {
  CANONICAL_MARKET_PRICING_CONFIG,
  calculateQuantityPriceMultiplierBps as calculateImplementedQuantityMultiplier,
} from "../src/lib/order-market/market-offer-config.ts";
import {
  calculateOfferUnitPriceCents as calculateImplementedUnitPrice,
} from "../src/features/orders/services/market-offer-generator.ts";

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const client = new Client({ connectionString });

const quantityBands = [
  { key: "<5K", min: 0, max: 5_000 },
  { key: "5-10K", min: 5_000, max: 10_000 },
  { key: "10-25K", min: 10_000, max: 25_000 },
  { key: "25-50K", min: 25_000, max: 50_000 },
  { key: "50-100K", min: 50_000, max: 100_000 },
  { key: "100K+", min: 100_000, max: Number.POSITIVE_INFINITY },
];

const scaleBands = [
  { key: "1-5", min: 1, max: 6 },
  { key: "6-9", min: 6, max: 10 },
  { key: "10-15", min: 10, max: 16 },
  { key: "16-22", min: 16, max: 23 },
  { key: "23-30", min: 23, max: 31 },
  { key: "31-60", min: 31, max: 61 },
  { key: "61-100", min: 61, max: 101 },
  { key: "101+", min: 101, max: Number.POSITIVE_INFINITY },
];

const q2Anchors = [
  { quantity: 0, multiplierBps: 10_000 },
  { quantity: 10_000, multiplierBps: 10_000 },
  { quantity: 25_000, multiplierBps: 9_700 },
  { quantity: 50_000, multiplierBps: 9_000 },
  { quantity: 100_000, multiplierBps: 8_100 },
  { quantity: 200_000, multiplierBps: 7_300 },
];

const models = {
  CURRENT: () => 10_000,
  IMPLEMENTED_V4: (quantity) => calculateImplementedQuantityMultiplier({
    config: CANONICAL_MARKET_PRICING_CONFIG,
    totalOfferQuantity: quantity,
  }),
  Q1_STEP: (quantity) => {
    if (quantity < 10_000) return 10_000;
    if (quantity < 25_000) return 9_700;
    if (quantity < 50_000) return 9_000;
    if (quantity < 100_000) return 8_100;
    return 7_300;
  },
  Q2_PIECEWISE: (quantity) => interpolateAnchors(quantity, q2Anchors),
  Q3_LOG: (quantity) => {
    if (quantity <= 10_000) return 10_000;
    const progress = Math.min(1, Math.log(quantity / 10_000) / Math.log(20));
    return Math.round(10_000 - 2_700 * progress);
  },
};

const existingVolumeBps = {
  small_batch: 11_500,
  regular: 10_000,
  large_retail: 9_300,
  mass_distribution: 8_500,
  capsule_collection: 12_000,
};

const softVolumeBps = {
  small_batch: 10_200,
  regular: 10_000,
  large_retail: 9_800,
  mass_distribution: 9_600,
  capsule_collection: 10_200,
};

const narrowSegmentBps = {
  budget_retailer: 9_800,
  mass_brand: 10_000,
  fashion_brand: 10_200,
  premium_brand: 10_600,
  luxury_boutique: 11_000,
  luxury_retail_group: 10_800,
  export_buyer: 10_100,
};

function interpolateAnchors(quantity, anchors) {
  if (quantity <= anchors[0].quantity) return anchors[0].multiplierBps;

  for (let index = 1; index < anchors.length; index += 1) {
    const left = anchors[index - 1];
    const right = anchors[index];

    if (quantity <= right.quantity) {
      const quantitySpan = right.quantity - left.quantity;
      const quantityOffset = quantity - left.quantity;
      const discountSpan = left.multiplierBps - right.multiplierBps;
      return left.multiplierBps - Math.round(
        (discountSpan * quantityOffset) / quantitySpan,
      );
    }
  }

  return anchors.at(-1).multiplierBps;
}

function roundRatio(numerator, denominator) {
  return Number((numerator + denominator / 2n) / denominator);
}

function priceItem(item, scenario) {
  const quantityBps = models[scenario.model](item.offerQuantity);
  const volumeBps = scenario.volume === "existing"
    ? (existingVolumeBps[item.volumeKey] ?? 10_000)
    : scenario.volume === "soft"
      ? (softVolumeBps[item.volumeKey] ?? 10_000)
      : 10_000;
  const segmentBps = scenario.segment === "narrow"
    ? (narrowSegmentBps[item.segmentKey] ?? 10_000)
    : 10_000;
  if (
    scenario.model === "IMPLEMENTED_V4" &&
    scenario.volume === "off" &&
    scenario.segment === "off"
  ) {
    return {
      quantityBps,
      segmentBps,
      unitPriceCents: calculateImplementedUnitPrice({
        baseUnitPriceCents: item.baseUnitPriceCents,
        quantityPriceMultiplierBps: quantityBps,
        typePriceMultiplierBps: item.typePriceMultiplierBps,
      }),
      volumeBps,
    };
  }

  const numerator = BigInt(item.baseUnitPriceCents) *
    BigInt(item.typePriceMultiplierBps) *
    BigInt(quantityBps) *
    BigInt(volumeBps) *
    BigInt(segmentBps);
  const unitPriceCents = Math.max(
    1,
    roundRatio(numerator, 10_000n ** 4n),
  );

  return { quantityBps, segmentBps, unitPriceCents, volumeBps };
}

function buildOffers(items, scenario) {
  const byOffer = new Map();

  for (const item of items) {
    const priced = priceItem(item, scenario);
    const revenueCents = BigInt(priced.unitPriceCents) * BigInt(item.quantity);
    const costCents = BigInt(item.estimatedUnitCostCents) * BigInt(item.quantity);
    let offer = byOffer.get(item.offerId);

    if (!offer) {
      offer = {
        offerId: item.offerId,
        factoryId: item.factoryId,
        offerType: item.offerType,
        offeredDay: item.offeredDay,
        quantity: item.offerQuantity,
        lineCount: item.lineCount,
        segmentKey: item.segmentKey,
        volumeKey: item.volumeKey,
        tiers: new Set(),
        products: new Set(),
        revenueCents: 0n,
        costCents: 0n,
        currentRevenueCents: 0n,
        currentCostCents: 0n,
        quantityBps: priced.quantityBps,
      };
      byOffer.set(item.offerId, offer);
    }

    offer.revenueCents += revenueCents;
    offer.costCents += costCents;
    offer.currentRevenueCents += BigInt(item.currentUnitPriceCents) * BigInt(item.quantity);
    offer.currentCostCents += costCents;
    offer.tiers.add(item.productTier);
    offer.products.add(item.productName);
  }

  return [...byOffer.values()].map((offer) => ({
    ...offer,
    profitCents: offer.revenueCents - offer.costCents,
    currentProfitCents: offer.currentRevenueCents - offer.currentCostCents,
  }));
}

function bandFor(value, bands) {
  return bands.find((band) => value >= band.min && value < band.max)?.key ?? "unknown";
}

function summarize(offers, bandSelector, observationDaysByFactoryBand = null) {
  const groups = new Map();

  for (const offer of offers) {
    const key = bandSelector(offer);
    const group = groups.get(key) ?? {
      n: 0,
      quantity: 0,
      revenueCents: 0n,
      costCents: 0n,
      profitCents: 0n,
      currentRevenueCents: 0n,
      currentCostCents: 0n,
      currentProfitCents: 0n,
    };
    group.n += 1;
    group.quantity += offer.quantity;
    group.revenueCents += offer.revenueCents;
    group.costCents += offer.costCents;
    group.profitCents += offer.profitCents;
    group.currentRevenueCents += offer.currentRevenueCents;
    group.currentCostCents += offer.currentCostCents;
    group.currentProfitCents += offer.currentProfitCents;
    groups.set(key, group);
  }

  return [...groups.entries()].map(([key, group]) => {
    const revenue = Number(group.revenueCents);
    const currentRevenue = Number(group.currentRevenueCents);
    const observationDays = observationDaysByFactoryBand?.get(key) ?? null;
    return {
      key,
      n: group.n,
      avgQuantity: Math.round(group.quantity / group.n),
      currentAvgUnitPrice: round2(currentRevenue / group.quantity / 100),
      simulatedAvgUnitPrice: round2(revenue / group.quantity / 100),
      estimatedUnitCost: round2(Number(group.costCents) / group.quantity / 100),
      currentMarginPct: round2(
        100 * Number(group.currentProfitCents) / currentRevenue,
      ),
      simulatedMarginPct: round2(
        100 * Number(group.profitCents) / revenue,
      ),
      currentProfitPerOfferEur: Math.round(
        Number(group.currentProfitCents) / group.n / 100,
      ),
      simulatedProfitPerOfferEur: Math.round(
        Number(group.profitCents) / group.n / 100,
      ),
      totalProfitChangePct: round2(
        100 * (Number(group.profitCents) - Number(group.currentProfitCents)) /
          Math.abs(Number(group.currentProfitCents)),
      ),
      ...(observationDays === null
        ? {}
        : {
            observationDays,
            currentOpportunityPerDayEur: Math.round(
              Number(group.currentProfitCents) / observationDays / 100,
            ),
            simulatedOpportunityPerDayEur: Math.round(
              Number(group.profitCents) / observationDays / 100,
            ),
          }),
    };
  });
}

function getObservationDaysByScale(offers) {
  const spans = new Map();

  for (const offer of offers) {
    const scale = bandFor(offer.lineCount, scaleBands);
    const key = `${scale}:${offer.factoryId}`;
    const span = spans.get(key) ?? { scale, min: offer.offeredDay, max: offer.offeredDay };
    span.min = Math.min(span.min, offer.offeredDay);
    span.max = Math.max(span.max, offer.offeredDay);
    spans.set(key, span);
  }

  const result = new Map();
  for (const span of spans.values()) {
    result.set(span.scale, (result.get(span.scale) ?? 0) + span.max - span.min + 1);
  }
  return result;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function aggregateScenario(items, scenario) {
  const offers = buildOffers(items, scenario);
  const currentRevenue = offers.reduce((sum, offer) => sum + offer.currentRevenueCents, 0n);
  const currentProfit = offers.reduce((sum, offer) => sum + offer.currentProfitCents, 0n);
  const revenue = offers.reduce((sum, offer) => sum + offer.revenueCents, 0n);
  const profit = offers.reduce((sum, offer) => sum + offer.profitCents, 0n);
  return {
    offers,
    metrics: {
      currentMarginPct: round2(100 * Number(currentProfit) / Number(currentRevenue)),
      simulatedMarginPct: round2(100 * Number(profit) / Number(revenue)),
      avgUnitPriceChangePct: round2(
        100 * (Number(revenue) - Number(currentRevenue)) / Number(currentRevenue),
      ),
      totalProfitChangePct: round2(
        100 * (Number(profit) - Number(currentProfit)) / Math.abs(Number(currentProfit)),
      ),
    },
  };
}

function buildDeterministicExamples(model) {
  const baseUnitPriceCents = 294;
  const estimatedUnitCostCents = 155;
  return [5_000, 10_000, 25_000, 50_000, 100_000, 200_000].map((quantity) => {
    const quantityBps = models[model](quantity);
    const unitPriceCents = roundRatio(
      BigInt(baseUnitPriceCents) * BigInt(quantityBps),
      10_000n,
    );
    const revenueCents = unitPriceCents * quantity;
    const profitCents = (unitPriceCents - estimatedUnitCostCents) * quantity;
    return {
      quantity,
      currentUnitPriceEur: baseUnitPriceCents / 100,
      multiplierBps: quantityBps,
      newUnitPriceEur: unitPriceCents / 100,
      marginPct: round2(100 * (unitPriceCents - estimatedUnitCostCents) / unitPriceCents),
      revenueEur: Math.round(revenueCents / 100),
      profitEur: Math.round(profitCents / 100),
    };
  });
}

await client.connect();

try {
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const snapshotAt = (await client.query("SELECT NOW() AS now")).rows[0].now;
  const versionCounts = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE metadata->>'generator' = 'product_tier_market_v5')::int AS v5_count,
      COUNT(*) FILTER (WHERE metadata->>'balanceVersion' = '3')::int AS v3_count,
      COUNT(*) FILTER (WHERE metadata->>'balanceVersion' = '4')::int AS v4_count,
      MAX(created_at) FILTER (WHERE metadata->>'generator' = 'product_tier_market_v5') AS latest_v5_created_at
    FROM market_order_offers
  `);
  const configRows = await client.query(`
    SELECT s.key AS sector_key, r.offer_type, r.metadata, r.updated_at
    FROM sector_market_offer_type_rules r
    JOIN sectors s ON s.id = r.sector_id
    ORDER BY s.key, r.offer_type
  `);
  const itemRows = await client.query(`
    SELECT
      o.id AS offer_id,
      o.factory_id,
      o.offer_type,
      o.offered_day,
      o.total_quantity AS offer_quantity,
      o.metadata AS offer_metadata,
      cs.key AS segment_key,
      cvc.key AS volume_key,
      oi.quantity,
      oi.unit_price_cents AS current_unit_price_cents,
      oi.estimated_unit_cost_cents,
      oi.pricing_snapshot,
      oi.product_tier,
      p.name AS product_name,
      p.base_unit_price_cents
    FROM market_order_offers o
    JOIN market_order_offer_items oi ON oi.market_order_offer_id = o.id
    JOIN products p ON p.id = oi.product_id
    JOIN customer_segments cs ON cs.id = o.customer_segment_id
    JOIN customer_volume_classes cvc ON cvc.id = o.customer_volume_class_id
    WHERE o.metadata->>'generator' = 'product_tier_market_v5'
      AND oi.estimated_unit_cost_cents IS NOT NULL
    ORDER BY o.id, oi.sort_order
  `);

  const items = itemRows.rows.map((row) => {
    const offerMetadata = row.offer_metadata ?? {};
    const pricingSnapshot = row.pricing_snapshot ?? {};
    return {
      offerId: row.offer_id,
      factoryId: row.factory_id,
      offerType: row.offer_type,
      offeredDay: Number(row.offered_day),
      offerQuantity: Number(row.offer_quantity),
      lineCount: Number(offerMetadata.activeProductionLineCount ?? 0),
      segmentKey: row.segment_key,
      volumeKey: row.volume_key,
      quantity: Number(row.quantity),
      currentUnitPriceCents: Number(row.current_unit_price_cents),
      estimatedUnitCostCents: Number(row.estimated_unit_cost_cents),
      productTier: row.product_tier,
      productName: row.product_name,
      baseUnitPriceCents: Number(
        pricingSnapshot.baseUnitPriceCents ?? row.base_unit_price_cents,
      ),
      typePriceMultiplierBps: Number(
        pricingSnapshot.typePriceMultiplierBps ??
          offerMetadata.typePriceMultiplierBps ??
          10_000,
      ),
    };
  }).filter((item) => item.lineCount > 0);

  const scenarios = [
    { key: "IMPLEMENTED_V4", model: "IMPLEMENTED_V4", volume: "off", segment: "off" },
    { key: "Q1", model: "Q1_STEP", volume: "off", segment: "off" },
    { key: "Q2", model: "Q2_PIECEWISE", volume: "off", segment: "off" },
    { key: "Q3", model: "Q3_LOG", volume: "off", segment: "off" },
    { key: "Q2+V_EXISTING", model: "Q2_PIECEWISE", volume: "existing", segment: "off" },
    { key: "Q2+V_SOFT", model: "Q2_PIECEWISE", volume: "soft", segment: "off" },
    { key: "Q2+S_NARROW", model: "Q2_PIECEWISE", volume: "off", segment: "narrow" },
    { key: "Q2+V_SOFT+S_NARROW", model: "Q2_PIECEWISE", volume: "soft", segment: "narrow" },
  ];
  const scenarioByKey = new Map(scenarios.map((scenario) => [scenario.key, scenario]));
  const scenarioResults = {};

  for (const scenario of scenarios) {
    const result = aggregateScenario(items, scenario);
    const observationDays = getObservationDaysByScale(result.offers);
    scenarioResults[scenario.key] = {
      metrics: result.metrics,
      quantityBands: summarize(
        result.offers,
        (offer) => bandFor(offer.quantity, quantityBands),
      ),
      scaleBands: summarize(
        result.offers,
        (offer) => bandFor(offer.lineCount, scaleBands),
        observationDays,
      ),
    };
  }

  const implementedScenario = scenarioByKey.get("IMPLEMENTED_V4");
  const q2Scenario = scenarioByKey.get("Q2");
  const q2ExistingVolumeScenario = scenarioByKey.get("Q2+V_EXISTING");
  const q2SoftVolumeScenario = scenarioByKey.get("Q2+V_SOFT");

  if (
    !implementedScenario ||
    !q2Scenario ||
    !q2ExistingVolumeScenario ||
    !q2SoftVolumeScenario
  ) {
    throw new Error("Required phase 2 analysis scenarios are missing");
  }

  const implementedMatchesQ2 = JSON.stringify(
    scenarioResults.IMPLEMENTED_V4,
  ) === JSON.stringify(scenarioResults.Q2);

  if (!implementedMatchesQ2) {
    throw new Error("Implemented v4 pricing does not match the selected Q2 model");
  }

  const controls = {};
  const controlScenario = aggregateScenario(items, implementedScenario).offers;
  for (const productName of ["BOMONTI", "CLAVIER", "CESENA", "BOLONESE", "TASTE"]) {
    const controlOffers = controlScenario.filter(
      (offer) => offer.products.size === 1 && offer.products.has(productName) && offer.offerType === "NORMAL",
    );
    controls[productName] = summarize(
      controlOffers,
      (offer) => bandFor(offer.lineCount, scaleBands),
    ).filter((entry) => ["6-9", "31-60", "61-100", "101+"].includes(entry.key));
  }

  const tierResults = {};
  for (const tier of ["BASIC", "STANDARD", "PREMIUM"]) {
    const tierItems = items.filter((item) => item.productTier === tier);
    tierResults[tier] = aggregateScenario(tierItems, implementedScenario).metrics;
  }

  const volumeResults = {};
  for (const volumeKey of ["large_retail", "mass_distribution"]) {
    const volumeItems = items.filter((item) => item.volumeKey === volumeKey);
    volumeResults[volumeKey] = {
      Q2: aggregateScenario(volumeItems, q2Scenario).metrics,
      Q2Existing: aggregateScenario(volumeItems, q2ExistingVolumeScenario).metrics,
      Q2Soft: aggregateScenario(volumeItems, q2SoftVolumeScenario).metrics,
    };
  }

  const baseline = aggregateScenario(items, {
    model: "CURRENT",
    volume: "off",
    segment: "off",
  });
  const baselineObservationDays = getObservationDaysByScale(baseline.offers);

  const payload = {
    snapshotAt,
    versionCounts: versionCounts.rows[0],
    configRows: configRows.rows,
    sample: {
      itemCount: items.length,
      offerCount: baseline.offers.length,
      factoryCount: new Set(items.map((item) => item.factoryId)).size,
    },
    baseline: {
      metrics: baseline.metrics,
      quantityBands: summarize(
        baseline.offers,
        (offer) => bandFor(offer.quantity, quantityBands),
      ),
      scaleBands: summarize(
        baseline.offers,
        (offer) => bandFor(offer.lineCount, scaleBands),
        baselineObservationDays,
      ),
    },
    q2Anchors,
    implementedMatchesQ2,
    scenarioResults,
    tierResults,
    volumeResults,
    controls,
    deterministicExamples: {
      Q1: buildDeterministicExamples("Q1_STEP"),
      Q2: buildDeterministicExamples("Q2_PIECEWISE"),
      Q3: buildDeterministicExamples("Q3_LOG"),
      implementedV4: buildDeterministicExamples("IMPLEMENTED_V4"),
    },
  };
  const summary = {
    snapshotAt: payload.snapshotAt,
    versionCounts: payload.versionCounts,
    sample: payload.sample,
    q2Anchors: payload.q2Anchors,
    baseline: payload.baseline,
    scenarioResults: Object.fromEntries(
      Object.entries(payload.scenarioResults).map(([key, result]) => [
        key,
        {
          metrics: result.metrics,
          quantityBands: result.quantityBands,
          scaleBands: result.scaleBands.filter((entry) =>
            ["1-5", "6-9", "31-60", "61-100", "101+"].includes(entry.key),
          ),
        },
      ]),
    ),
    tierResults: payload.tierResults,
    volumeResults: payload.volumeResults,
    deterministicExamples: payload.deterministicExamples,
  };
  const decision = {
    snapshotAt: payload.snapshotAt,
    versionCounts: payload.versionCounts,
    sample: payload.sample,
    baselineQuantityMargins: Object.fromEntries(
      payload.baseline.quantityBands.map((entry) => [entry.key, {
        n: entry.n,
        margin: entry.currentMarginPct,
        profitPerOffer: entry.currentProfitPerOfferEur,
      }]),
    ),
    models: Object.fromEntries(
      Object.entries(payload.scenarioResults).map(([key, result]) => [
        key,
        {
          metrics: result.metrics,
          quantityMargins: Object.fromEntries(
            result.quantityBands.map((entry) => [entry.key, {
              margin: entry.simulatedMarginPct,
              profitPerOffer: entry.simulatedProfitPerOfferEur,
              profitChangePct: entry.totalProfitChangePct,
            }]),
          ),
          scales: Object.fromEntries(
            result.scaleBands
              .filter((entry) => ["1-5", "6-9", "31-60", "61-100", "101+"].includes(entry.key))
              .map((entry) => [entry.key, {
                n: entry.n,
                currentMargin: entry.currentMarginPct,
                simulatedMargin: entry.simulatedMarginPct,
                marginEffect: round2(entry.simulatedMarginPct - entry.currentMarginPct),
                profitPerOffer: entry.simulatedProfitPerOfferEur,
                opportunityPerDay: entry.simulatedOpportunityPerDayEur,
              }]),
          ),
        },
      ]),
    ),
    tierResults: payload.tierResults,
    volumeResults: payload.volumeResults,
    deterministicExamples: payload.deterministicExamples,
  };
  const implemented = {
    snapshotAt: payload.snapshotAt,
    versionCounts: payload.versionCounts,
    configRows: payload.configRows,
    sample: payload.sample,
    implementedMatchesQ2: payload.implementedMatchesQ2,
    baseline: payload.baseline,
    implementedV4: payload.scenarioResults.IMPLEMENTED_V4,
    tierResults: payload.tierResults,
    volumeResults: payload.volumeResults,
    controls: payload.controls,
    deterministicExamples: payload.deterministicExamples.implementedV4,
  };

  console.log(JSON.stringify(
    process.env.PHASE2_OUTPUT === "implemented"
      ? implemented
      : process.env.PHASE2_OUTPUT === "decision"
      ? decision
      : process.env.PHASE2_OUTPUT === "summary"
        ? summary
        : payload,
    null,
    2,
  ));

  await client.query("ROLLBACK");
} finally {
  await client.end();
}
