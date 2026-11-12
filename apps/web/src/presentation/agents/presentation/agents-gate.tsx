// TJ-ARCH-MOB-001 compliant
// Signed-out state of the account-only agent views (agents.html `gated`): the page
// head, then the shared gate card with the agents-specific reason and the extra
// "Joining as a guest?" line pointing at the public Concierge page.
import { Link } from "@tanstack/react-router";
import { SignInGate } from "../../shared/sign-in-gate";
import { useDocumentTitle } from "../../shared/use-document-title";
import { AgentsPageHead } from "./agents-ui";

const REASON =
  "Registering LiveKit agents and using dots is optional, and it needs a KnowMe account so your agents, permissions and memory stay yours. Guests still get the Concierge in every meeting.";

export function AgentsGate({ title, next }: { readonly title: string; readonly next: string }) {
  useDocumentTitle(`${title} — Know Meet`);
  return (
    <>
      <AgentsPageHead eyebrow="Agents" title={title} crumbs={[{ label: "Agents", to: "registry" }, { label: title }]} />
      <SignInGate title="Sign in to bring agents into meetings" reason={REASON} next={next}>
        <p className="text-sm">
          Joining as a guest?{" "}
          <Link to="/agents" hash="concierge">
            See what the Concierge does for you
          </Link>
        </p>
      </SignInGate>
    </>
  );
}
