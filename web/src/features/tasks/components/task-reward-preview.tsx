import { Coins, Sparkles, Ticket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { CurrencyCode } from "@/generated/prisma/enums";

import type { TaskRewardView } from "../types";

export function TaskRewardPreview({
  currencyCode,
  reward,
}: {
  currencyCode: CurrencyCode;
  reward: TaskRewardView;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {reward.xp > 0 ? (
        <Badge className="border-violet-400/25 bg-violet-400/10 text-violet-100" variant="outline">
          <Sparkles size={12} />
          {reward.xp} XP
        </Badge>
      ) : null}
      {reward.runwayTokens > 0 ? (
        <Badge className="border-cyan-400/25 bg-cyan-400/10 text-cyan-100" variant="outline">
          <Ticket size={12} />
          {reward.runwayTokens} RT
        </Badge>
      ) : null}
      {reward.cashCents && BigInt(reward.cashCents) > BigInt(0) ? (
        <Badge className="border-emerald-400/25 bg-emerald-400/10 text-emerald-100" variant="outline">
          <Coins size={12} />
          {formatCash(reward.cashCents, currencyCode)}
        </Badge>
      ) : null}
    </div>
  );
}

function formatCash(cents: string, currencyCode: CurrencyCode) {
  return new Intl.NumberFormat("tr-TR", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(cents) / 100);
}
