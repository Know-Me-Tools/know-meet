// TJ-ARCH-MOB-001 compliant
// km.css `.toasts` / `.toast`: a centred stack 32px above the bottom (16px under
// 768px, plus the bottom bar `--km-bottom-bar-h` when the frame shows one), max
// `size-toast-w`; actions focus to the page ground (inverted surface); each toast is inverted (fg fill, bg text), radius, float
// shadow. Base UI stacking and swipe mechanics are kept; timings use the motion
// tokens (--dur in with --ease-out).
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import type * as React from "react";
import { Button } from "#components/button";
import { invertedFocusFillClass, toastFocusFillClass, toastFocusTextClass } from "#lib/focus";
import { cn } from "#lib/utils";

const toast = ToastPrimitive.createToastManager();

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />;
}

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />;
}

/**
 * Base UI focuses the viewport on F6. The viewport is a transparent, full-width container that
 * cannot show focus, so focus moves on to the frontmost toast, which shows the focus fill; with
 * no toast, focus returns where it was (HD-4, web-conferencing-hardening).
 */
function forwardViewportFocus(event: React.FocusEvent<HTMLDivElement>) {
  if (event.target !== event.currentTarget) return;
  const toasts = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-slot="toast"]')];
  const frontmost =
    toasts.find((el) => getComputedStyle(el).getPropertyValue("--toast-index").trim() === "0") ??
    toasts[0];
  if (frontmost !== undefined) {
    frontmost.focus();
    return;
  }
  const previous = event.relatedTarget;
  if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
  else event.currentTarget.blur();
}

/**
 * Base UI's window listener saves the active element as the return target on every F6, so an F6
 * pressed on a toast made the toast its own return target and Tab could not leave (SC 2.1.2).
 * Inside the viewport F6 goes no further, and the first return target stands.
 */
function keepReturnTarget(event: React.KeyboardEvent<HTMLDivElement>) {
  if (event.key !== "F6") return;
  event.preventDefault();
  event.stopPropagation();
}

function ToastViewport({ className, onFocus, onKeyDown, ...props }: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      onFocus={(event) => {
        onFocus?.(event);
        forwardViewportFocus(event);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        keepReturnTarget(event);
      }}
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-s6 z-(--z-toast) mx-auto w-[min(var(--spacing-size-toast-w),calc(100vw-32px))] outline-none max-bp768:bottom-[calc(var(--km-bottom-bar-h,0px)+var(--spacing-s4))]",
        className,
      )}
      {...props}
    />
  );
}

function Toast({ className, ...props }: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      // The prototype's `.toast` is not a Tab stop: its text is announced by the live
      // region and its close or action button keeps its own tab stop. Base UI 1.9 makes
      // the root tabIndex 0, which left a focus stop with no visible change (WC-13,
      // 2026-11-20). -1 still lets Base UI focus it from its F6 shortcut.
      tabIndex={-1}
      className={cn(
        toastFocusFillClass,
        "group/toast pointer-events-auto absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom rounded-base bg-foreground text-background shadow-(--shadow-float) will-change-transform select-none",
        "[--gap:var(--s2)] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:var(--s3)] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
        "h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_var(--dur)_var(--ease-out),opacity_var(--dur)_var(--ease-out),height_var(--dur-fast)_var(--ease-standard)]",
        "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
        "data-expanded:h-(--toast-height) data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
        "data-limited:opacity-0 data-starting-style:[transform:translateY(150%)]",
        "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
        "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        className,
      )}
      {...props}
    />
  );
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        "flex h-full items-center gap-s2 overflow-hidden px-s4 py-s3 transition-opacity duration-(--dur) ease-out data-behind:opacity-0 data-expanded:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("text-sm font-medium text-background", toastFocusTextClass, className)}
      {...props}
    />
  );
}

function ToastDescription({ className, ...props }: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("text-sm font-regular text-background", toastFocusTextClass, className)}
      {...props}
    />
  );
}

function ToastAction({
  className,
  render = <Button variant="ghost" size="sm" />,
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      className={cn(
        toastFocusTextClass,
        "shrink-0 text-background underline underline-offset-[3px] hover:not-disabled:bg-[color-mix(in_srgb,var(--background)_14%,transparent)]",
        invertedFocusFillClass,
        className,
      )}
      {...props}
    />
  );
}

function ToastClose({
  className,
  children,
  render = <Button variant="ghost" size="icon-sm" />,
  ...props
}: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Close toast"
      render={render}
      className={cn(
        toastFocusTextClass,
        "relative shrink-0 text-background after:absolute after:-inset-2 after:content-[''] hover:not-disabled:bg-[color-mix(in_srgb,var(--background)_14%,transparent)]",
        invertedFocusFillClass,
        className,
      )}
      {...props}
    >
      {children ?? <XIcon aria-hidden="true" />}
    </ToastPrimitive.Close>
  );
}

function ToastIcon({ type }: { type: string | undefined }) {
  let icon: React.ReactNode = null;

  if (type === "success") {
    icon = <CircleCheckIcon aria-hidden="true" />;
  }

  if (type === "info") {
    icon = <InfoIcon aria-hidden="true" />;
  }

  if (type === "warning") {
    icon = <TriangleAlertIcon aria-hidden="true" />;
  }

  if (type === "error") {
    icon = <OctagonXIcon className="text-red" aria-hidden="true" />;
  }

  if (type === "loading") {
    icon = (
      <Loader2Icon
        className="animate-spin [animation-duration:var(--anim-spin)]"
        aria-hidden="true"
      />
    );
  }

  if (!icon) {
    return null;
  }

  return (
    <span
      data-slot="toast-icon"
      className="shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5"
    >
      {icon}
    </span>
  );
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((toastItem) => (
    <Toast key={toastItem.id} toast={toastItem}>
      <ToastContent>
        <ToastIcon type={toastItem.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <ToastTitle />
          <ToastDescription />
        </div>
        <ToastAction />
        <ToastClose />
      </ToastContent>
    </Toast>
  ));
}

function Toaster({ children, toastManager = toast, ...props }: ToastPrimitive.Provider.Props) {
  return (
    <ToastProvider toastManager={toastManager} {...props}>
      {children}
      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}

const createToastManager = ToastPrimitive.createToastManager;
const useToastManager = ToastPrimitive.useToastManager;

export {
  createToastManager,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  Toaster,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  toast,
  useToastManager,
};
