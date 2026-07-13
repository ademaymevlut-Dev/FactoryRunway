"use client";

type ArtCardProps = {
  gradientFrom: string;
  gradientTo: string;
  primaryColor: string;
  secondaryColor: string;
  svgIconAccentColor: string;
};

export function ArtCard({
  gradientFrom,
  gradientTo,
  primaryColor,
  secondaryColor,
  svgIconAccentColor,
}: ArtCardProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 isolate overflow-hidden"
      style={{
        background: `linear-gradient(to top left, ${gradientFrom} 0%, ${gradientTo} 100%)`,
      }}
    >
      {/* LEFT TOP */}
      <div
        className="
          absolute
          left-[-16%] top-[-14%]
          h-[68%] w-[24%]
          rotate-24
          rounded-[4%]
          shadow-[0_18px_44px_rgba(0,0,0,0.28)]
        "
        style={{
          background: colorToTopLeftGradient(secondaryColor),
        }}
      />

      {/* LEFT BOTTOM */}
      <div
        className="
          absolute
          bottom-[-7%] left-[-10%]
          h-[38%] w-[14%]
          rotate-[-24deg]
          rounded-[4%]
          shadow-[0_18px_44px_rgba(0,0,0,0.22)]
        "
        style={{
          background: colorToTopLeftGradient(svgIconAccentColor),
        }}
      />

      {/* RIGHT TOP */}
      <div
        className="
          absolute
          right-[-15%] top-[-14%]
          h-[34%] w-[62%]
          rotate-22
          rounded-[6%]
          shadow-[0_20px_48px_rgba(0,0,0,0.26)]
        "
        style={{
          background: colorToTopLeftGradient(secondaryColor),
        }}
      />

      {/* RIGHT BOTTOM */}
      <div
        className="
          absolute
          bottom-[-5%] right-[-22%]
          h-[76%] w-[70%]
          rotate-22
          rounded-[10%]
          shadow-[0_24px_60px_rgba(0,0,0,0.32)]
        "
        style={{
          background: colorToTopLeftGradient(primaryColor),
        }}
      />
    </div>
  );
}

function colorToTopLeftGradient(hex: string) {
  return `linear-gradient(to top left, ${rgbaFromHex(hex, 0)} 0%, ${rgbaFromHex(hex, 1)} 100%)`;
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "").trim();
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : clean.padEnd(6, "0").slice(0, 6);
  const value = Number.parseInt(normalized || "ffffff", 16);

  return {
    b: value & 255,
    g: (value >> 8) & 255,
    r: (value >> 16) & 255,
  };
}

function rgbaFromHex(hex: string, alpha: number) {
  const { b, g, r } = hexToRgb(hex);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
