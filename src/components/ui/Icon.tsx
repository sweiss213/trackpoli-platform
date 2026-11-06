/* eslint-disable @next/next/no-img-element -- Icon renders small static SVG design assets at a fixed size;
   next/image gives no benefit here (SVGs are not optimized) and would add config and overhead. */
import type { StaticImageData } from "next/image";

// Renders a design-system SVG asset at its exact size. Decorative by default (empty alt); pass alt for a
// meaningful icon. The underlying asset's own colours are preserved (ADR-0006 / figma fidelity).

interface IconProps {
  src: StaticImageData;
  size: number;
  alt?: string;
}

export function Icon({ src, size, alt = "" }: IconProps) {
  return <img src={src.src} width={size} height={size} alt={alt} />;
}
