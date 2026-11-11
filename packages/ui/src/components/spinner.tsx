// TJ-ARCH-MOB-001 compliant
// The prototype's busy indicator (auth/join `.spin`, settings refresh spin):
// a 16px current-colour spinner at --anim-spin-fast; stops under reduced motion.
import { Loader2Icon } from "lucide-react";
import type * as React from "react";
import { cn } from "#lib/utils";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin [animation-duration:var(--anim-spin-fast)]", className)}
      {...props}
    />
  );
}

export { Spinner };
