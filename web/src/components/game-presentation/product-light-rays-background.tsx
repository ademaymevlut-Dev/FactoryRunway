import { LightRays } from "@/components/effects/light-rays";

const FALLBACK_RAYS_COLOR = "#38bdf8";

export function ProductLightRaysBackground({ color }: { color: string }) {
  const raysColor = isHexColor(color) ? color : FALLBACK_RAYS_COLOR;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      data-product-light-rays-background="true"
      style={{
        background: `linear-gradient(180deg, ${rgbaFromHex(
          raysColor,
          0.07,
        )} 0%, transparent 34%), #0d1118`,
      }}
    >
      <LightRays
        className="absolute inset-0 opacity-100 mix-blend-screen"
        distortion={0.035}
        fadeDistance={1.08}
        lightSpread={0.72}
        noiseAmount={0.012}
        pulsating={false}
        rayLength={1.9}
        raysColor={raysColor}
        raysOrigin="top-center"
        raysSpeed={0.78}
        saturation={0.82}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,transparent_62%,rgba(0,0,0,0.3)_100%)]" />
    </div>
  );
}

function isHexColor(color: string) {
  return /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(color);
}

function rgbaFromHex(hex: string, alpha: number) {
  const clean = hex.slice(1);
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : clean;
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
