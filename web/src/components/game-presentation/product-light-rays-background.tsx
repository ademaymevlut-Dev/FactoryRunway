import { LightRays } from "@/components/effects/light-rays";

const FALLBACK_RAYS_COLOR = "#38bdf8";

export function ProductLightRaysBackground({
  color,
  focalXPercent = 50,
  focalYPercent = 22,
  intensity = 0.18,
  transparentBase = false,
  variant = "legacy",
}: {
  color: string;
  focalXPercent?: number;
  focalYPercent?: number;
  intensity?: number;
  transparentBase?: boolean;
  variant?: "legacy" | "hero";
}) {
  const raysColor = isHexColor(color) ? color : FALLBACK_RAYS_COLOR;

  if (variant === "legacy") {
    return <LegacyProductLightRays raysColor={raysColor} />;
  }

  const safeIntensity = clamp(intensity, 0, 0.24);
  const safeFocalX = clamp(focalXPercent, 10, 90);
  const safeFocalY = clamp(focalYPercent, 0, 65);
  const movingOpacity =
    safeIntensity <= 0 ? 0 : clamp(0.24 + safeIntensity / 2, 0.28, 0.36);
  const staticLightScale =
    safeIntensity <= 0 ? 0 : clamp(safeIntensity / 0.18, 0.65, 1.25);
  const staticTopLight = [
    `conic-gradient(from 154deg at ${safeFocalX}% -10%, transparent 0deg, ${rgbaFromHex(raysColor, 0.11 * staticLightScale)} 12deg, transparent 27deg, ${rgbaFromHex(raysColor, 0.07 * staticLightScale)} 41deg, transparent 58deg)`,
    `radial-gradient(ellipse at ${safeFocalX}% ${safeFocalY}%, ${rgbaFromHex(raysColor, 0.12 * staticLightScale)} 0%, transparent 56%)`,
  ].join(", ");

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      data-product-light-rays-background="true"
      data-radiant-intensity={safeIntensity}
      data-rays-focal-x={safeFocalX}
      data-rays-focal-y={safeFocalY}
      data-rays-moving-opacity={movingOpacity}
      data-transparent-base={transparentBase}
    >
      <div
        className="absolute inset-0 mix-blend-screen"
        data-product-top-light="true"
        style={{ background: staticTopLight }}
      />
      {movingOpacity > 0 ? (
        <div
          className="absolute inset-0 mix-blend-screen motion-reduce:hidden"
          style={{ opacity: movingOpacity }}
        >
          <LightRays
            className="absolute inset-0"
            distortion={0.025}
            fadeDistance={1.12}
            lightSpread={0.68}
            noiseAmount={0.008}
            pulsating={false}
            rayLength={1.82}
            raysColor={raysColor}
            raysOrigin="top-center"
            raysSpeed={0.32}
            saturation={0.72}
            showFallback={false}
          />
        </div>
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,transparent_62%,rgba(0,0,0,0.3)_100%)]" />
    </div>
  );
}

function LegacyProductLightRays({ raysColor }: { raysColor: string }) {
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

function clamp(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum;

  return Math.min(maximum, Math.max(minimum, value));
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
