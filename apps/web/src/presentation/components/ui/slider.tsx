import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "cn";

// DESIGN.md slider (tokens v1.3.0, D-6/D-7): track `control` (`size-slider-track-h`),
// range `selected`, thumb `slider-thumb` (`size-slider-thumb`). Focus: the track
// takes `focus`, the range is kept and the thumb turns `on-focus`. No ring.

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max];

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="group/slider-control relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-pill bg-control transition-colors duration-(--dur-fast) select-none group-has-[:focus-visible]/slider-control:bg-focus! data-horizontal:h-size-slider-track-h data-horizontal:w-full data-vertical:h-full data-vertical:w-size-slider-track-h"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-selected select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            // biome-ignore lint/suspicious/noArrayIndexKey: thumb N is bound to value N by position, so the index is the thumb's identity; values reorder but thumbs do not.
            key={index}
            className="relative block size-size-slider-thumb shrink-0 rounded-round bg-slider-thumb shadow-(--switch-thumb-shadow) transition-colors duration-(--dur-fast) select-none after:absolute after:-inset-3 has-[:focus-visible]:bg-on-focus! disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
