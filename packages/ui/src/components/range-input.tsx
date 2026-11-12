// TJ-ARCH-MOB-001 compliant
// km.css native `input[type="range"]` (DESIGN.md slider, RV-22) as a controlled
// kit input: track `control` (6px, pill), range `selected` up to the value, thumb
// `slider-thumb` (20px). Focus: the whole control box takes the `focus` plate and
// the range and thumb turn `on-focus`, never an outline. The fill position is the
// `--pct` custom property, computed here from value/min/max (km.js `syncRange`).
// Native keyboard support (arrows, Home/End, Page keys) is kept.
import type * as React from "react";
import { cn } from "#lib/utils";

const rangeClass = cn(
  "m-0 h-size-target-min cursor-pointer appearance-none rounded-pill bg-transparent p-0 outline-none transition-colors duration-(--dur-fast) focus-visible:bg-focus!",
  "[&::-webkit-slider-runnable-track]:h-size-slider-track-h [&::-webkit-slider-runnable-track]:rounded-pill [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--selected)_var(--pct),var(--control)_var(--pct))]",
  "[&::-webkit-slider-thumb]:mt-[calc((var(--spacing-size-slider-track-h)-var(--spacing-size-slider-thumb))/2)] [&::-webkit-slider-thumb]:size-size-slider-thumb [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-round [&::-webkit-slider-thumb]:bg-slider-thumb",
  "[&::-moz-range-track]:h-size-slider-track-h [&::-moz-range-track]:rounded-pill [&::-moz-range-track]:bg-control [&::-moz-range-progress]:h-size-slider-track-h [&::-moz-range-progress]:rounded-pill [&::-moz-range-progress]:bg-selected [&::-moz-range-thumb]:size-size-slider-thumb [&::-moz-range-thumb]:rounded-round [&::-moz-range-thumb]:bg-slider-thumb",
  "focus-visible:[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--on-focus)_var(--pct),var(--control)_var(--pct))] focus-visible:[&::-webkit-slider-thumb]:bg-on-focus focus-visible:[&::-moz-range-progress]:bg-on-focus focus-visible:[&::-moz-range-thumb]:bg-on-focus",
);

interface RangeInputProps extends Omit<React.ComponentProps<"input">, "type" | "value" | "min" | "max"> {
  readonly value: number;
  readonly min?: number;
  readonly max: number;
}

function RangeInput({ value, min = 0, max, className, style, ...props }: RangeInputProps) {
  const span = max > min ? max - min : 100;
  const pct = ((Math.min(Math.max(value, min), max) - min) / span) * 100;
  return (
    <input
      type="range"
      data-slot="range-input"
      min={min}
      max={max}
      value={value}
      className={cn(rangeClass, className)}
      style={{ ...style, "--pct": `${pct}%` } as React.CSSProperties}
      {...props}
    />
  );
}

export { RangeInput };
