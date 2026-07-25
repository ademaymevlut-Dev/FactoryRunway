import type { Metadata } from "next";

import { LandingPage } from "@/features/landing/components/landing-page";
import { landingContent } from "@/features/landing/content/landing-content";
import { createLandingMetadata } from "@/features/landing/metadata";

export const metadata: Metadata = createLandingMetadata(
  landingContent.tr,
  "/",
);

export default function TurkishLandingPage() {
  return <LandingPage content={landingContent.tr} />;
}
