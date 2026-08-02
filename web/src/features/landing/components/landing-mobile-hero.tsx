import type { LandingContent } from "../content/types";

type LandingMobileHeroProps = {
  content: LandingContent;
};

export function LandingMobileHero({ content }: LandingMobileHeroProps) {
  return (
    <section
      aria-labelledby="mobile-hero-title"
      className="landing-mobile-hero md:hidden"
    >
      <h1 id="mobile-hero-title">{content.mobile.heroTitle}</h1>
    </section>
  );
}
