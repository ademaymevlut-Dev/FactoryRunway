"use client";

import {
  Banknote,
  Boxes,
  ClipboardList,
  FileBarChart,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useGameUiStore } from "../store/game-ui-store";
import type { GamePanelKey } from "../types";

const dockItems: Array<{
  icon: LucideIcon;
  key: GamePanelKey;
  label: string;
}> = [
  { icon: ClipboardList, key: "orders", label: "Siparişler" },
  { icon: Boxes, key: "production", label: "Üretim" },
  { icon: Users, key: "staff", label: "Personel" },
  { icon: Banknote, key: "finance", label: "Finans" },
  { icon: FileBarChart, key: "reports", label: "Raporlar" },
];

export function DockMenu() {
  const { activePanel, closePanel, openPanel } = useGameUiStore();

  return (
    <nav
      aria-label="Oyun menüsü"
      className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-white/10 bg-background/90 p-2 shadow-2xl backdrop-blur">
        {dockItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel?.key === item.key;

          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                <Button
                  aria-label={item.label}
                  data-map-control="true"
                  onClick={() => {
                    if (isActive) {
                      closePanel();
                      return;
                    }

                    openPanel(item.key);
                  }}
                  size="icon-lg"
                  type="button"
                  variant={isActive ? "default" : "secondary"}
                >
                  <Icon size={19} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </nav>
  );
}
