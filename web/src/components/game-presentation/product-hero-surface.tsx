import { PackageCheck } from "lucide-react";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ProductHeroAtmosphere } from "./product-hero-atmosphere";
import {
  resolveProductHeroPalette,
  type ProductHeroPaletteSource,
} from "./product-hero-palette";
import {
  resolveProductPresentationConfig,
  type ResolvedProductPresentationConfig,
} from "./product-presentation-config";

export function ProductHeroSurface({
  animateMedia = true,
  className,
  context,
  footer,
  header,
  imagePriority = false,
  imageSizes,
  imageUnavailableLabel,
  imageUrl,
  mediaIdentity,
  name,
  paletteSource,
  productCode,
  productTypeKey,
}: {
  animateMedia?: boolean;
  className?: string;
  context: "admin" | "order";
  footer?: ReactNode;
  header?: ReactNode;
  imagePriority?: boolean;
  imageSizes: string;
  imageUnavailableLabel: string;
  imageUrl: string | null;
  mediaIdentity: string;
  name: string;
  paletteSource: ProductHeroPaletteSource;
  productCode: string;
  productTypeKey: string | null | undefined;
}) {
  const palette = resolveProductHeroPalette(paletteSource);
  const presentation = resolveProductPresentationConfig({
    productCode,
    productTypeKey,
  });
  const surfaceStyle = {
    "--hero-accent": palette.primary,
    borderColor: palette.borderAccent,
  } as CSSProperties;

  return (
    <article
      className={cn(
        "relative isolate h-full min-h-[320px] overflow-hidden rounded-lg border bg-[#090d14] sm:min-h-[380px]",
        className,
      )}
      data-admin-product-hero={context === "admin" ? "true" : undefined}
      data-order-product-hero={context === "order" ? "true" : undefined}
      data-product-hero-surface="true"
      data-product-presentation-family={presentation.family}
      style={surfaceStyle}
    >
      <ProductHeroAtmosphere
        palette={palette}
        presentation={presentation}
      />
      <ProductHeroMedia
        animate={animateMedia}
        imagePriority={imagePriority}
        imageSizes={imageSizes}
        imageUnavailableLabel={imageUnavailableLabel}
        imageUrl={imageUrl}
        key={mediaIdentity}
        name={name}
        presentation={presentation}
      />
      {header}
      {footer}
    </article>
  );
}

export function ProductHeroMedia({
  animate,
  imagePriority,
  imageSizes,
  imageUnavailableLabel,
  imageUrl,
  name,
  presentation,
}: {
  animate: boolean;
  imagePriority: boolean;
  imageSizes: string;
  imageUnavailableLabel: string;
  imageUrl: string | null;
  name: string;
  presentation: ResolvedProductPresentationConfig;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-[7%] bottom-[12%] top-[8%] z-30 overflow-visible",
        animate && "order-product-media-enter",
      )}
      data-hero-layer="media"
    >
      {imageUrl ? (
        <Image
          alt={name}
          className="object-contain"
          fill
          priority={imagePriority}
          sizes={imageSizes}
          src={imageUrl}
          style={{
            objectPosition: presentation.objectPosition,
            transform: `translate(${presentation.translateXPercent}%, ${presentation.translateYPercent}%) scale(${presentation.scale})`,
            transformOrigin: "center bottom",
          }}
          unoptimized={imageUrl.startsWith("blob:")}
        />
      ) : (
        <div className="absolute inset-[12%] grid place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.035] text-center text-white/45">
          <span>
            <PackageCheck aria-hidden="true" className="mx-auto" size={52} />
            <span className="mt-2 block text-xs">{imageUnavailableLabel}</span>
          </span>
        </div>
      )}
    </div>
  );
}
