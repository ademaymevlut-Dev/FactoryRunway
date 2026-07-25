import type { LandingContent } from "../../content/types";
import { orderAcceptanceSceneData } from "../scenes/order-acceptance/order-acceptance-scene-data";
import { OrderAcceptanceScene } from "../scenes/order-acceptance/order-acceptance-scene";

type LandingOrderAcceptanceSectionProps = {
  content: LandingContent;
};

export function LandingOrderAcceptanceSection({
  content,
}: LandingOrderAcceptanceSectionProps) {
  return (
    <div className="scroll-mt-52 sm:scroll-mt-40 lg:scroll-mt-24" id="orders">
      <OrderAcceptanceScene
        copy={content.showcase.orderAcceptance}
        data={orderAcceptanceSceneData}
        locale={content.locale}
        numberLocale={content.numberLocale}
      />
    </div>
  );
}
