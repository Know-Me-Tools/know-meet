// TJ-ARCH-MOB-001 compliant
// DESIGN.md rule RV-21 (wide tables in their own scroller) and RV-23 (focusable
// regions). km.css `.table-wrap` + km.js `markScrollRegions`: the wrapper scrolls
// inside its own box (`position: relative` so `.sr-only` header labels scroll with
// it). While the table overflows, the wrapper becomes a named, keyboard-scrollable
// region (`role="region"`, aria-label "<caption>, scrollable", `tabIndex=0`); its
// focus is the whole-region `focus` fill with every inner fill dropped and all
// content `on-focus`, never an outline. When it fits, it is a plain wrapper again,
// so it never adds a useless tab stop.
import * as React from "react";
import { cn } from "#lib/utils";

/** km.css `.table`: header row `bg-2`, body rows alternate transparent and `surface`, no rules. */
const tableClass =
  "w-full border-collapse text-sm [&_th]:px-s4 [&_th]:py-s3 [&_th]:text-left [&_th]:align-middle [&_td]:px-s4 [&_td]:py-s3 [&_td]:text-left [&_td]:align-middle [&_thead]:bg-bg-2 [&_thead_th]:font-mono [&_thead_th]:text-11 [&_thead_th]:font-semibold [&_thead_th]:tracking-table [&_thead_th]:whitespace-nowrap [&_thead_th]:text-muted-foreground [&_thead_th]:uppercase [&_tbody_tr:nth-child(even)>*]:bg-surface [@media(hover:hover)]:[&_tbody_tr:hover>*]:bg-card-hov";

const regionFocusClass =
  "outline-none focus-visible:bg-focus! focus-visible:text-on-focus! focus-visible:**:bg-transparent! focus-visible:**:text-inherit!";

/** Tracks whether the element scrolls horizontally (1px tolerance, as km.js). */
function useOverflowsInline(ref: React.RefObject<HTMLDivElement | null>): boolean {
  const [overflows, setOverflows] = React.useState(false);
  React.useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) return undefined;
    const measure = () => setOverflows(element.scrollWidth > element.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    const table = element.firstElementChild;
    if (table !== null) observer.observe(table);
    return () => observer.disconnect();
  }, [ref]);
  return overflows;
}

interface TableRegionProps extends Omit<React.ComponentProps<"table">, "children"> {
  /** The table caption; it also names the scroll region. */
  readonly caption: string;
  /** Caption presentation; the prototype hides most captions (`sr-only`). */
  readonly captionClassName?: string;
  readonly wrapperClassName?: string;
  readonly children: React.ReactNode;
}

function TableRegion({
  caption,
  captionClassName = "sr-only",
  wrapperClassName,
  className,
  children,
  ...props
}: TableRegionProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const overflows = useOverflowsInline(ref);
  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-label is set under the same condition as role="region"; without overflow the wrapper has neither.
    <div
      ref={ref}
      data-slot="table-region"
      data-scrollable={overflows ? "" : undefined}
      role={overflows ? "region" : undefined}
      aria-label={overflows ? `${caption}, scrollable` : undefined}
      tabIndex={overflows ? 0 : undefined}
      className={cn(
        "relative w-full max-w-full overflow-x-auto rounded-tile transition-colors duration-(--dur-fast)",
        regionFocusClass,
        wrapperClassName,
      )}
    >
      <table data-slot="table" className={cn(tableClass, className)} {...props}>
        <caption
          className={cn("px-s4 py-s3 text-left text-sm text-muted-foreground", captionClassName)}
        >
          {caption}
        </caption>
        {children}
      </table>
    </div>
  );
}

export { TableRegion };
