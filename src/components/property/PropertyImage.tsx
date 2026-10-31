"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { cx } from "@/lib/cx";
import type { ListingImage } from "@/lib/listings/types";

type PropertyImageProps = {
  image: ListingImage | undefined;
  alt: string;
  sizes: string;
  /** Text shown when there is no photograph, or it failed to load. */
  missingLabel: string;
  preload?: boolean;
  className?: string;
};

/**
 * A listing photograph that fills its (positioned) parent.
 *
 * Bundled photos are optimised by Next and blur up from an inline placeholder. Photos from
 * the Rezido media host are loaded as-is: the backend already serves normalised sizes, and
 * the site cannot know that host at build time. If a photo is missing or fails to load,
 * a quiet paper placeholder keeps the card's layout intact.
 */
export function PropertyImage({ image, alt, sizes, missingLabel, preload, className }: PropertyImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!image || failedSrc === image.src) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-muted text-ink-muted">
        <ImageOff aria-hidden="true" className="size-6" />
        <span className="text-xs">{missingLabel}</span>
      </div>
    );
  }

  return (
    <Image
      src={image.src}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      unoptimized={image.remote}
      placeholder={image.blurDataURL ? "blur" : "empty"}
      blurDataURL={image.blurDataURL}
      onError={() => setFailedSrc(image.src)}
      className={cx("object-cover", className)}
    />
  );
}
