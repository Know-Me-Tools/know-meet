/** shadcn Badge (copied pattern) with semantic Know Meet status colours. */
import type { HTMLAttributes } from "react";
import { cn } from "./cn.ts";

const TONES = {
  neutral: "bg-muted text-fg",
  info: "bg-cyan-soft text-cyan-text",
  success: "bg-green-soft text-green-text",
  warning: "bg-amber-soft text-amber-text",
  danger: "bg-red-soft text-red-text",
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { readonly tone?: BadgeTone }) {
  return <span data-slot="badge" className={cn("inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-medium", TONES[tone], className)} {...props} />;
}
