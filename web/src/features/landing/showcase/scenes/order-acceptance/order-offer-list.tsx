import { CalendarDays, PackageCheck } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  formatShowcaseMoney,
  formatShowcaseNumber,
} from "./order-acceptance-formatters";
import type {
  OrderAcceptanceSceneCopy,
  ResolvedOrderAcceptanceOffer,
} from "./order-acceptance-scene-types";

export type OrderOfferListProps = {
  copy: OrderAcceptanceSceneCopy;
  numberLocale: string;
  offers: readonly ResolvedOrderAcceptanceOffer[];
  selectedOfferId: string;
};

export function OrderOfferList({
  copy,
  numberLocale,
  offers,
  selectedOfferId,
}: OrderOfferListProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-background/58 p-3 sm:p-4">
      <div className="mb-3 border-b border-white/8 pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-readable">
          {copy.listTitle}
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {copy.listDescription}
        </p>
      </div>

      <div
        aria-label={copy.orderListAriaLabel}
        className="grid gap-2"
        role="list"
      >
        {offers.map((offer) => {
          const isSelected = offer.id === selectedOfferId;

          return (
            <article
              aria-current={isSelected ? "true" : undefined}
              className={cn(
                "rounded-lg border border-white/10 bg-card/65 p-3 transition-colors",
                isSelected &&
                  "border-primary/55 bg-primary/10 shadow-[inset_3px_0_0_var(--primary)]",
              )}
              data-offer-id={offer.id}
              key={offer.id}
              role="listitem"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-muted-foreground">
                    {offer.customerName}
                  </p>
                  <h3 className="mt-0.5 truncate text-sm font-semibold text-foreground">
                    {offer.product.name}
                  </h3>
                </div>
                {isSelected ? (
                  <span className="shrink-0 rounded-md border border-primary/40 bg-primary/10 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-primary-readable">
                    {copy.selectedOfferLabel}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <PackageCheck aria-hidden="true" size={12} />
                  {formatShowcaseNumber(offer.quantity, numberLocale)}{" "}
                  {copy.pieceUnitLabel}
                </span>
                <span className="flex items-center justify-end gap-1.5">
                  <CalendarDays aria-hidden="true" size={12} />
                  {formatShowcaseNumber(offer.deliveryDays, numberLocale)}{" "}
                  {copy.dayUnitLabel}
                </span>
              </div>
              <p className="mt-2 truncate font-mono text-[11px] text-foreground/80">
                {formatShowcaseMoney(
                  offer.totalRevenue,
                  offer.currency,
                  numberLocale,
                )}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
