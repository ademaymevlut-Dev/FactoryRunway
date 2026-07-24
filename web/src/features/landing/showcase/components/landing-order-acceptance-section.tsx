import { orderAcceptanceSceneCopyTr } from "../scenes/order-acceptance/order-acceptance-scene-copy";
import { orderAcceptanceSceneData } from "../scenes/order-acceptance/order-acceptance-scene-data";
import { OrderAcceptanceScene } from "../scenes/order-acceptance/order-acceptance-scene";

export function LandingOrderAcceptanceSection() {
  return (
    <OrderAcceptanceScene
      copy={orderAcceptanceSceneCopyTr}
      data={orderAcceptanceSceneData}
      locale="tr"
      numberLocale="tr-TR"
    />
  );
}
