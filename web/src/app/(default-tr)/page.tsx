import type { Metadata } from "next";

import { LandingPage } from "@/features/landing/components/landing-page";
import { landingContent } from "@/features/landing/content/landing-content";
import { createLandingMetadata } from "@/features/landing/metadata";

export const metadata: Metadata = createLandingMetadata(
  landingContent.en,
  "/",
);

export default function EnglishIndexLandingPage() {
  return <LandingPage content={landingContent.en} />;
}
