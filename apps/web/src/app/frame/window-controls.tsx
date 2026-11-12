// TJ-ARCH-MOB-001 compliant
// Platform-correct window controls (tauri-custom-titlebar skill): macOS traffic
// lights on the left (close, minimise, zoom), Windows/Linux on the right
// (minimise, maximise/restore, close). Real <button>s with accessible names,
// Flat 2.0 fills: hover is a fill, focus is the `focus` fill (D-6). Traffic-light
// hues reuse the status pip tokens; no hex.
import { cn } from "@know-meet/ui/lib/utils";
import { CopyIcon, MinusIcon, PlusIcon, SquareIcon, XIcon } from "lucide-react";
import type * as React from "react";
import type { WindowControls } from "../../infrastructure/tauri/tauri-window";

interface ControlsProps {
  readonly controls: WindowControls;
  readonly maximized: boolean;
}

const run = (action: () => Promise<void>) => () => {
  action().catch((error: unknown) => reportError(error));
};

function MacLight({
  label,
  tone,
  onClick,
  children,
}: {
  readonly label: string;
  readonly tone: string;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="group/light inline-grid size-size-target-min place-items-center rounded-round outline-none focus-visible:bg-focus!"
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-grid size-3 place-items-center rounded-round text-on-speak [&>svg]:size-2.5 [&>svg]:opacity-0 group-hover/light:[&>svg]:opacity-100 group-focus-visible/light:[&>svg]:opacity-100",
          tone,
        )}
      >
        {children}
      </span>
    </button>
  );
}

export function MacWindowControls({ controls, maximized }: ControlsProps) {
  return (
    <fieldset
      aria-label="Window"
      className="m-0 min-w-0 p-0 flex flex-none items-center gap-s1 px-s2"
    >
      <MacLight label="Close" tone="bg-pip-red" onClick={run(controls.close)}>
        <XIcon strokeWidth={3} />
      </MacLight>
      <MacLight label="Minimize" tone="bg-pip-amber" onClick={run(controls.minimize)}>
        <MinusIcon strokeWidth={3} />
      </MacLight>
      <MacLight
        label={maximized ? "Restore" : "Maximize"}
        tone="bg-pip-green"
        onClick={run(controls.toggleMaximize)}
      >
        <PlusIcon strokeWidth={3} />
      </MacLight>
    </fieldset>
  );
}

const desktopButtonClass =
  "inline-grid h-full w-[46px] place-items-center text-foreground outline-none transition-colors duration-(--dur-fast) ease-standard hover:bg-accent focus-visible:bg-focus! focus-visible:text-on-focus! [&>svg]:size-4";

export function DesktopWindowControls({ controls, maximized }: ControlsProps) {
  return (
    <fieldset aria-label="Window" className="m-0 min-w-0 p-0 flex h-full flex-none items-stretch">
      <button
        type="button"
        aria-label="Minimize"
        onClick={run(controls.minimize)}
        className={desktopButtonClass}
      >
        <MinusIcon aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={maximized ? "Restore" : "Maximize"}
        onClick={run(controls.toggleMaximize)}
        className={desktopButtonClass}
      >
        {maximized ? <CopyIcon aria-hidden="true" /> : <SquareIcon aria-hidden="true" />}
      </button>
      <button
        type="button"
        aria-label="Close"
        onClick={run(controls.close)}
        className={cn(desktopButtonClass, "hover:bg-danger-btn hover:text-on-danger")}
      >
        <XIcon aria-hidden="true" />
      </button>
    </fieldset>
  );
}
