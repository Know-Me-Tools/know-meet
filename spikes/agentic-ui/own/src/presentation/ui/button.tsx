/** shadcn Button (copied pattern, base-nova shape) themed with Know Meet tokens. */
import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "./cn.ts";

const VARIANTS = {
  default: "bg-ember-btn text-on-ember hover:bg-ember-btn-hov",
  secondary: "bg-card text-fg hover:bg-card-hov",
  ghost: "bg-transparent text-fg hover:bg-card-hov",
  destructive: "bg-danger-btn text-on-danger hover:bg-danger-btn-hov",
} as const;

const SIZES = {
  default: "h-9 px-4 text-sm",
  sm: "h-8 px-3 text-13",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: keyof typeof VARIANTS;
  readonly size?: keyof typeof SIZES;
  readonly ref?: Ref<HTMLButtonElement>;
}

export function Button({ variant = "default", size = "default", className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      data-slot="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
        "disabled:pointer-events-none disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
