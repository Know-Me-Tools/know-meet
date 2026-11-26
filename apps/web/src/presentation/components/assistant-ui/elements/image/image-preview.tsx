"use client";

import { cn } from "@know-meet/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { ImageIcon, ImageOffIcon, Loader2Icon, ShieldAlertIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { hostOf, safeHref } from "../../utils/href";

export const imageVariants = cva("aui-image-root relative overflow-hidden rounded-lg", {
  variants: {
    variant: {
      outline: "border-border border",
      ghost: "",
      muted: "bg-muted/50",
    },
    size: {
      sm: "max-w-64",
      default: "max-w-96",
      lg: "max-w-[512px]",
      full: "w-full",
    },
  },
  defaultVariants: {
    variant: "outline",
    size: "default",
  },
});

export type ImageRootProps = React.ComponentProps<"div"> & VariantProps<typeof imageVariants>;

export function ImageRoot({ className, variant, size, children, ...props }: ImageRootProps) {
  return (
    <div
      data-slot="image-root"
      data-variant={variant}
      data-size={size}
      className={cn(imageVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </div>
  );
}

type ImagePreviewProps = Omit<React.ComponentProps<"img">, "children"> & {
  containerClassName?: string | undefined;
  ratio?: "auto" | "1:1" | "4:3" | "16:9" | "9:16" | undefined;
  fit?: "cover" | "contain" | undefined;
};

export function ImagePreview({
  className,
  containerClassName,
  ratio = "auto",
  fit = "contain",
  onLoad,
  onError,
  alt = "Image content",
  src,
  ...props
}: ImagePreviewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | undefined>(undefined);
  const [errorSrc, setErrorSrc] = useState<string | undefined>(undefined);

  const loaded = loadedSrc === src;
  const error = errorSrc === src;
  const fixedRatio = ratio !== "auto";
  const ratioClassName =
    ratio === "1:1"
      ? "aspect-square"
      : ratio === "4:3"
        ? "aspect-[4/3]"
        : ratio === "16:9"
          ? "aspect-video"
          : ratio === "9:16"
            ? "aspect-[9/16]"
            : undefined;

  useEffect(() => {
    const image = imgRef.current;
    if (typeof src !== "string" || !image?.complete) return;
    if (image.naturalWidth > 0) setLoadedSrc(src);
    else setErrorSrc(src);
  }, [src]);

  return (
    <div
      data-slot="image-preview"
      className={cn("relative", fixedRatio ? ratioClassName : "min-h-32", containerClassName)}
    >
      {!loaded && !error && (
        <div
          data-slot="image-preview-loading"
          className="bg-muted/50 absolute inset-0 flex items-center justify-center"
        >
          <ImageIcon className="text-muted-foreground size-8 animate-pulse" />
        </div>
      )}
      {error ? (
        <div
          data-slot="image-preview-error"
          className={cn(
            "bg-muted/50 flex min-h-32 items-center justify-center p-4",
            fixedRatio && "absolute inset-0",
          )}
        >
          <ImageOffIcon className="text-muted-foreground size-8" />
        </div>
      ) : (
        // A picture wrapper marks a deliberate native img for the Next.js lint, because
        // next/image needs per-host config for runtime URLs and only exists in Next.js.
        <picture className="contents">
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            className={cn(
              fixedRatio
                ? cn("block h-full w-full", {
                    "object-cover": fit === "cover",
                    "object-contain": fit === "contain",
                  })
                : "block h-auto w-full object-contain",
              !loaded && "invisible",
              className,
            )}
            onLoad={(e) => {
              if (typeof src === "string") setLoadedSrc(src);
              onLoad?.(e);
            }}
            onError={(e) => {
              if (typeof src === "string") setErrorSrc(src);
              onError?.(e);
            }}
            {...props}
          />
        </picture>
      )}
    </div>
  );
}

export type ImageSourceProps = {
  label?: string | undefined;
  url?: string | undefined;
  iconUrl?: string | undefined;
} & React.ComponentProps<"div">;

export function ImageSource({ className, label, url, iconUrl, ...props }: ImageSourceProps) {
  const href = safeHref(url);
  const host = hostOf(url);
  const displayLabel = label || host;
  const [failedIconUrl, setFailedIconUrl] = useState<string | undefined>();

  if (!displayLabel) return null;

  const showIcon = iconUrl !== undefined && failedIconUrl !== iconUrl;

  return (
    <div
      data-slot="image-source"
      className={cn(
        "text-muted-foreground flex items-center gap-2 border-t px-2 py-1.5 text-xs",
        className,
      )}
      {...props}
    >
      {showIcon ? (
        <picture className="contents">
          <img
            data-slot="image-source-icon"
            src={iconUrl}
            alt=""
            className="size-4 shrink-0 rounded-sm"
            onError={() => setFailedIconUrl(iconUrl)}
          />
        </picture>
      ) : (
        <span
          data-slot="image-source-icon-fallback"
          aria-hidden="true"
          className="bg-muted flex size-4 shrink-0 items-center justify-center rounded-sm text-[10px] font-medium"
        >
          {displayLabel.charAt(0).toUpperCase()}
        </span>
      )}
      {href ? (
        <a
          data-slot="image-source-label"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground truncate"
        >
          {displayLabel}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <span data-slot="image-source-label" className="truncate">
          {displayLabel}
        </span>
      )}
    </div>
  );
}

export function ImageFilename({ className, children, ...props }: React.ComponentProps<"span">) {
  if (!children) return null;

  return (
    <span
      data-slot="image-filename"
      className={cn("text-muted-foreground block truncate px-2 py-1.5 text-xs", className)}
      {...props}
    >
      {children}
    </span>
  );
}

export function ImageGenerating({ className }: { className?: string }) {
  return (
    <div
      data-slot="image-generating"
      className={cn("bg-muted/50 flex min-h-32 items-center justify-center p-4", className)}
    >
      <Loader2Icon className="text-muted-foreground size-8 animate-spin" />
      <span className="sr-only">Generating image…</span>
    </div>
  );
}

export function ImageContentFilterError({
  className,
  reason,
}: {
  className?: string;
  reason?: string;
}) {
  return (
    <div
      data-slot="image-content-filter-error"
      className={cn(
        "bg-muted/50 flex min-h-32 flex-col items-center justify-center gap-2 p-4 text-center",
        className,
      )}
    >
      <ShieldAlertIcon className="text-muted-foreground size-8" />
      <p className="text-sm font-medium">Image could not be generated</p>
      {reason && <p className="text-muted-foreground text-xs">{reason}</p>}
    </div>
  );
}
