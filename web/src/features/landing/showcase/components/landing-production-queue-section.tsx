import { productionQueueSceneCopyTr } from "../scenes/production-queue/production-queue-scene-copy";
import { productionQueueSceneData } from "../scenes/production-queue/production-queue-scene-data";
import { ProductionQueueScene } from "../scenes/production-queue/production-queue-scene";

export function LandingProductionQueueSection() {
  return (
    <ProductionQueueScene
      copy={productionQueueSceneCopyTr}
      data={productionQueueSceneData}
      locale="tr"
      numberLocale="tr-TR"
    />
  );
}
