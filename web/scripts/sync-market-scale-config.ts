// @ts-expect-error pg does not expose declarations in this workspace.
import pg from "pg";

import {
  CANONICAL_MARKET_SCALE_CONFIG,
  MARKET_OFFER_BALANCE_VERSION,
} from "../src/lib/order-market/market-offer-config";

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const apply = process.argv.includes("--apply");
const client = new Client({ connectionString });

type GameplaySnapshot = {
  factories: number;
  financeTransactions: number;
  offers: number;
  orders: number;
};

type BeforeRule = {
  balance_version: number | null;
  market_pricing: unknown;
  market_scale: unknown;
  offer_type: string;
  sector_key: string;
};

type UpdatedRule = {
  balance_version: number;
  market_scale: unknown;
  offer_type: string;
  scale_matches: boolean;
  sector_key: string;
};

async function readGameplaySnapshot(): Promise<GameplaySnapshot> {
  const result = await client.query<{
    factories: number;
    finance_transactions: number;
    offers: number;
    orders: number;
  }>(`
    SELECT
      (SELECT COUNT(*)::int FROM factories) AS factories,
      (SELECT COUNT(*)::int FROM factory_finance_transactions) AS finance_transactions,
      (SELECT COUNT(*)::int FROM market_order_offers) AS offers,
      (SELECT COUNT(*)::int FROM customer_orders) AS orders
  `);
  const row = result.rows[0];

  if (!row) throw new Error("Gameplay snapshot could not be read.");

  return {
    factories: row.factories,
    financeTransactions: row.finance_transactions,
    offers: row.offers,
    orders: row.orders,
  };
}

async function main() {
  await client.connect();

  try {
    await client.query(
      "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ WRITE",
    );
    const beforeGameplay = await readGameplaySnapshot();
    const beforeRules = await client.query<BeforeRule>(`
      SELECT
        s.key AS sector_key,
        r.offer_type,
        (r.metadata->>'balanceVersion')::int AS balance_version,
        r.metadata->'marketPricing' AS market_pricing,
        r.metadata->'marketScale' AS market_scale
      FROM sector_market_offer_type_rules r
      JOIN sectors s ON s.id = r.sector_id
      ORDER BY s.key, r.offer_type
    `);

    if (beforeRules.rowCount === 0) {
      throw new Error("No market offer type config rows were found.");
    }

    const metadataPatch = JSON.stringify({
      balanceVersion: MARKET_OFFER_BALANCE_VERSION,
      marketScale: CANONICAL_MARKET_SCALE_CONFIG,
    });
    const updatedRules = await client.query<UpdatedRule>(
      `
        UPDATE sector_market_offer_type_rules AS r
        SET
          metadata = COALESCE(r.metadata, '{}'::jsonb) || $1::jsonb,
          updated_at = NOW()
        FROM sectors s
        WHERE s.id = r.sector_id
        RETURNING
          s.key AS sector_key,
          r.offer_type,
          (r.metadata->>'balanceVersion')::int AS balance_version,
          r.metadata->'marketScale' AS market_scale,
          (r.metadata->'marketScale' = $2::jsonb) AS scale_matches
      `,
      [metadataPatch, JSON.stringify(CANONICAL_MARKET_SCALE_CONFIG)],
    );
    const afterGameplay = await readGameplaySnapshot();

    if (JSON.stringify(beforeGameplay) !== JSON.stringify(afterGameplay)) {
      throw new Error("Gameplay table snapshot changed inside config transaction.");
    }
    if (updatedRules.rowCount !== beforeRules.rowCount) {
      throw new Error("Not every existing market offer type rule was updated.");
    }
    for (const rule of updatedRules.rows) {
      if (rule.balance_version !== MARKET_OFFER_BALANCE_VERSION) {
        throw new Error(`Unexpected balance version for ${rule.sector_key}.`);
      }
      if (!rule.scale_matches) {
        throw new Error(`Scale config mismatch for ${rule.sector_key}.`);
      }
    }

    if (apply) {
      await client.query("COMMIT");
    } else {
      await client.query("ROLLBACK");
    }

    console.log(
      JSON.stringify(
        {
          mode: apply ? "applied" : "dry-run-rolled-back",
          gameplaySnapshot: beforeGameplay,
          ruleCount: beforeRules.rowCount,
          before: beforeRules.rows.map((rule: BeforeRule) => ({
            sectorKey: rule.sector_key,
            offerType: rule.offer_type,
            balanceVersion: rule.balance_version,
            hasMarketPricing: rule.market_pricing !== null,
            hasMarketScale: rule.market_scale !== null,
          })),
          after: updatedRules.rows.map((rule: UpdatedRule) => ({
            sectorKey: rule.sector_key,
            offerType: rule.offer_type,
            balanceVersion: rule.balance_version,
            hasMarketScale: rule.market_scale !== null,
          })),
          scaleConfig: CANONICAL_MARKET_SCALE_CONFIG,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

void main();
