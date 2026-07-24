import { Palette } from "lucide-react";

import { cn } from "@/lib/utils";

export type ProductColorChip = {
  active?: boolean;
  hexCode: string;
  key: string;
  label: string;
  quantityLabel?: string;
  selected?: boolean;
};

export type ProductColorChipsProps = {
  colors: readonly ProductColorChip[];
  title: string;
};

export function ProductColorChips({
  colors,
  title,
}: ProductColorChipsProps) {
  if (colors.length === 0) return null;

  return (
    <div
      className="mt-2 rounded-lg border border-border bg-background/60 p-2.5"
      data-product-color-chips
    >
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Palette aria-hidden="true" size={13} />
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((color) => (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border border-border bg-card/70 px-2 py-1 text-[11px] text-muted-foreground",
              color.selected && "border-primary/45 bg-primary/10 text-primary",
              color.active === false && "opacity-50",
            )}
            data-active={color.active ?? true}
            data-selected={color.selected ?? false}
            key={color.key}
          >
            <span
              className="size-3.5 shrink-0 rounded-[4px] border border-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
              style={{ backgroundColor: color.hexCode }}
            />
            <span className="max-w-24 truncate">{color.label}</span>
            {color.quantityLabel ? (
              <strong className="text-foreground/80">
                {color.quantityLabel}
              </strong>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}
