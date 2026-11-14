// TJ-ARCH-MOB-001 compliant
// agents.html `notFound`: an unknown agent or dot id renders an empty state with a
// way back, never a blank page.
import { buttonVariants } from "@know-meet/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@know-meet/ui/components/empty";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useDocumentTitle } from "../../shared/use-document-title";
import { AgentsPageHead } from "./agents-ui";

export function AgentsNotFound({
  title,
  message,
}: {
  readonly title: string;
  readonly message: string;
}) {
  useDocumentTitle(`${title} — Know Meet`);
  return (
    <>
      <AgentsPageHead
        eyebrow="Agents"
        title={title}
        crumbs={[{ label: "Agents", to: "registry" }, { label: "Not found" }]}
      />
      <section aria-label="Not found">
        <Empty>
          <EmptyMedia variant="icon">
            <KmIcon name="search" />
          </EmptyMedia>
          <EmptyTitle render={(headingProps) => <h2 {...headingProps} />}>Nothing here</EmptyTitle>
          <EmptyDescription>{message}</EmptyDescription>
          <EmptyContent>
            <Link to="/agents" hash="registry" className={cn(buttonVariants(), focusFillClass)}>
              <KmIcon name="agent-add" />
              <span>Back to agents</span>
            </Link>
          </EmptyContent>
        </Empty>
      </section>
    </>
  );
}
