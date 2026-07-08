import { getPrisma } from "@/lib/db";

import { jsonText } from "../admin-data";
import { deleteMarketConfigAction, saveMarketConfigAction } from "../catalog-actions";
import { Field, FormGrid, Input, Options, Panel, Select, Textarea, enumOptions } from "../form-ui";

export default async function MarketConfigPage() {
  const prisma = getPrisma();
  const [sectors, configs] = await Promise.all([
    prisma.sector.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.marketGenerationConfig.findMany({ orderBy: [{ sectorId: "asc" }, { playerLevelMin: "asc" }], include: { sector: true } }),
  ]);
  return <div className="grid gap-4"><header className="game-topbar"><div><p className="text-xs uppercase text-primary">Admin Config</p><h1 className="text-2xl font-semibold">Market Generation Config</h1></div></header>
    <Panel title="Yeni market kuralı"><form action={saveMarketConfigAction.bind(null, null)} className="grid gap-4"><MarketFields sectors={sectors} /><button className="game-button-primary">Kural Oluştur</button></form></Panel>
    {configs.map((config) => <Panel key={config.id} title={`${config.sector.key} · ${config.offerType} · ${config.marketSlotRole}`}><form action={saveMarketConfigAction.bind(null, config.id)} className="grid gap-4"><MarketFields config={{ ...config, metadata: jsonText(config.metadata) }} sectors={sectors} /><div className="flex gap-2"><button className="game-button-primary">Güncelle</button><button className="game-button-ghost" formAction={deleteMarketConfigAction.bind(null, config.id)}>Sil</button></div></form></Panel>)}
  </div>;
}

function MarketFields({ config, sectors }: { config?: Record<string, unknown>; sectors: Array<{ id: string; key: string }> }) {
  const v = (key: string, fallback: string | number = "") => String(config?.[key] ?? fallback);
  return <><FormGrid>
    <Field label="Sector"><Select defaultValue={v("sectorId")} name="sectorId">{sectors.map((x) => <option key={x.id} value={x.id}>{x.key}</option>)}</Select></Field>
    <Field label="Player level min"><Input defaultValue={v("playerLevelMin", 1)} min={1} name="playerLevelMin" required type="number" /></Field><Field label="Player level max"><Input defaultValue={v("playerLevelMax")} min={1} name="playerLevelMax" type="number" /></Field>
    <Field label="Factory standard"><Select defaultValue={v("factoryStandard", "WORKSHOP")} name="factoryStandard"><Options values={enumOptions.standards} /></Select></Field>
    <Field label="Offer type"><Select defaultValue={v("offerType", "SAFE")} name="offerType"><Options values={["SAFE", "VOLUME", "RUSH", "STRATEGIC", "PREMIUM_OPPORTUNITY", "SUBCONTRACT_HEAVY", "MICRO_OPPORTUNITY"]} /></Select></Field>
    <Field label="Market slot role"><Select defaultValue={v("marketSlotRole", "SAFE_JOB")} name="marketSlotRole"><Options values={["SAFE_JOB", "PROFITABLE_JOB", "CAPACITY_BALANCER", "RISKY_OPPORTUNITY"]} /></Select></Field>
    {[["minQuantity", 1], ["maxQuantity", 1], ["minTargetDays", 1], ["maxTargetDays", 1], ["minMarginBps", 0], ["maxMarginBps", 0], ["deliveryRiskBps", 0], ["qualityRiskBps", 0], ["weight", 100]].map(([key, fallback]) => <Field key={String(key)} label={String(key)}><Input defaultValue={v(String(key), fallback)} max={String(key).endsWith("Bps") ? 10000 : undefined} min={String(key) === "weight" || String(key).includes("Quantity") || String(key).includes("Days") ? 1 : 0} name={String(key)} required type="number" /></Field>)}
    <Field label="Enabled"><input defaultChecked={config ? Boolean(config.isEnabled) : true} name="isEnabled" type="checkbox" /></Field>
  </FormGrid><Field label="Metadata JSON"><Textarea defaultValue={v("metadata")} name="metadata" /></Field></>;
}
