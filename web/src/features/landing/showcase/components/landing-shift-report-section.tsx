import type { LandingContent } from "../../content/types";
import { ShowcaseStageFrame } from "./showcase-stage-frame";
import { shiftSimulationSceneData } from "../scenes/shift-simulation/shift-simulation-scene-data";
import { createShiftSimulationSceneModel } from "../scenes/shift-simulation/shift-simulation-scene-model";
import { ShiftSimulationSummary } from "../scenes/shift-simulation/shift-simulation-summary";

type LandingShiftReportSectionProps = {
  content: LandingContent;
};

export function LandingShiftReportSection({
  content,
}: LandingShiftReportSectionProps) {
  const copy = content.showcase.shiftSimulation;
  const model = createShiftSimulationSceneModel(
    shiftSimulationSceneData,
    content.locale,
    copy,
  );

  return (
    <ShowcaseStageFrame
      description={copy.summaryDescription}
      eyebrow={copy.finishedGoodsLabel}
      id="report"
      title={copy.summaryTitle}
    >
      <div className="p-3 sm:p-4" data-shift-report>
        <ShiftSimulationSummary
          copy={copy}
          highlighted={false}
          isOpen
          model={model}
          numberLocale={content.numberLocale}
          sceneId="landing-shift-report"
          showHeader={false}
        />
      </div>
    </ShowcaseStageFrame>
  );
}
