"use client";

import {
  CalendarDays,
  CircleDollarSign,
  Hash,
  Layers3,
  Package,
  Sparkles,
  Tag,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { ArtCard } from "@/components/ui/art-card";

import { updateProductCardAction } from "../product-actions";
import { Field, FormGrid, Input, Options, Select } from "../../form-ui";

type CardProduct = {
  id: string;
  code: string | null;
  name: string;
  categoryName: string;
  productTypeName: string;
  tier: string;
  baseUnitPriceCents: number;
  requiredPlayerLevel: number;
  imageUrl?: string;
  cardPrimaryColor: string;
  cardSecondaryColor: string;
  cardGradientFrom: string;
  cardGradientTo: string;
  cardTextColor: string;
  cardSvgIconColor: string;
  cardSvgIconAccentColor: string;
  cardForegroundTone: string;
};

const colorLabels: Record<string, string> = {
  cardPrimaryColor: "Primary renk",
  cardSecondaryColor: "Secondary renk",
  cardGradientFrom: "Gradient başlangıç",
  cardGradientTo: "Gradient bitiş",
  cardTextColor: "Metin rengi",
  cardSvgIconColor: "İkon rengi",
  cardSvgIconAccentColor: "İkon arka planı",
};

export function ProductCardDesigner({ product }: { product: CardProduct }) {
  const [colors, setColors] = useState({
    cardPrimaryColor: product.cardPrimaryColor,
    cardSecondaryColor: product.cardSecondaryColor,
    cardGradientFrom: product.cardGradientFrom,
    cardGradientTo: product.cardGradientTo,
    cardTextColor: product.cardTextColor,
    cardSvgIconColor: product.cardSvgIconColor,
    cardSvgIconAccentColor: product.cardSvgIconAccentColor,
  });

  function setColor(key: keyof typeof colors, value: string) {
    setColors((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <form
        action={updateProductCardAction.bind(null, product.id)}
        className="game-card grid content-start gap-5 p-5"
      >
        <div>
          <h2 className="text-lg font-semibold">Kart renkleri</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Renk değişiklikleri sağdaki önizlemede anında görünür.
          </p>
        </div>
        <FormGrid>
          {Object.entries(colors).map(([key, value]) => (
            <Field key={key} label={colorLabels[key] ?? key}>
              <Input
                name={key}
                onChange={(event) =>
                  setColor(key as keyof typeof colors, event.target.value)
                }
                type="color"
                value={value}
              />
            </Field>
          ))}
          <Field label="Ön plan tonu">
            <Select
              defaultValue={product.cardForegroundTone}
              name="cardForegroundTone"
            >
              <Options values={["LIGHT", "DARK"]} />
            </Select>
          </Field>
        </FormGrid>
        <button className="game-button-primary" type="submit">
          Kart Tasarımını Kaydet
        </button>
      </form>

      <div className="min-w-0 xl:sticky xl:top-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-primary">
          Canlı kart önizleme
        </p>
        <article
          className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#15141d] shadow-[0_30px_90px_rgba(0,0,0,.55)]"
          style={{
            color: colors.cardTextColor,
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full opacity-15 blur-3xl"
            style={{ background: colors.cardPrimaryColor }}
          />
          <div className="relative p-6 pb-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-[.28em]"
                  style={{ color: colors.cardPrimaryColor }}
                >
                  Factory Runway · Product
                </p>
                <h2 className="mt-2 max-w-[300px] text-3xl font-black leading-[1.02] tracking-tight">
                  {product.name}
                </h2>
                <p className="mt-2 text-sm text-white/55">
                  {product.categoryName}
                </p>
              </div>
              <div
                className="grid size-12 shrink-0 place-items-center rounded-full border border-white/15 text-lg font-black"
                style={{
                  background: `${colors.cardSecondaryColor}35`,
                  color: colors.cardPrimaryColor,
                }}
              >
                {product.requiredPlayerLevel}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold"
                style={{
                  background: colors.cardPrimaryColor,
                  color: colors.cardTextColor,
                }}
              >
                <Tag size={14} />
                {product.productTypeName}
              </span>
              <span
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold"
                style={{
                  background: `${colors.cardSecondaryColor}30`,
                  color: colors.cardSecondaryColor,
                }}
              >
                {product.tier}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <span
                  className="size-3.5 rounded-full ring-2 ring-white/10"
                  style={{ background: colors.cardPrimaryColor }}
                  title="Primary renk"
                />
                <span
                  className="size-3.5 rounded-full ring-2 ring-white/10"
                  style={{ background: colors.cardSecondaryColor }}
                  title="Secondary renk"
                />
              </div>
            </div>

            <div
              className="relative mt-8 min-h-[390px]"
              aria-label={`${product.name} ürün görsel alanı`}
            >
              <div
                className="absolute inset-x-0 bottom-0 h-[310px] overflow-hidden rounded-[28px] border border-white/10"
              >
                <ArtCard
                  gradientFrom={colors.cardGradientFrom}
                  gradientTo={colors.cardGradientTo}
                  primaryColor={colors.cardPrimaryColor}
                  secondaryColor={colors.cardSecondaryColor}
                  svgIconAccentColor={colors.cardSvgIconAccentColor}
                />
                <span className="absolute left-6 top-5 z-10 text-8xl font-extralight text-white/20">
                  {product.name.charAt(0).toUpperCase()}
                </span>
                <div className="absolute bottom-6 left-6 z-20 max-w-[180px]">
                  <p className="text-[10px] font-bold uppercase tracking-[.22em] text-white/55">
                    Model
                  </p>
                  <p className="mt-1 text-xl font-black leading-tight text-white">
                    {product.name}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-white/70">
                    {product.categoryName} · {product.tier}
                  </p>
                </div>
              </div>

              {product.imageUrl ? (
                <div
                  aria-label={product.name}
                  className="absolute -right-5 -top-16 z-10 h-[440px] w-[76%] bg-contain bg-bottom bg-no-repeat drop-shadow-[0_28px_22px_rgba(0,0,0,.5)]"
                  role="img"
                  style={{ backgroundImage: `url("${product.imageUrl}")` }}
                />
              ) : (
                <div className="absolute -right-2 top-0 z-10 grid h-[340px] w-[64%] place-items-center">
                  <Package className="size-28 text-white/50 drop-shadow-[0_20px_18px_rgba(0,0,0,.5)]" />
                </div>
              )}
            </div>
          </div>

          <div className="relative mx-6 mb-6 overflow-hidden rounded-[22px] border border-white/10 bg-black/15">
            <Info
              accent={colors.cardPrimaryColor}
              icon={<Hash />}
              iconBg={colors.cardSvgIconAccentColor}
              iconColor={colors.cardSvgIconColor}
              label="Kod"
              value={product.code ?? "—"}
            />
            <Info
              accent={colors.cardPrimaryColor}
              icon={<Package />}
              iconBg={colors.cardSvgIconAccentColor}
              iconColor={colors.cardSvgIconColor}
              label="Model"
              value={product.name}
            />
            <Info
              accent={colors.cardPrimaryColor}
              icon={<Layers3 />}
              iconBg={colors.cardSvgIconAccentColor}
              iconColor={colors.cardSvgIconColor}
              label="Kategori"
              value={product.categoryName}
            />
            <Info
              accent={colors.cardPrimaryColor}
              icon={<CalendarDays />}
              iconBg={colors.cardSvgIconAccentColor}
              iconColor={colors.cardSvgIconColor}
              label="Seviye"
              value={`${product.tier} · Lv. ${product.requiredPlayerLevel}`}
            />
            <Info
              accent={colors.cardPrimaryColor}
              icon={<CircleDollarSign />}
              iconBg={colors.cardSvgIconAccentColor}
              iconColor={colors.cardSvgIconColor}
              label="Birim Fiyat"
              value={`${(product.baseUnitPriceCents / 100).toLocaleString("tr-TR")} €`}
            />
          </div>

          <div className="flex items-center justify-between border-t border-white/10 px-6 py-4 text-[10px] font-bold uppercase tracking-[.18em] text-white/35">
            <span className="inline-flex items-center gap-2">
              <Sparkles size={13} style={{ color: colors.cardSecondaryColor }} />
              Product Preview
            </span>
            <span>{product.productTypeName}</span>
          </div>
        </article>
      </div>
    </div>
  );
}

function Info({
  accent,
  icon,
  iconBg,
  iconColor,
  label,
  value,
}: {
  accent: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-4 border-b border-white/10 px-4 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </span>
        <span className="text-sm font-semibold text-white/65">{label}</span>
      </div>
      <strong
        className="max-w-[58%] text-right text-sm leading-tight"
        style={{ color: accent }}
      >
        {value}
      </strong>
    </div>
  );
}
