import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export type ShowcaseReplayButtonProps = {
  disabled?: boolean;
  label: string;
  onReplay: () => void;
};

export function ShowcaseReplayButton({
  disabled = false,
  label,
  onReplay,
}: ShowcaseReplayButtonProps) {
  return (
    <Button
      className="min-h-11 gap-2 border-white/15 bg-white/5 text-foreground hover:bg-white/10"
      data-showcase-replay
      disabled={disabled}
      onClick={onReplay}
      type="button"
      variant="outline"
    >
      <RotateCcw aria-hidden="true" size={15} />
      {label}
    </Button>
  );
}
