// TJ-ARCH-MOB-001 compliant
// auth.html `passwordControl`: a password input with a 44px show/hide toggle
// inside its end edge. The toggle is a pressed-state button (`aria-pressed`,
// selected fill) that names the action it will take and controls the input.
import { Button } from "@know-meet/ui/components/button";
import { Input } from "@know-meet/ui/components/input";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";
import { useState } from "react";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  readonly id: string;
};

export function PasswordInput({ id, className, ...props }: PasswordInputProps) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        name={id}
        type={shown ? "text" : "password"}
        required
        aria-required="true"
        className={cn("pr-14", className)}
        {...props}
      />
      <Button
        variant="ghost"
        size="icon"
        type="button"
        aria-pressed={shown}
        aria-controls={id}
        aria-label={shown ? "Hide password" : "Show password"}
        onClick={() => setShown((value) => !value)}
        className="absolute top-0.5 right-0.5"
      >
        <KmIcon name={shown ? "eye-off" : "eye"} />
      </Button>
    </div>
  );
}
