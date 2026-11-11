/** shadcn Card (copied pattern) on Know Meet Flat 2.0 surfaces: regions separate by fill, not borders. */
import type { HTMLAttributes } from "react";
import { cn } from "./cn.ts";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card" className={cn("flex flex-col gap-3 rounded-lg bg-card p-4 text-fg", className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-header" className={cn("flex items-center justify-between gap-2", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-title" className={cn("font-display text-15 font-semibold", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-content" className={cn("text-sm text-fg-sub", className)} {...props} />;
}
