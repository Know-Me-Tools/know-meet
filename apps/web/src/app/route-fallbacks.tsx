// TJ-ARCH-MOB-001 compliant
import { type ErrorComponentProps, Link } from "@tanstack/react-router";

/** Placeholder for the home route until c10 builds the designed home screen. */
export function HomePlaceholder() {
  return <h1>Know Meet</h1>;
}

export function RouteNotFound() {
  return (
    <section aria-labelledby="not-found-heading">
      <h1 id="not-found-heading">Page not found</h1>
      <Link to="/">Go to the home page</Link>
    </section>
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
