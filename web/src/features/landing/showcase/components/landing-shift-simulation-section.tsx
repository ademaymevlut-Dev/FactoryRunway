import type { LandingContent } from "../../content/types";
import { shiftSimulationSceneData } from "../scenes/shift-simulation/shift-simulation-scene-data";
import { ShiftSimulationScene } from "../scenes/shift-simulation/shift-simulation-scene";

type LandingShiftSimulationSectionProps = {
  content: LandingContent;
};

export function LandingShiftSimulationSection({
  content,
}: LandingShiftSimulationSectionProps) {
  return (
    <div className="scroll-mt-24" id="shift">
      <ShiftSimulationScene
        copy={content.showcase.shiftSimulation}
        data={shiftSimulationSceneData}
        locale={content.locale}
        numberLocale={content.numberLocale}
      />
    </div>
  );
}
