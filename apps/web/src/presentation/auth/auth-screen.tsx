// TJ-ARCH-MOB-001 compliant
// /auth (c10 10.2, decision D-1: the whole auth.html flow). Five hash states from
// route-inventory.json / app-state-map.json: #sign-in (default), #sign-in-error,
// #sign-up, #check-email and #magic-link-sent. Each view is keyed by its state so
// field state resets on every transition, and each sets the document title.

import type { SessionUserView } from "../shared/session";
import { useDocumentTitle } from "../shared/use-document-title";
import { useHashRoute } from "../shared/use-hash-route";
import { type AuthView, authParams } from "./auth-params";
import { CheckEmailView, MagicLinkView } from "./inbox-views";
import { SignInView } from "./sign-in-view";
import { SignUpView } from "./sign-up-view";

const TITLES: Readonly<Record<AuthView, string>> = {
  "sign-in": "Sign in",
  "sign-in-error": "Sign-in problem",
  "sign-up": "Create account",
  "check-email": "Check your email",
  "magic-link-sent": "Sign-in link sent",
};

function toView(view: string): AuthView {
  return view in TITLES ? (view as AuthView) : "sign-in";
}

interface AuthScreenProps {
  /** The static km-auth user, if any (sign-in shows "already signed in"). */
  readonly user: SessionUserView | null;
  readonly onSignOut: () => void;
}

export function AuthScreen({ user, onSignOut }: AuthScreenProps) {
  const route = useHashRoute();
  const view = toView(route.view);
  const params = authParams(route.params);
  useDocumentTitle(`${TITLES[view]} — Know Meet`);
  switch (view) {
    case "sign-up":
      return <SignUpView key={view} params={params} />;
    case "check-email":
      return <CheckEmailView key={view} params={params} />;
    case "magic-link-sent":
      return <MagicLinkView key={view} params={params} />;
    default:
      return (
        <SignInView
          key={view}
          params={params}
          isError={view === "sign-in-error"}
          user={user}
          onSignOut={onSignOut}
        />
      );
  }
}
