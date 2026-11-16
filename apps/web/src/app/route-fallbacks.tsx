// TJ-ARCH-MOB-001 compliant
import { type ErrorComponentProps, Link } from "@tanstack/react-router";
import { HOSTED_BUILD } from "./build-mode";

/**
 * Unmatched paths render at the root, outside every layout, so this owns main#main.
 * The hosted build says what the site does have (docs/design/web-release-acceptance.md
 * 7.3); the default build keeps its wording. The test id is the same in both.
 */
export function RouteNotFound() {
  return (
    <main id="main" tabIndex={-1} className="km-main px-s5 pt-s6">
      <section
        data-testid="km-not-found"
        aria-labelledby="not-found-heading"
        className="grid gap-s3"
      >
        <h1 id="not-found-heading">
          {HOSTED_BUILD ? "This page isn’t available" : "Page not found"}
        </h1>
        {HOSTED_BUILD ? <p>This site has the home page and meetings only.</p> : null}
        <Link to="/">{HOSTED_BUILD ? "Home" : "Go to the home page"}</Link>
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
