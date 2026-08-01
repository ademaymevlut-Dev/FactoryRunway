"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { ProductHeroSurface } from "@/components/game-presentation/product-hero-surface";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OrderOfferItemView } from "../types";
import { useOrdersUi } from "./orders-ui-context";

export function OrderProductHeroCanvas({
  activeItem,
  activeItemIndex,
  items,
  onActiveItemChange,
}: {
  activeItem: OrderOfferItemView;
  activeItemIndex: number;
  items: OrderOfferItemView[];
  onActiveItemChange: (index: number) => void;
}) {
  const { copy } = useOrdersUi();
  const itemCount = items.length;
  const selectPrevious = () =>
    onActiveItemChange((activeItemIndex - 1 + itemCount) % itemCount);
  const selectNext = () =>
    onActiveItemChange((activeItemIndex + 1) % itemCount);

  return (
    <ProductHeroSurface
      context="order"
      footer={
        <footer className="absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-3 pb-3 pt-10 sm:px-4 sm:pb-4">
          <ProductHeroColorRail
            activeItem={activeItem}
            activeItemIndex={activeItemIndex}
            items={items}
            onActiveItemChange={onActiveItemChange}
          />
        </footer>
      }
      header={
        <header
          className="absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-3 bg-gradient-to-b from-black/60 via-black/15 to-transparent p-3 sm:p-4"
          data-hero-layer="chrome"
        >
          <div className="min-w-0 pr-2">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
              {activeItem.productCode} · {activeItem.productTierLabel}
            </p>
            <h3 className="mt-1 truncate text-lg font-semibold tracking-tight text-white sm:text-2xl">
              {activeItem.productName}
            </h3>
          </div>
          {itemCount > 1 ? (
            <div
              aria-label={copy.carousel.ariaLabel}
              className="flex shrink-0 items-center gap-1"
              role="group"
            >
              <Button
                aria-label={copy.carousel.previousAria}
                className="orders-hero-carousel-button size-11 border-white/15 bg-black/30 text-white hover:bg-white/10 hover:text-white"
                onClick={selectPrevious}
                size="icon"
                type="button"
                variant="outline"
              >
                <ChevronLeft />
              </Button>
              <span className="min-w-10 text-center text-[10px] font-semibold tabular-nums text-white/65">
                {activeItemIndex + 1} / {itemCount}
              </span>
              <Button
                aria-label={copy.carousel.nextAria}
                className="orders-hero-carousel-button size-11 border-white/15 bg-black/30 text-white hover:bg-white/10 hover:text-white"
                onClick={selectNext}
                size="icon"
                type="button"
                variant="outline"
              >
                <ChevronRight />
              </Button>
            </div>
          ) : null}
        </header>
      }
      imagePriority
      imageSizes="(min-width: 1280px) calc(100vw - 660px), (min-width: 640px) calc(100vw - 230px), calc(100vw - 136px)"
      imageUnavailableLabel={copy.hero.imageUnavailable}
      imageUrl={activeItem.imageUrl}
      mediaIdentity={activeItem.id}
      name={activeItem.productName}
      paletteSource={activeItem}
      productCode={activeItem.productCode}
      productTypeKey={activeItem.productTypeKey}
    />
  );
}

function ProductHeroColorRail({
  activeItem,
  activeItemIndex,
  items,
  onActiveItemChange,
}: {
  activeItem: OrderOfferItemView;
  activeItemIndex: number;
  items: OrderOfferItemView[];
  onActiveItemChange: (index: number) => void;
}) {
  const { copy } = useOrdersUi();

  return (
    <div className="flex min-w-0 items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">
          {copy.colorDistributionTitle}
        </p>
        <div className="mt-1.5 flex max-w-full gap-1.5 overflow-x-auto pb-0.5">
          {activeItem.colors.map((color) => (
            <span
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/25 py-1 pl-1 pr-2 text-[10px] text-white/75"
              key={color.id}
              title={`${color.name} · ${color.quantityLabel}`}
            >
              <span
                aria-hidden="true"
                className="size-3 rounded-full border border-white/20"
                style={{
                  backgroundColor: isHexColor(color.hexCode)
                    ? color.hexCode
                    : "var(--hero-accent)",
                }}
              />
              <span>{color.name}</span>
              <span className="text-white/40">{color.quantityLabel}</span>
            </span>
          ))}
        </div>
      </div>
      {items.length > 1 ? (
        <div className="flex shrink-0 items-center gap-1">
          {items.map((item, index) => (
            <button
              aria-label={copy.carousel.itemAria(index + 1, item.productName)}
              aria-pressed={index === activeItemIndex}
              className="grid size-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              key={item.id}
              onClick={() => onActiveItemChange(index)}
              type="button"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "h-1.5 w-1.5 rounded-full bg-white/25 transition-[width,background-color] motion-reduce:transition-none",
                  index === activeItemIndex && "w-4 bg-white/80",
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function isHexColor(color: string) {
  return /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(color);
}
