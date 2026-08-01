export type ProductHeroPaletteSource = {
  readonly cardGradientFrom?: string | null;
  readonly cardGradientTo?: string | null;
  readonly cardPrimaryColor?: string | null;
  readonly cardSecondaryColor?: string | null;
  readonly cardSvgIconAccentColor?: string | null;
};

export type ProductHeroPalette = {
  primary: string;
  secondary: string;
  accent: string;
  rayColor: string;
  primaryGlow: string;
  secondaryGlow: string;
  baseFrom: string;
  baseTo: string;
  baseGlow: string;
  borderAccent: string;
};

type HslColor = {
  h: number;
  l: number;
  s: number;
};

type RgbColor = {
  b: number;
  g: number;
  r: number;
};

const HEX_COLOR_PATTERN = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;
const FALLBACK_PRIMARY = "#38BDF8";
const FALLBACK_SECONDARY = "#38BDF8";
const FALLBACK_GRADIENT_FROM = "#111827";
const FALLBACK_GRADIENT_TO = "#05070B";
const FALLBACK_ACCENT = "#4A304E";

export function resolveProductHeroPalette(
  source: ProductHeroPaletteSource,
): ProductHeroPalette {
  const primarySource = normalizeProductHeroHex(
    source.cardPrimaryColor,
    FALLBACK_PRIMARY,
  );
  const secondarySource = normalizeProductHeroHex(
    source.cardSecondaryColor,
    FALLBACK_SECONDARY,
  );
  const gradientFrom = normalizeProductHeroHex(
    source.cardGradientFrom,
    FALLBACK_GRADIENT_FROM,
  );
  const gradientTo = normalizeProductHeroHex(
    source.cardGradientTo,
    FALLBACK_GRADIENT_TO,
  );
  const accentSource = normalizeProductHeroHex(
    source.cardSvgIconAccentColor,
    FALLBACK_ACCENT,
  );
  const primary = normalizeAtmosphereColor(primarySource, {
    maximumLightness: 62,
    maximumSaturation: 76,
    minimumLightness: 42,
  });
  const secondary = normalizeAtmosphereColor(secondarySource, {
    maximumLightness: 66,
    maximumSaturation: 72,
    minimumLightness: 46,
  });
  const accent = normalizeAtmosphereColor(accentSource, {
    maximumLightness: 58,
    maximumSaturation: 68,
    minimumLightness: 38,
  });
  const rayColor = normalizeAtmosphereColor(secondarySource, {
    maximumLightness: 70,
    maximumSaturation: 70,
    minimumLightness: 58,
  });

  return {
    accent,
    baseFrom: mixHexColors(FALLBACK_GRADIENT_FROM, gradientFrom, 0.12),
    baseGlow: rgbaFromHex(accent, 0.07),
    baseTo: mixHexColors(FALLBACK_GRADIENT_TO, gradientTo, 0.1),
    borderAccent: rgbaFromHex(primary, 0.3),
    primary,
    primaryGlow: rgbaFromHex(primary, 0.18),
    rayColor,
    secondary,
    secondaryGlow: rgbaFromHex(secondary, 0.12),
  };
}

export function normalizeProductHeroHex(
  value: string | null | undefined,
  fallback = FALLBACK_PRIMARY,
) {
  const candidate = value?.trim();

  if (!candidate || !HEX_COLOR_PATTERN.test(candidate)) {
    return normalizeKnownHex(
      HEX_COLOR_PATTERN.test(fallback) ? fallback : FALLBACK_PRIMARY,
    );
  }

  return normalizeKnownHex(candidate);
}

function normalizeKnownHex(value: string) {
  const clean = value.replace("#", "");
  const expanded =
    clean.length === 3
      ? clean
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : clean;

  return `#${expanded.toUpperCase()}`;
}

function normalizeAtmosphereColor(
  hex: string,
  {
    maximumLightness,
    maximumSaturation,
    minimumLightness,
  }: {
    maximumLightness: number;
    maximumSaturation: number;
    minimumLightness: number;
  },
) {
  const hsl = rgbToHsl(hexToRgb(hex));

  return hslToHex({
    h: hsl.h,
    l: clamp(hsl.l, minimumLightness, maximumLightness),
    s: Math.min(hsl.s, maximumSaturation),
  });
}

function hexToRgb(hex: string): RgbColor {
  const value = Number.parseInt(hex.slice(1), 16);

  return {
    b: value & 255,
    g: (value >> 8) & 255,
    r: (value >> 16) & 255,
  };
}

function rgbToHsl({ b, g, r }: RgbColor): HslColor {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  let hue = 0;

  if (delta > 0) {
    if (maximum === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (maximum === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }

    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return {
    h: hue,
    l: lightness * 100,
    s: saturation * 100,
  };
}

function hslToHex({ h, l, s }: HslColor) {
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hueSection = h / 60;
  const secondary = chroma * (1 - Math.abs((hueSection % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSection >= 0 && hueSection < 1) {
    red = chroma;
    green = secondary;
  } else if (hueSection < 2) {
    red = secondary;
    green = chroma;
  } else if (hueSection < 3) {
    green = chroma;
    blue = secondary;
  } else if (hueSection < 4) {
    green = secondary;
    blue = chroma;
  } else if (hueSection < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  const match = lightness - chroma / 2;

  return rgbToHex({
    b: Math.round((blue + match) * 255),
    g: Math.round((green + match) * 255),
    r: Math.round((red + match) * 255),
  });
}

function mixHexColors(base: string, tint: string, tintWeight: number) {
  const baseRgb = hexToRgb(base);
  const tintRgb = hexToRgb(tint);
  const weight = clamp(tintWeight, 0, 1);

  return rgbToHex({
    b: Math.round(baseRgb.b * (1 - weight) + tintRgb.b * weight),
    g: Math.round(baseRgb.g * (1 - weight) + tintRgb.g * weight),
    r: Math.round(baseRgb.r * (1 - weight) + tintRgb.r * weight),
  });
}

function rgbToHex({ b, g, r }: RgbColor) {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function rgbaFromHex(hex: string, alpha: number) {
  const { b, g, r } = hexToRgb(hex);

  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
