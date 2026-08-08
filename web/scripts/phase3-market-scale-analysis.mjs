import pg from "pg";

import {
  CANONICAL_MARKET_SCALE_CONFIG,
  CANONICAL_MARKET_PRICING_CONFIG,
  calculateQuantityPriceMultiplierBps,
} from "../src/lib/order-market/market-offer-config.ts";
import {
  calculateOfferUnitPriceCents,
} from "../src/features/orders/services/market-offer-generator.ts";

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const client = new Client({ connectionString });
const volumeKeys = [
  "small_batch",
  "regular",
  "large_retail",
  "mass_distribution",
  "capsule_collection",
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
const representativeLineCounts = [
  12, 20, 30, 31, 40, 50, 60, 61, 75, 100, 101, 125, 150, 175,
];

const compactWeights = {
  capsule_collection: 8_000,
  large_retail: 5_000,
  mass_distribution: 1_000,
  regular: 11_000,
  small_batch: 12_000,
};
const growingWeights = {
  capsule_collection: 7_000,
  large_retail: 14_000,
  mass_distribution: 40_000,
  regular: 10_000,
  small_batch: 7_000,
};
const industrialWeights = {
  capsule_collection: 5_000,
  large_retail: 30_000,
  mass_distribution: 1_500_000,
  regular: 7_500,
  small_batch: 4_000,
};
const enterpriseWeights = {
  capsule_collection: 3_000,
  large_retail: 40_000,
  mass_distribution: 4_000_000,
  regular: 5_000,
  small_batch: 2_500,
};

const s1IndustrialWeights = {
  ...industrialWeights,
  mass_distribution: 600_000,
};
const s1EnterpriseWeights = {
  ...enterpriseWeights,
  mass_distribution: 1_500_000,
};

const s2Bands = [
  { max: 12, weights: compactWeights },
  { max: 30, weights: growingWeights },
  {
    max: 45,
    weights: {
      capsule_collection: 6_500,
      large_retail: 18_000,
      mass_distribution: 200_000,
      regular: 9_500,
      small_batch: 6_000,
    },
  },
  {
    max: 60,
    weights: {
      capsule_collection: 5_000,
      large_retail: 26_000,
      mass_distribution: 600_000,
      regular: 8_000,
      small_batch: 4_500,
    },
  },
  {
    max: 100,
    weights: {
      capsule_collection: 4_000,
      large_retail: 33_000,
      mass_distribution: 1_200_000,
      regular: 6_500,
      small_batch: 3_500,
    },
  },
  {
    max: Number.POSITIVE_INFINITY,
    weights: {
      capsule_collection: 3_500,
      large_retail: 38_000,
      mass_distribution: 1_800_000,
      regular: 5_500,
      small_batch: 3_000,
    },
  },
];

const s3Anchors = CANONICAL_MARKET_SCALE_CONFIG.anchors.map((anchor) => ({
  lineCount: anchor.activeProductionLineCount,
  weights: anchor.volumeClassWeightsBps,
}));

const models = {
  CURRENT: (lineCount) => currentWeights(lineCount),
  S1_SMOOTHED_STEP: (lineCount) => {
    if (lineCount <= 12) return compactWeights;
    if (lineCount <= 30) return growingWeights;
    if (lineCount <= 60) return s1IndustrialWeights;
    return s1EnterpriseWeights;
  },
  S2_MORE_BANDS: (lineCount) =>
    s2Bands.find((band) => lineCount <= band.max)?.weights ??
      s2Bands.at(-1).weights,
  S3_INTERPOLATED: (lineCount) => interpolateWeights(lineCount, s3Anchors),
};

function currentWeights(lineCount) {
  if (lineCount <= 12) return compactWeights;
  if (lineCount <= 30) return growingWeights;
  if (lineCount <= 60) return industrialWeights;
  return enterpriseWeights;
}

function interpolateWeights(lineCount, anchors) {
  if (lineCount <= anchors[0].lineCount) return anchors[0].weights;

  for (let index = 1; index < anchors.length; index += 1) {
    const left = anchors[index - 1];
    const right = anchors[index];

    if (lineCount <= right.lineCount) {
      const span = right.lineCount - left.lineCount;
      const offset = lineCount - left.lineCount;
      return Object.fromEntries(volumeKeys.map((key) => [
        key,
        left.weights[key] + Math.round(
          ((right.weights[key] - left.weights[key]) * offset) / span,
        ),
      ]));
    }
  }

  return anchors.at(-1).weights;
}

function bandFor(lineCount) {
  return scaleBands.find(
    (band) => lineCount >= band.min && lineCount < band.max,
  )?.key ?? "unknown";
}

function round2(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

function percentage(value) {
  return round2(value * 100);
}

function weightedQuantile(rows, valueSelector, weightSelector, quantile) {
  const sorted = rows
    .map((row) => ({ value: valueSelector(row), weight: weightSelector(row) }))
    .filter((row) => Number.isFinite(row.value) && row.weight > 0)
    .sort((left, right) => left.value - right.value);
  const totalWeight = sorted.reduce((sum, row) => sum + row.weight, 0);
  const threshold = totalWeight * quantile;
  let cumulative = 0;

  for (const row of sorted) {
    cumulative += row.weight;
    if (cumulative >= threshold) return row.value;
  }

  return sorted.at(-1)?.value ?? 0;
}

function getScenarioWeight(offer, modelKey) {
  if (modelKey === "CURRENT") return 1;

  const oldWeight = currentWeights(offer.lineCount)[offer.volumeKey] ?? 10_000;
  const newWeight = models[modelKey](offer.lineCount)[offer.volumeKey] ?? 10_000;
  return newWeight / oldWeight;
}

function summarizeOffers(offers, modelKey, observationDays, activeOrderBaseline) {
  const rows = offers.map((offer) => ({
    offer,
    weight: getScenarioWeight(offer, modelKey),
  }));
  const sumWeight = rows.reduce((sum, row) => sum + row.weight, 0);
  const weightedQuantity = rows.reduce(
    (sum, row) => sum + row.weight * row.offer.quantity,
    0,
  );
  const weightedRevenueCents = rows.reduce(
    (sum, row) => sum + row.weight * row.offer.revenueCents,
    0,
  );
  const weightedCostCents = rows.reduce(
    (sum, row) => sum + row.weight * row.offer.costCents,
    0,
  );
  const weightedProfitCents = weightedRevenueCents - weightedCostCents;
  const acceptedRows = rows.filter((row) => row.offer.accepted);
  const acceptedWeight = acceptedRows.reduce((sum, row) => sum + row.weight, 0);
  const acceptedQuantity = acceptedRows.reduce(
    (sum, row) => sum + row.weight * row.offer.quantity,
    0,
  );
  const mix = Object.fromEntries(volumeKeys.map((key) => [
    key,
    percentage(
      rows
        .filter((row) => row.offer.volumeKey === key)
        .reduce((sum, row) => sum + row.weight, 0) / sumWeight,
    ),
  ]));
  const customerWeights = new Map();

  for (const row of rows) {
    customerWeights.set(
      row.offer.customerKey,
      (customerWeights.get(row.offer.customerKey) ?? 0) + row.weight,
    );
  }

  const customerShares = [...customerWeights.values()].map(
    (weight) => weight / sumWeight,
  );
  const effectiveCustomerCount = customerShares.length > 0
    ? 1 / customerShares.reduce((sum, share) => sum + share ** 2, 0)
    : 0;
  const profitPerOfferEur = weightedProfitCents / sumWeight / 100;
  const acceptedAverageQuantity = acceptedWeight > 0
    ? acceptedQuantity / acceptedWeight
    : 0;

  return {
    n: offers.length,
    customerMixPct: mix,
    avgQuantity: Math.round(weightedQuantity / sumWeight),
    medianQuantity: Math.round(
      weightedQuantile(rows, (row) => row.offer.quantity, (row) => row.weight, 0.5),
    ),
    p90Quantity: Math.round(
      weightedQuantile(rows, (row) => row.offer.quantity, (row) => row.weight, 0.9),
    ),
    avgUnitPriceEur: round2(weightedRevenueCents / weightedQuantity / 100),
    avgEstimatedUnitCostEur: round2(weightedCostCents / weightedQuantity / 100),
    marginPct: percentage(weightedProfitCents / weightedRevenueCents),
    profitPerOfferEur: Math.round(profitPerOfferEur),
    marketProfitOpportunityPerDayEur: observationDays > 0
      ? Math.round((offers.length / observationDays) * profitPerOfferEur)
      : null,
    acceptanceRatePct: percentage(acceptedWeight / sumWeight),
    acceptedAverageQuantity: Math.round(acceptedAverageQuantity),
    requiredOrderCountIndex: null,
    projectedActiveOrderCount: activeOrderBaseline,
    avgRequiredPoints: Math.round(
      rows.reduce(
        (sum, row) => sum + row.weight * row.offer.requiredTotalPoints,
        0,
      ) / sumWeight,
    ),
    effectiveCustomerCount: round2(effectiveCustomerCount),
    topCustomerSharePct: percentage(Math.max(0, ...customerShares)),
    topVolumeClassSharePct: Math.max(...Object.values(mix).filter(Number.isFinite)),
  };
}

function buildObservationDaysByBand(offers) {
  const spans = new Map();

  for (const offer of offers) {
    const band = bandFor(offer.lineCount);
    const key = `${band}:${offer.factoryId}`;
    const current = spans.get(key) ?? {
      band,
      min: offer.offeredDay,
      max: offer.offeredDay,
    };
    current.min = Math.min(current.min, offer.offeredDay);
    current.max = Math.max(current.max, offer.offeredDay);
    spans.set(key, current);
  }

  const result = new Map();
  for (const span of spans.values()) {
    result.set(
      span.band,
      (result.get(span.band) ?? 0) + span.max - span.min + 1,
    );
  }
  return result;
}

function summarizeScenario(offers, modelKey, activeOrderCounts) {
  const observationDays = buildObservationDaysByBand(offers);
  const result = {};

  for (const band of scaleBands) {
    const cohort = offers.filter((offer) => bandFor(offer.lineCount) === band.key);
    if (cohort.length === 0) continue;
    result[band.key] = summarizeOffers(
      cohort,
      modelKey,
      observationDays.get(band.key) ?? 0,
      activeOrderCounts.get(band.key) ?? 0,
    );
  }

  return result;
}

function addOrderComplexityProjection(scenarios) {
  const baseline = scenarios.CURRENT;

  for (const cohorts of Object.values(scenarios)) {
    for (const [band, metrics] of Object.entries(cohorts)) {
      const baselineMetrics = baseline[band];
      const index = metrics.acceptedAverageQuantity > 0
        ? baselineMetrics.acceptedAverageQuantity / metrics.acceptedAverageQuantity
        : 1;
      metrics.requiredOrderCountIndex = round2(index);
      metrics.projectedActiveOrderCount = round2(
        baselineMetrics.projectedActiveOrderCount * index,
      );
    }
  }
}

function stageForLineCount(stages, lineCount) {
  return stages.find(
    (stage) =>
      lineCount >= stage.minProductionLines &&
      (stage.maxProductionLines === null || lineCount <= stage.maxProductionLines),
  ) ?? null;
}

function fixtureDistribution(input) {
  const stage = stageForLineCount(input.stages, input.lineCount);
  if (!stage) return null;
  const eligibleCustomers = input.customers.filter(
    (customer) =>
      input.activeProductTiers.has(customer.productTier) &&
      (customer.minStageSortOrder === null ||
        customer.minStageSortOrder <= stage.sortOrder) &&
      (customer.maxStageSortOrder === null ||
        customer.maxStageSortOrder >= stage.sortOrder),
  );
  const tiers = [...new Set(eligibleCustomers.map((customer) => customer.productTier))];
  const customerShares = new Map();

  for (const tier of tiers) {
    const tierCustomers = eligibleCustomers.filter(
      (customer) => customer.productTier === tier,
    );
    const weightedCustomers = tierCustomers.map((customer) => ({
      customer,
      weight:
        customer.baseWeight *
        (models[input.modelKey](input.lineCount)[customer.volumeKey] ?? 10_000) /
        10_000,
    }));
    const totalWeight = weightedCustomers.reduce((sum, row) => sum + row.weight, 0);

    for (const row of weightedCustomers) {
      customerShares.set(
        row.customer.id,
        (customerShares.get(row.customer.id) ?? 0) +
          row.weight / totalWeight / tiers.length,
      );
    }
  }

  const volumeShares = Object.fromEntries(volumeKeys.map((key) => [key, 0]));
  for (const customer of eligibleCustomers) {
    volumeShares[customer.volumeKey] += customerShares.get(customer.id) ?? 0;
  }
  const shares = [...customerShares.values()];

  return {
    lineCount: input.lineCount,
    stageKey: stage.key,
    volumeMixPct: Object.fromEntries(
      volumeKeys.map((key) => [key, percentage(volumeShares[key])]),
    ),
    effectiveCustomerCount: round2(
      shares.length > 0
        ? 1 / shares.reduce((sum, share) => sum + share ** 2, 0)
        : 0,
    ),
    topCustomerSharePct: percentage(Math.max(0, ...shares)),
  };
}

function cliffMetrics(before, after) {
  const beforeMix = before.volumeMixPct;
  const afterMix = after.volumeMixPct;
  const totalVariationPct = round2(
    volumeKeys.reduce(
      (sum, key) => sum + Math.abs(afterMix[key] - beforeMix[key]),
      0,
    ) / 2,
  );
  const massBefore = beforeMix.mass_distribution;
  const massAfter = afterMix.mass_distribution;

  return {
    totalVariationPct,
    massShareBeforePct: massBefore,
    massShareAfterPct: massAfter,
    massShareRatio: massBefore > 0 ? round2(massAfter / massBefore) : null,
    highVolumeShareDeltaPct: round2(
      afterMix.large_retail + afterMix.mass_distribution -
      beforeMix.large_retail - beforeMix.mass_distribution,
    ),
  };
}

await client.connect();

try {
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const snapshotAt = (await client.query("SELECT NOW() AS now")).rows[0].now;
  const versionCounts = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE metadata->>'generator' = 'product_tier_market_v5')::int AS v5_count,
        COUNT(*) FILTER (WHERE metadata->>'balanceVersion' = '4')::int AS v4_count,
        COUNT(*) FILTER (WHERE metadata->>'balanceVersion' = '5')::int AS v5_balance_count,
        MAX(created_at) FILTER (WHERE metadata->>'generator' = 'product_tier_market_v5') AS latest_v5_created_at
      FROM market_order_offers
    `);
  const itemRows = await client.query(`
      SELECT
        o.id AS offer_id,
        o.factory_id,
        o.virtual_customer_id,
        vc.key AS customer_key,
        o.offer_type,
        o.offered_day,
        o.created_at,
        o.status,
        o.total_quantity,
        o.required_total_points,
        o.metadata AS offer_metadata,
        cvc.key AS volume_key,
        oi.quantity,
        oi.estimated_unit_cost_cents,
        oi.pricing_snapshot,
        p.base_unit_price_cents
      FROM market_order_offers o
      JOIN market_order_offer_items oi ON oi.market_order_offer_id = o.id
      JOIN products p ON p.id = oi.product_id
      JOIN virtual_customers vc ON vc.id = o.virtual_customer_id
      JOIN customer_volume_classes cvc ON cvc.id = o.customer_volume_class_id
      WHERE o.metadata->>'generator' = 'product_tier_market_v5'
        AND oi.estimated_unit_cost_cents IS NOT NULL
      ORDER BY o.created_at, o.id, oi.sort_order
    `);
  const customerRows = await client.query(`
      SELECT
        vc.id,
        vc.key,
        vc.product_tier,
        vc.trust_requirement_bps,
        vc.metadata,
        cvc.key AS volume_key,
        min_stage.sort_order AS min_stage_sort_order,
        max_stage.sort_order AS max_stage_sort_order
      FROM virtual_customers vc
      JOIN sectors s ON s.id = vc.sector_id
      JOIN customer_volume_classes cvc ON cvc.id = vc.customer_volume_class_id
      LEFT JOIN sector_factory_operating_stages min_stage ON min_stage.id = vc.min_operating_stage_id
      LEFT JOIN sector_factory_operating_stages max_stage ON max_stage.id = vc.max_operating_stage_id
      WHERE s.key = 'textile'
        AND vc.status = 'ACTIVE'
        AND cvc.status = 'ACTIVE'
      ORDER BY vc.product_tier, vc.created_at
    `);
  const stageRows = await client.query(`
      SELECT
        st.key,
        st.sort_order,
        st.min_production_lines,
        st.max_production_lines
      FROM sector_factory_operating_stages st
      JOIN sectors s ON s.id = st.sector_id
      WHERE s.key = 'textile' AND st.status = 'ACTIVE'
      ORDER BY st.sort_order
    `);
  const productTierRows = await client.query(`
      SELECT DISTINCT p.tier
      FROM products p
      JOIN sectors s ON s.id = p.sector_id
      WHERE s.key = 'textile' AND p.status = 'ACTIVE'
    `);
  const factoryRows = await client.query(`
      SELECT f.id,
        COUNT(pl.id) FILTER (WHERE pl.status IN ('IDLE', 'RUNNING'))::int AS line_count
      FROM factories f
      LEFT JOIN factory_production_lines pl ON pl.factory_id = f.id
      GROUP BY f.id
      ORDER BY line_count DESC, f.id
    `);
  const activeOrderRows = await client.query(`
      WITH line_counts AS (
        SELECT f.id AS factory_id,
          COUNT(pl.id) FILTER (WHERE pl.status IN ('IDLE', 'RUNNING'))::int AS line_count
        FROM factories f
        LEFT JOIN factory_production_lines pl ON pl.factory_id = f.id
        GROUP BY f.id
      )
      SELECT lc.line_count,
        COUNT(co.id) FILTER (
          WHERE co.status IN ('ACTIVE', 'IN_PRODUCTION', 'READY_TO_SHIP', 'PARTIALLY_SHIPPED', 'LATE')
        )::int AS active_order_count
      FROM line_counts lc
      LEFT JOIN customer_orders co ON co.factory_id = lc.factory_id
      GROUP BY lc.line_count
    `);

  const offersById = new Map();
  for (const row of itemRows.rows) {
    const offerMetadata = row.offer_metadata ?? {};
    const lineCount = Number(offerMetadata.activeProductionLineCount ?? 0);
    if (lineCount < 1) continue;
    let offer = offersById.get(row.offer_id);

    if (!offer) {
      offer = {
        id: row.offer_id,
        factoryId: row.factory_id,
        customerId: row.virtual_customer_id,
        customerKey: row.customer_key,
        offeredDay: Number(row.offered_day),
        createdAt: new Date(row.created_at),
        accepted: row.status === "ACCEPTED",
        lineCount,
        quantity: Number(row.total_quantity),
        requiredTotalPoints: Number(row.required_total_points),
        volumeKey: row.volume_key,
        revenueCents: 0,
        costCents: 0,
      };
      offersById.set(row.offer_id, offer);
    }

    const pricingSnapshot = row.pricing_snapshot ?? {};
    const typePriceMultiplierBps = Number(
      pricingSnapshot.typePriceMultiplierBps ??
      offerMetadata.typePriceMultiplierBps ??
      10_000,
    );
    const quantityPriceMultiplierBps = calculateQuantityPriceMultiplierBps({
      config: CANONICAL_MARKET_PRICING_CONFIG,
      totalOfferQuantity: offer.quantity,
    });
    const unitPriceCents = calculateOfferUnitPriceCents({
      baseUnitPriceCents: Number(
        pricingSnapshot.baseUnitPriceCents ?? row.base_unit_price_cents,
      ),
      quantityPriceMultiplierBps,
      typePriceMultiplierBps,
    });
    const itemQuantity = Number(row.quantity);
    offer.revenueCents += unitPriceCents * itemQuantity;
    offer.costCents += Number(row.estimated_unit_cost_cents) * itemQuantity;
  }

  const offers = [...offersById.values()];
  const activeOrderCounts = new Map();
  for (const row of activeOrderRows.rows) {
    const band = bandFor(Number(row.line_count));
    activeOrderCounts.set(
      band,
      (activeOrderCounts.get(band) ?? 0) + Number(row.active_order_count),
    );
  }

  const scenarios = Object.fromEntries(
    Object.keys(models).map((modelKey) => [
      modelKey,
      summarizeScenario(offers, modelKey, activeOrderCounts),
    ]),
  );
  addOrderComplexityProjection(scenarios);

  const customers = customerRows.rows.map((row) => {
    const metadata = row.metadata ?? {};
    const offerWeight = Number(metadata.offerWeight ?? 100);
    const trustWeight = Math.max(100, 10_000 - Number(row.trust_requirement_bps));
    return {
      id: row.id,
      key: row.key,
      productTier: row.product_tier,
      volumeKey: row.volume_key,
      minStageSortOrder: row.min_stage_sort_order === null
        ? null
        : Number(row.min_stage_sort_order),
      maxStageSortOrder: row.max_stage_sort_order === null
        ? null
        : Number(row.max_stage_sort_order),
      baseWeight: Math.round((trustWeight * offerWeight) / 100),
    };
  });
  const stages = stageRows.rows.map((row) => ({
    key: row.key,
    sortOrder: Number(row.sort_order),
    minProductionLines: Number(row.min_production_lines),
    maxProductionLines: row.max_production_lines === null
      ? null
      : Number(row.max_production_lines),
  }));
  const activeProductTiers = new Set(productTierRows.rows.map((row) => row.tier));
  const fixtures = {};
  const cliffs = {};

  for (const modelKey of Object.keys(models)) {
    fixtures[modelKey] = Object.fromEntries(
      representativeLineCounts.map((lineCount) => [
        lineCount,
        fixtureDistribution({
          activeProductTiers,
          customers,
          lineCount,
          modelKey,
          stages,
        }),
      ]),
    );
    cliffs[modelKey] = {
      "30to31": cliffMetrics(fixtures[modelKey][30], fixtures[modelKey][31]),
      "60to61": cliffMetrics(fixtures[modelKey][60], fixtures[modelKey][61]),
      "100to101": cliffMetrics(fixtures[modelKey][100], fixtures[modelKey][101]),
    };
  }

  const largestFactory = factoryRows.rows[0] ?? null;
  const largestFactoryOffers = largestFactory
    ? offers
      .filter((offer) => offer.factoryId === largestFactory.id)
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, 100)
    : [];
  const largestFactoryObservationDays = largestFactoryOffers.length > 0
    ? Math.max(...largestFactoryOffers.map((offer) => offer.offeredDay)) -
      Math.min(...largestFactoryOffers.map((offer) => offer.offeredDay)) +
      1
    : 0;
  const extremeFactory = largestFactory
    ? {
        activeLineCount: Number(largestFactory.line_count),
        offerCount: largestFactoryOffers.length,
        scenarios: Object.fromEntries(Object.keys(models).map((modelKey) => [
          modelKey,
          summarizeOffers(
            largestFactoryOffers,
            modelKey,
            largestFactoryObservationDays,
            0,
          ),
        ])),
      }
    : null;

  const summary = {
    snapshotAt,
    versionCounts: versionCounts.rows[0],
    sample: {
      offerCount: offers.length,
      itemCount: itemRows.rows.length,
      factoryCount: new Set(offers.map((offer) => offer.factoryId)).size,
    },
    modelConfigs: {
      S1_SMOOTHED_STEP: {
        industrial: s1IndustrialWeights,
        enterprise: s1EnterpriseWeights,
      },
      S2_MORE_BANDS: s2Bands,
      S3_INTERPOLATED: s3Anchors,
    },
    cliffs,
    scenarios,
    fixtures,
    extremeFactory,
  };
  const decision = {
    snapshotAt: summary.snapshotAt,
    versionCounts: summary.versionCounts,
    sample: summary.sample,
    cliffs: summary.cliffs,
    keyCohorts: Object.fromEntries(Object.entries(summary.scenarios).map(
      ([modelKey, cohorts]) => [modelKey, Object.fromEntries(
        ["31-60", "61-100", "101+"].map((key) => [key, cohorts[key]]),
      )],
    )),
    fixtureProgression: Object.fromEntries(Object.entries(summary.fixtures).map(
      ([modelKey, modelFixtures]) => [modelKey, Object.fromEntries(
        representativeLineCounts.map((lineCount) => [
          lineCount,
          {
            volumeMixPct: modelFixtures[lineCount].volumeMixPct,
            effectiveCustomerCount: modelFixtures[lineCount].effectiveCustomerCount,
          },
        ]),
      )],
    )),
    extremeFactory: summary.extremeFactory,
  };
  const reportOutput = {
    snapshotAt: summary.snapshotAt,
    versionCounts: summary.versionCounts,
    sample: summary.sample,
    cliffs: summary.cliffs,
    cohortProjection: {
      CURRENT: summary.scenarios.CURRENT,
      S3_INTERPOLATED: summary.scenarios.S3_INTERPOLATED,
    },
    fixtures: {
      CURRENT: summary.fixtures.CURRENT,
      S3_INTERPOLATED: summary.fixtures.S3_INTERPOLATED,
    },
    extremeFactory: summary.extremeFactory,
  };
  const output = process.env.PHASE3_OUTPUT === "full"
    ? summary
    : process.env.PHASE3_OUTPUT === "report"
      ? reportOutput
      : decision;

  console.log(JSON.stringify(output, null, 2));
  await client.query("ROLLBACK");
} finally {
  await client.end();
}
