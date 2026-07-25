import type { LandingContent } from "../../content/types";
import { productionQueueSceneData } from "../scenes/production-queue/production-queue-scene-data";
import { ProductionQueueScene } from "../scenes/production-queue/production-queue-scene";

type LandingProductionQueueSectionProps = {
  content: LandingContent;
};

export function LandingProductionQueueSection({
  content,
}: LandingProductionQueueSectionProps) {
  return (
    <div className="scroll-mt-24" id="production">
      <ProductionQueueScene
        copy={content.showcase.productionQueue}
        data={productionQueueSceneData}
        locale={content.locale}
        numberLocale={content.numberLocale}
      />
    </div>
  );
}
