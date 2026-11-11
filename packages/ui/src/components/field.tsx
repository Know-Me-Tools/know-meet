// TJ-ARCH-MOB-001 compliant
// km.css form fields: `.field` (6px stack), `.field label`, `.hint`,
// `.field-error` (fg text with a red alert icon: the icon and the copy carry the
// error, never colour alone). Choice cards (FieldLabel wrapping a Field) separate
// by fill and turn ember-soft when checked (supplementary: the indicator carries
// state); a focused choice card takes the whole `focus` fill (D-6, no outline).
// Forms that compose these should move focus to the first FieldError on a failed
// submit (decision log 16.4, defect F6); that behaviour belongs to the form, not here.
import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlertIcon } from "lucide-react";
import type * as React from "react";
import { useMemo } from "react";
import { Label } from "#components/label";
import { Separator } from "#components/separator";
import { cn } from "#lib/utils";

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        "m-0 flex min-w-0 flex-col gap-s4 p-0 has-[>[data-slot=checkbox-group]]:gap-s3 has-[>[data-slot=radio-group]]:gap-s3",
        className,
      )}
      {...props}
    />
  );
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-1.5 p-0 font-semibold data-[variant=label]:text-sm data-[variant=legend]:font-display data-[variant=legend]:text-lg",
        className,
      )}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "group/field-group @container/field-group flex w-full flex-col gap-s5 data-[slot=checkbox-group]:gap-s3 *:data-[slot=field-group]:gap-s4",
        className,
      )}
      {...props}
    />
  );
}

const fieldVariants = cva("group/field flex w-full gap-1.5", {
  variants: {
    orientation: {
      vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
      horizontal:
        "flex-row items-center gap-s3 has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-0.5",
      responsive:
        "flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:gap-s4 @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto",
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
});

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn("group/field-content flex min-w-0 flex-1 flex-col gap-0.5", className)}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        "group/field-label peer/field-label flex w-fit gap-s2 group-data-[disabled=true]/field:opacity-50",
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-base has-[>[data-slot=field]]:bg-surface has-[>[data-slot=field]]:shadow-(--shadow-card) has-[>[data-slot=field]]:transition-colors has-[>[data-slot=field]]:duration-(--dur-fast) has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-accent has-[>[data-slot=field]]:has-data-checked:bg-ember-soft has-[>[data-slot=field]]:has-[:focus-visible]:bg-focus! has-[>[data-slot=field]]:has-[:focus-visible]:text-on-focus! *:data-[slot=field]:p-s4",
        className,
      )}
      {...props}
    />
  );
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        "flex w-fit items-center gap-s2 text-sm font-semibold group-data-[disabled=true]/field:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

/** km.css `.field .hint`. */
function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "m-0 text-left text-sm leading-body font-regular text-muted-foreground group-has-data-horizontal/field:text-pretty",
        "[&>a]:text-ember-text [&>a]:underline [&>a]:underline-offset-[3px]",
        className,
      )}
      {...props}
    />
  );
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode;
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={children ? true : undefined}
      className={cn("relative -my-2 h-5 text-sm", className)}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children ? (
        <span
          className="relative mx-auto block w-fit bg-background px-s2 text-muted-foreground"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      ) : null}
    </div>
  );
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>;
}) {
  const content = useMemo(() => {
    if (children) {
      return children;
    }
    if (!errors?.length) {
      return null;
    }
    const uniqueErrors = [...new Map(errors.map((error) => [error?.message, error])).values()];
    if (uniqueErrors.length === 1) {
      return uniqueErrors[0]?.message;
    }
    return (
      <ul className="m-0 ml-s4 flex list-disc flex-col gap-1 p-0">
        {uniqueErrors.map((error, index) =>
          error?.message ? <li key={index}>{error.message}</li> : null,
        )}
      </ul>
    );
  }, [children, errors]);

  if (!content) {
    return null;
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn(
        "flex items-start gap-1.5 text-sm font-medium text-foreground [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-red",
        className,
      )}
      {...props}
    >
      <CircleAlertIcon aria-hidden="true" />
      <div className="min-w-0">{content}</div>
    </div>
  );
}

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
};
