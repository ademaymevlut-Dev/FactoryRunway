import { Factory, PackageCheck, Scissors, Shirt } from "lucide-react";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

type ProductionLineCardLine = {
  key: string;
  visual: {
    cardUrl: string | null;
    detailUrl: string | null;
    mapUrl: string | null;
  };
};

type ProductionLineCardProps = {
  installed: boolean;
  line: ProductionLineCardLine;
  position: number;
};

export function ProductionLineCard({ installed, line, position }: ProductionLineCardProps) {
  const copy = getProductionLineCopy(line.key);

  return (
    <article
      className={cn(
        "grid min-w-0  overflow-hidden bg-transparent",
        !installed && "opacity-70",
      )}
    >
      <div
        className={cn(
          "flex min-h-11 min-w-0 items-center justify-center gap-1 ",
          installed && "border-cyan-400/20",
        )}
      >
        <ProductionLineIcon lineKey={line.key} />
        <span className="truncate text-[0.98rem] font-black leading-none text-white">
          {copy.shortTitle}
        </span>
      </div>

      <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-b-md bg-[radial-gradient(ellipse_at_50%_16%,rgba(255,255,255,0.14),transparent_42%),linear-gradient(180deg,rgba(184,185,177,0.2),rgba(83,86,82,0.12)),rgba(35,38,38,0.28)]">
        {installed ? (
          <span
            aria-label={`${copy.title} üretim hattı görseli`}
            className="absolute inset-0 bg-contain bg-center bg-no-repeat"
            role="img"
            style={imageStyle(line.visual.cardUrl ?? line.visual.detailUrl ?? line.visual.mapUrl ?? undefined)}
          />
        ) : (
          <span className="grid justify-items-center gap-1 text-sm font-black text-zinc-700">
            <small className="inline-flex size-10 items-center justify-center rounded-full border border-amber-900/25 bg-amber-300/20 text-base">
              {position}
            </small>
            {copy.shortTitle}
          </span>
        )}
      </div>
    </article>
  );
}

function ProductionLineIcon({ lineKey }: { lineKey: string }) {
  const className = "size-[17px] flex-none text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.36)]";

  switch (lineKey) {
    case "cutting_workshop":
      return <Scissors aria-hidden="true" className={className} />;
    case "ironing_packing_workshop":
      return <PackageCheck aria-hidden="true" className={className} />;
    case "sewing_workshop":
      return <Shirt aria-hidden="true" className={className} />;
    default:
      return <Factory aria-hidden="true" className={className} />;
  }
}

function getProductionLineCopy(lineKey: string) {
  const copies: Record<string, { title: string; shortTitle: string }> = {
    cutting_workshop: {
      title: "Kesim Hattı",
      shortTitle: "Kesim",
    },
    ironing_packing_workshop: {
      title: "Ütü / Paket Hattı",
      shortTitle: "Ütü / Paket",
    },
    sewing_workshop: {
      title: "Dikim Hattı",
      shortTitle: "Dikim",
    },
  };

  return copies[lineKey] ?? { title: "Üretim Hattı", shortTitle: "Hat" };
}

function imageStyle(imageUrl: string | undefined): CSSProperties {
  return imageUrl ? { backgroundImage: `url("${imageUrl}")` } : {};
}
