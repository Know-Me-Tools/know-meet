// TJ-ARCH-MOB-001 compliant
// km.css `.table-wrap` / `.table`: the wrapper scrolls inside its own surface
// (radius-tile); headers are mono uppercase labels; rows separate with a 1px
// muted inset line, the one rule the prototype uses for tabular data. Numeric
// columns: pass `className="text-right tabular-nums"` (km.css `.num`).
import type * as React from "react";
import { cn } from "#lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full max-w-full overflow-x-auto rounded-tile bg-surface shadow-(--shadow-card)"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom border-collapse text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn(className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&>tr+tr>td]:shadow-[inset_0_1px_0_var(--muted)]", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("font-semibold [&>tr>td]:shadow-[inset_0_1px_0_var(--muted)]", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "[&>td]:transition-colors [&>td]:duration-(--dur-fast) hover:[&>td]:bg-accent has-aria-expanded:[&>td]:bg-accent data-[state=selected]:[&>td]:bg-accent",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "px-s4 py-s3 text-left align-middle font-mono text-11 font-semibold tracking-table whitespace-nowrap text-muted-foreground uppercase shadow-[inset_0_-1px_0_var(--muted)] [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-s4 py-s3 text-left align-middle [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("px-s4 py-s3 text-left text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
