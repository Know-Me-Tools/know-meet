// TJ-ARCH-MOB-001 compliant
// km.css `.avatar`: 40px circle (sm 32, lg 64), display-face initials, card
// fill (muted inside a card or list row). `tone` gives the `.avatar-ember` /
// `.avatar-cyan` fills used for the signed-in user and for dots.
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import type * as React from "react";
import { cn } from "#lib/utils";

type AvatarTone = "default" | "ember" | "cyan";

function Avatar({
  className,
  size = "default",
  tone = "default",
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: "default" | "sm" | "lg";
  tone?: AvatarTone;
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      data-tone={tone}
      className={cn(
        "group/avatar relative inline-flex size-10 shrink-0 rounded-round select-none data-[size=lg]:size-16 data-[size=sm]:size-8",
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full rounded-round object-cover", className)}
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-round bg-card font-display text-15 leading-none font-semibold text-foreground uppercase in-data-[slot=card]:bg-muted in-data-[slot=item]:bg-muted group-data-[size=lg]/avatar:text-22 group-data-[size=sm]/avatar:text-xs",
        "group-data-[tone=ember]/avatar:bg-ember-soft! group-data-[tone=ember]/avatar:text-ember-text group-data-[tone=cyan]/avatar:bg-cyan-soft! group-data-[tone=cyan]/avatar:text-cyan-text",
        className,
      )}
      {...props}
    />
  );
}

/** Presence or role marker on the avatar edge (Flat 2.0: no cut-out ring). */
function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-(--z-raised) inline-flex items-center justify-center rounded-round bg-primary text-primary-foreground select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3.5 group-data-[size=lg]/avatar:[&>svg]:size-2.5",
        className,
      )}
      {...props}
    />
  );
}

/** km.css `.avatar-stack` under D-6: avatars sit 4px apart with no overlap or ring. */
function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group inline-flex gap-s1 *:data-[slot=avatar]:rounded-round",
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroupCount({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center rounded-round bg-muted font-mono text-xs font-semibold text-muted-foreground group-has-data-[size=lg]/avatar-group:size-16 group-has-data-[size=sm]/avatar-group:size-8 [&>svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage };
