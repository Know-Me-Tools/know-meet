"use client";

import { XIcon } from "lucide-react";
import { type PropsWithChildren, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ImageZoomProps = PropsWithChildren<{
  src: string;
  alt?: string;
}>;

export function ImageZoom({ src, alt = "Image preview", children }: ImageZoomProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = overlayRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusables?.[0];
      const last = focusables?.[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: The wrapper takes block previews and implements Enter and Space activation. */}
      <div
        ref={triggerRef}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.click();
          } else if (e.key === " ") {
            e.preventDefault();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " ") e.currentTarget.click();
        }}
        role="button"
        tabIndex={0}
        className="aui-image-zoom-trigger cursor-zoom-in"
        aria-label="Click to zoom image"
      >
        {children}
      </div>
      {isOpen &&
        createPortal(
          <div
            ref={overlayRef}
            data-slot="image-zoom-overlay"
            role="dialog"
            aria-modal="true"
            className="aui-image-zoom-overlay fade-in animate-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 duration-200"
            onClick={(event) => {
              if (event.target instanceof HTMLImageElement) event.stopPropagation();
              handleClose();
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                handleClose();
              }
            }}
            aria-label="Zoomed image"
          >
            <picture className="contents">
              <img
                data-slot="image-zoom-content"
                src={src}
                alt={alt}
                className="aui-image-zoom-content fade-in zoom-in-95 animate-in max-h-[90%] max-w-[90%] cursor-zoom-out object-contain duration-200"
              />
            </picture>
            <button
              ref={closeRef}
              type="button"
              aria-label="Close zoomed image"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="text-muted-foreground hover:text-foreground bg-background/80 absolute end-4 top-4 rounded-md p-2"
            >
              <XIcon className="size-5" />
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
