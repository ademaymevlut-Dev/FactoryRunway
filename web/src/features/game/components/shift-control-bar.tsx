import { Clock3, Play, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { GameSnapshot } from "../types";

export function ShiftControlBar({ snapshot }: { snapshot: GameSnapshot }) {
  return (
    <section className="pointer-events-none absolute bottom-4 right-4 z-30 hidden sm:block">
      <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-white/10 bg-background/90 p-2 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2 px-2">
          <span className="grid size-8 place-items-center rounded-lg border border-amber-400/20 bg-amber-400/10 text-amber-200">
            <Clock3 size={16} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Vardiya
            </p>
            <strong className="text-sm text-white">{snapshot.factory.currentDay}. gün</strong>
          </div>
        </div>
        <Badge className="hidden border-emerald-400/20 bg-emerald-400/10 text-emerald-100 md:inline-flex">
          <Zap size={12} />
          {snapshot.map.totals.productionLineCount} hat hazır
        </Badge>
        <Button disabled size="sm" type="button">
          <Play size={15} />
          Başlat
        </Button>
      </div>
    </section>
  );
}
