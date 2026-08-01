import type { CSSProperties } from "react";

import { ProductLightRaysBackground } from "./product-light-rays-background";
import type { ProductHeroPalette } from "./product-hero-palette";
import type { ResolvedProductPresentationConfig } from "./product-presentation-config";

export function ProductHeroAtmosphere({
  palette,
  presentation,
}: {
  palette: ProductHeroPalette;
  presentation: ResolvedProductPresentationConfig;
}) {
  const lightScale = clamp(presentation.lightIntensity / 0.18, 0.72, 1.2);

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        data-hero-layer="base"
        style={{
          background: `linear-gradient(145deg, ${palette.baseFrom} 0%, #080B11 48%, ${palette.baseTo} 100%)`,
        }}
      />
      <ProductHeroSoftBlobs palette={palette} />
      <ProductLightRaysBackground
        color={palette.rayColor}
        focalXPercent={presentation.lightXPercent}
        focalYPercent={presentation.lightYPercent}
        intensity={presentation.lightIntensity}
        transparentBase
        variant="hero"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[8%] left-1/2 z-20 h-[14%] w-[46%] -translate-x-1/2 rounded-[50%] blur-2xl"
        data-hero-layer="base-glow"
        style={{
          background: `radial-gradient(ellipse, ${palette.baseGlow} 0%, transparent 70%)`,
          opacity: lightScale,
        }}
      />
    </>
  );
}

function ProductHeroSoftBlobs({ palette }: { palette: ProductHeroPalette }) {
  const blobStyle = {
    "--product-hero-primary-glow": palette.primaryGlow,
    "--product-hero-secondary-glow": palette.secondaryGlow,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className="product-hero-ambient-drift pointer-events-none absolute inset-0 z-10 overflow-hidden"
      data-hero-layer="soft-blobs"
      style={blobStyle}
    >
      <div
        className="product-hero-soft-blob product-hero-soft-blob-primary"
        data-product-hero-blob="primary"
      />
      <div
        className="product-hero-soft-blob product-hero-soft-blob-secondary"
        data-product-hero-blob="secondary"
      />
    </div>
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
