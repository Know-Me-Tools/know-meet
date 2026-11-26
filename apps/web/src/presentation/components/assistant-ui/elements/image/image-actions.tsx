"use client";

import type { ImageMessagePart } from "@assistant-ui/react";
import { cn } from "@know-meet/ui/lib/utils";
import { CopyIcon, DownloadIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";

const extensionForMimeType = (mimeType?: string): string => {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    default:
      return "png";
  }
};

const dataUriToBlob = (dataUri: string): Blob | null => {
  const commaIndex = dataUri.indexOf(",");
  const meta = commaIndex >= 0 ? dataUri.slice(0, commaIndex) : dataUri;
  const data = commaIndex >= 0 ? dataUri.slice(commaIndex + 1) : "";
  const mime = meta.match(/data:([^;]+)/i)?.[1]?.toLowerCase() ?? "application/octet-stream";
  if (!/;base64/i.test(meta)) {
    const parts: BlobPart[] = [];
    let last = 0;
    for (const match of data.matchAll(/(?:%[\da-f]{2})+/gi)) {
      if (match.index > last) parts.push(data.slice(last, match.index));
      const run = match[0];
      const escaped = new Uint8Array(run.length / 3);
      for (let index = 0; index < escaped.length; index++) {
        escaped[index] = Number.parseInt(run.slice(index * 3 + 1, index * 3 + 3), 16);
      }
      parts.push(escaped);
      last = match.index + run.length;
    }
    parts.push(data.slice(last));
    return new Blob(parts, { type: mime });
  }
  let bytes: string;
  try {
    const base64 = data.replace(/%([\da-f]{2})/gi, (_match, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
    bytes = atob(base64);
  } catch {
    return null;
  }
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
};

const mimeFromImage = (image: string): string | undefined =>
  image.match(/^data:([^;,]+)/i)?.[1]?.toLowerCase();

const defaultFilenameFromImage = (image: string): string => {
  const mime = mimeFromImage(image);
  if (mime) return `image.${extensionForMimeType(mime)}`;
  try {
    const path = new URL(image, document.baseURI).pathname;
    const encodedBasename = path.split("/").pop() ?? "";
    let basename = encodedBasename;
    try {
      basename = decodeURIComponent(encodedBasename);
    } catch {}
    if (/\.(png|jpe?g|webp|gif|svg)$/i.test(basename)) return basename;
  } catch {}
  return "image.png";
};

const safeImageDownloadHref = (image: string): string | null => {
  try {
    const url = new URL(image, document.baseURI);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "blob:"
      ? image
      : null;
  } catch {
    return null;
  }
};

const downloadImagePart = (part: Pick<ImageMessagePart, "image" | "filename">): void => {
  if (typeof document === "undefined") return;
  const filename = part.filename ?? defaultFilenameFromImage(part.image);
  const isDataUri = /^data:/i.test(part.image);
  const blob = isDataUri ? dataUriToBlob(part.image) : null;
  if (isDataUri && !blob) return;
  const objectUrl = blob ? URL.createObjectURL(blob) : null;
  const href = objectUrl ?? safeImageDownloadHref(part.image);
  if (!href) return;
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 40_000);
};

const copyImagePart = async (part: Pick<ImageMessagePart, "image">): Promise<void> => {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    typeof ClipboardItem === "undefined"
  ) {
    throw new Error("Clipboard API is not available in this environment.");
  }
  const blob = /^data:/i.test(part.image)
    ? dataUriToBlob(part.image)
    : await fetch(part.image).then((r) => r.blob());
  if (!blob) return;
  const mime = mimeFromImage(part.image) ?? blob.type ?? "image/png";
  await navigator.clipboard.write([new ClipboardItem({ [mime]: blob })]);
};

export type ImageActionsProps = {
  part: ImageMessagePart;
  /**
   * Wire to your own generation call to show a regenerate button. The button
   * renders only when this is set and the part carries a `prompt`.
   */
  onRegenerate?: () => void | Promise<void>;
  className?: string;
};

function RegenerateButton({ onRegenerate }: { onRegenerate: () => void | Promise<void> }) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        setIsRegenerating(true);
        try {
          await onRegenerate();
        } catch {
        } finally {
          setIsRegenerating(false);
        }
      }}
      disabled={isRegenerating}
      data-slot="image-regenerate"
      aria-label="Regenerate image"
      className="hover:bg-muted inline-flex size-7 items-center justify-center rounded disabled:opacity-50"
    >
      <RefreshCwIcon className={cn("size-4", isRegenerating && "animate-spin")} />
    </button>
  );
}

export function ImageActions({ part, onRegenerate, className }: ImageActionsProps) {
  return (
    <div data-slot="image-actions" className={cn("flex items-center gap-1 p-1", className)}>
      <button
        type="button"
        onClick={() => downloadImagePart(part)}
        data-slot="image-download"
        aria-label="Download image"
        className="hover:bg-muted inline-flex size-7 items-center justify-center rounded"
      >
        <DownloadIcon className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => {
          copyImagePart(part).catch(() => {});
        }}
        data-slot="image-copy"
        aria-label="Copy image"
        className="hover:bg-muted inline-flex size-7 items-center justify-center rounded"
      >
        <CopyIcon className="size-4" />
      </button>
      {onRegenerate && <RegenerateButton onRegenerate={onRegenerate} />}
    </div>
  );
}
