import { shiftSimulationSceneCopyTr } from "../scenes/shift-simulation/shift-simulation-scene-copy";
import { shiftSimulationSceneData } from "../scenes/shift-simulation/shift-simulation-scene-data";
import { ShiftSimulationScene } from "../scenes/shift-simulation/shift-simulation-scene";

export function LandingShiftSimulationSection() {
  return (
    <ShiftSimulationScene
      copy={shiftSimulationSceneCopyTr}
      data={shiftSimulationSceneData}
      locale="tr"
      numberLocale="tr-TR"
    />
  );
}
