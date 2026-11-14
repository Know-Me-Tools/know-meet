// TJ-ARCH-MOB-001 compliant
import { type ErrorComponentProps, Link } from "@tanstack/react-router";

/** Unmatched paths render at the root, outside every layout, so this owns main#main. */
export function RouteNotFound() {
  return (
    <main id="main" tabIndex={-1} className="km-main px-s5 pt-s6">
      <section aria-labelledby="not-found-heading" className="grid gap-s3">
        <h1 id="not-found-heading">Page not found</h1>
        <Link to="/">Go to the home page</Link>
      </section>
    </main>
  );
}

export function RouteError({ reset }: ErrorComponentProps) {
  return (
    <section role="alert" aria-labelledby="route-error-heading">
      <h1 id="route-error-heading">Something went wrong on this page</h1>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}

export function StartupFailure() {
  return (
    <main id="main">
      <p role="alert">Know Meet could not start. Reload to try again.</p>
    </main>
  );
}
