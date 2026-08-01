"use client";

import { Palette, Sparkles } from "lucide-react";
import { useState } from "react";

import { ProductHeroSurface } from "@/components/game-presentation/product-hero-surface";

import { AdminForm } from "../../admin-form";
import { Field, FormGrid, Input, Options, Select } from "../../form-ui";
import { updateProductCardAction } from "../product-actions";
import { useProductPresentationDraft } from "./product-presentation-draft-context";

type CardProduct = {
  id: string;
  code: string | null;
  name: string;
  categoryName: string;
  productTypeKey: string;
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
  cardPrimaryColor: "Ana blob rengi",
  cardSecondaryColor: "İkincil blob + Light Rays",
  cardGradientFrom: "Zemin tint başlangıcı",
  cardGradientTo: "Zemin tint bitişi",
  cardTextColor: "Kart metin rengi (hero dışı)",
  cardSvgIconColor: "Kart ikon rengi (hero dışı)",
  cardSvgIconAccentColor: "Alt destek glow rengi",
};

export function ProductCardDesigner({ product }: { product: CardProduct }) {
  const { imageUrl } = useProductPresentationDraft();
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
      <AdminForm
        action={updateProductCardAction.bind(null, product.id)}
        className="game-card grid content-start gap-5 p-5"
      >
        <div>
          <h2 className="text-lg font-semibold">Kart ve hero renkleri</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Atmosfer renkleri ortak hero resolver ile sağdaki önizlemeye anında
            uygulanır.
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
      </AdminForm>

      <div className="min-w-0 xl:sticky xl:top-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-primary">
          Canlı oyun hero önizlemesi
        </p>
        <ProductHeroSurface
          className="min-h-[520px] shadow-[0_30px_90px_rgba(0,0,0,.55)] sm:min-h-[560px]"
          context="admin"
          footer={
            <footer className="absolute inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-4 pt-12 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
              <span className="inline-flex items-center gap-2">
                <Sparkles aria-hidden="true" size={13} />
                Ortak presentation surface
              </span>
              <span>{product.productTypeName}</span>
            </footer>
          }
          header={
            <header
              className="absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-3 bg-gradient-to-b from-black/65 via-black/15 to-transparent p-4"
              data-hero-layer="chrome"
            >
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                  {product.code ?? product.id} · {product.tier}
                </p>
                <h3 className="mt-1 truncate text-2xl font-semibold tracking-tight text-white">
                  {product.name}
                </h3>
                <p className="mt-1 truncate text-xs text-white/55">
                  {product.categoryName}
                </p>
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-white/15 bg-black/25 text-white/70">
                <Palette aria-hidden="true" size={18} />
              </span>
            </header>
          }
          imageSizes="420px"
          imageUnavailableLabel="Ürün görseli yüklenmedi"
          imageUrl={imageUrl ?? product.imageUrl ?? null}
          mediaIdentity={imageUrl ?? product.imageUrl ?? product.id}
          name={product.name}
          paletteSource={colors}
          productCode={product.code ?? product.id}
          productTypeKey={product.productTypeKey}
        />
      </div>
    </div>
  );
}
