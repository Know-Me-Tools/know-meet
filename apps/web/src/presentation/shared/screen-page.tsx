// TJ-ARCH-MOB-001 compliant
// km.css `.page` (and `.page-narrow`): the page column inside `main#main` (the
// frame owns <main>). One shrinkable column (RV-21 rule 1): `min-w-0` and no
// fixed widths, so wide tables scroll inside their own region, never the page.
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";

const pageClass =
  "mx-auto grid w-full min-w-0 max-w-page-max grid-cols-[minmax(0,1fr)] content-start px-s5 pt-s6 pb-s8 max-bp768:px-s4 max-bp768:pt-s5 max-bp768:pb-s7";

/** The page column of a framed screen. `measure="narrow"` is km.css `.page-narrow` (760px). */
export function ScreenPage({
  className,
  measure = "page",
  ...props
}: React.ComponentProps<"div"> & { readonly measure?: "page" | "narrow" }) {
  return (
    <div
      data-slot="screen-page"
      className={cn(pageClass, measure === "narrow" && "max-w-[760px]", className)}
      {...props}
    />
  );
}
