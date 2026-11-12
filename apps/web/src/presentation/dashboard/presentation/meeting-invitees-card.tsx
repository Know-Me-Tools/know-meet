// TJ-ARCH-MOB-001 compliant
// dashboard.html `inviteesCard`: invitees with their channels and per-channel
// delivery status, as a wide table in its own named scroll region (RV-21/RV-23).
// A failed SMS to a landline offers "Send email instead".
import { Card, CardHeader } from "@know-meet/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@know-meet/ui/components/empty";
import { TableRegion } from "@know-meet/ui/components/table-region";
import { Link } from "@tanstack/react-router";
import { CHANNEL_LABEL, type DashboardMeeting, isOpenFailure } from "../domain/dashboard";
import { useDashboard } from "./dashboard-context";
import { ChannelChip, ResolvedByEmailChip, StatusChip, smallLinkClass } from "./dashboard-parts";
import { ResendButton, SendEmailInsteadButton } from "./delivery-actions";

function InviteeRows({ meeting }: { readonly meeting: DashboardMeeting }) {
  const { deliveries, workspace } = useDashboard();
  const mine = deliveries.filter((d) => d.meetingId === meeting.id);
  const names = [...new Set([...mine.map((d) => d.name), ...meeting.invitees])];
  if (names.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No invitees</EmptyTitle>
          <EmptyDescription>Add people from Edit.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <TableRegion caption="Invitees and delivery status">
      <thead>
        <tr>
          <th scope="col">Invitee</th>
          <th scope="col">Channels</th>
          <th scope="col">Status</th>
          <th scope="col">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {names.map((name) => {
          const own = mine.filter((d) => d.name === name);
          const person = workspace.people.find((p) => p.name === name);
          const contacts = [
            ...new Set(own.map((d) => d.to).filter((to): to is string => to !== null && to !== "")),
          ];
          if (contacts.length === 0 && person) contacts.push(person.email);
          const failed = own.find(isOpenFailure);
          return (
            <tr key={name}>
              <td>
                <div className="grid min-w-40 gap-0.5 *:block">
                  <strong>{name}</strong>
                  {contacts.map((c) => (
                    <span key={c} className="text-xs text-muted-foreground">
                      {c}
                    </span>
                  ))}
                </div>
              </td>
              <td>
                <div className="flex flex-wrap gap-1.5">
                  {own.length ? (
                    own.map((d) => <ChannelChip key={d.id} channel={d.channel} />)
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {meeting.cancelled ? "Cancellation sent" : "No invite sent"}
                    </span>
                  )}
                </div>
              </td>
              <td>
                <div className="grid gap-1.5">
                  {own.map((d) => (
                    <div key={d.id}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          {CHANNEL_LABEL[d.channel]}
                        </span>
                        {d.resolvedByEmail ? (
                          <ResolvedByEmailChip label="Failed · sent email instead" />
                        ) : (
                          <StatusChip status={d.status} />
                        )}
                      </div>
                      {isOpenFailure(d) ? (
                        <p className="max-w-[34ch] text-xs text-muted-foreground">
                          {d.reason}. Send an email invite instead.
                        </p>
                      ) : null}
                      {d.resentAt ? (
                        <p className="max-w-[34ch] text-xs text-muted-foreground">
                          Resent just now
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </td>
              <td className="w-[1%]">
                <div className="flex flex-wrap justify-end gap-s2">
                  {failed?.landline ? <SendEmailInsteadButton delivery={failed} /> : null}
                  {own.length ? (
                    <ResendButton
                      deliveries={own}
                      name={name}
                      ariaLabel={`Resend invite to ${name}`}
                    />
                  ) : null}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </TableRegion>
  );
}

export function InviteesCard({ meeting }: { readonly meeting: DashboardMeeting }) {
  return (
    <Card role="region" aria-labelledby="inv-title" className="col-span-full">
      <div className="flex flex-wrap items-start justify-between gap-s3">
        <CardHeader className="min-w-0">
          <h2 id="inv-title" className="text-lg">
            Invitees
          </h2>
          <span className="text-sm text-muted-foreground">
            Email, SMS (via Telnyx) and calendar delivery. Invitees never need an account.
          </span>
        </CardHeader>
        <Link to="/dashboard" hash="invites" className={smallLinkClass}>
          All invites
        </Link>
      </div>
      <InviteeRows meeting={meeting} />
    </Card>
  );
}
