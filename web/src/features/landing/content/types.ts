import type { AuthMessageCode } from "@/lib/auth/public-auth-state";

import type { OrderAcceptanceSceneCopy } from "../showcase/scenes/order-acceptance/order-acceptance-scene-types";
import type { ProductionQueueSceneCopy } from "../showcase/scenes/production-queue/production-queue-scene-types";
import type { ShiftSimulationSceneCopy } from "../showcase/scenes/shift-simulation/shift-simulation-scene-types";

export type LandingLocale = "en" | "tr";

export type GameLoopStepKey = "orders" | "planning" | "results" | "shift";

export type LandingContent = {
  accessibility: {
    skipToContent: string;
  };
  auth: {
    accountCardDescription: string;
    accountCardEyebrow: string;
    accountCardTitle: string;
    description: string;
    emailLabel: string;
    emailPlaceholder: string;
    emailDivider: string;
    eyebrow: string;
    googleButton: string;
    loginButton: string;
    loginTab: string;
    messages: Record<AuthMessageCode, string>;
    nameLabel: string;
    namePlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    playerOnlyNotice: string;
    registerButton: string;
    registerTab: string;
    tabsAriaLabel: string;
    title: string;
  };
  footer: {
    copyright: string;
    description: string;
    languageLabel: string;
  };
  gameLoop: {
    description: string;
    eyebrow: string;
    steps: ReadonlyArray<{
      description: string;
      key: GameLoopStepKey;
      number: string;
      title: string;
    }>;
    title: string;
  };
  hero: {
    description: string;
    eyebrow: string;
    primaryCta: string;
    secondaryCta: string;
    title: string;
  };
  locale: LandingLocale;
  metadata: {
    description: string;
    openGraphLocale: "en_US" | "tr_TR";
    title: string;
  };
  navigation: {
    ariaLabel: string;
    gameplay: string;
    howItWorks: string;
    languageLabel: string;
    login: string;
    register: string;
  };
  numberLocale: "en-US" | "tr-TR";
  showcase: {
    orderAcceptance: OrderAcceptanceSceneCopy;
    productionQueue: ProductionQueueSceneCopy;
    shiftSimulation: ShiftSimulationSceneCopy;
  };
};
