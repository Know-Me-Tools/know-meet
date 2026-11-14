// TJ-ARCH-MOB-001 compliant
// dashboard.html schedule preview: what recipients will see, by email and by SMS
// via Telnyx. Updates as the form changes; not a live region (it would chatter).
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { PageEyebrow } from "@know-meet/ui/components/page-head";
import type { InvitePreview } from "../application/schedule-form";

export function SchedulePreviewPanel({
  preview,
  from,
}: {
  readonly preview: InvitePreview;
  readonly from: string;
}) {
  return (
    <aside
      aria-labelledby="pv-title"
      className="sticky top-[calc(var(--spacing-header-h)+var(--spacing-s4))] grid gap-s4 max-bp1024:static"
    >
      <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-s4 rounded-lg bg-surface p-s5 shadow-(--shadow-card)">
        <div>
          <h2 id="pv-title" className="text-lg">
            Invite preview
          </h2>
          <span className="text-sm text-muted-foreground">
            What recipients will see. Updates as you type.
          </span>
        </div>
        <div className="grid content-start gap-s2">
          <PageEyebrow className="text-muted-foreground">Email</PageEyebrow>
          <div className="grid gap-s3 rounded-base bg-card p-s4 text-sm">
            <div className="grid gap-0.5 pb-s3 *:block *:[overflow-wrap:anywhere]">
              <span className="text-xs text-muted-foreground">From: {from} via Know Meet</span>
              <span className="text-xs text-muted-foreground">{preview.to}</span>
              <span className="font-display text-base font-semibold text-foreground">
                {preview.subject}
              </span>
            </div>
            <div className="grid gap-s3">
              <p className="[overflow-wrap:anywhere]">{preview.intro}</p>
              <span className="inline-flex items-center gap-1.5 justify-self-start rounded-10 bg-ember-btn px-3.5 py-2 font-semibold text-on-ember">
                <KmIcon name="cam" className="size-4" />
                <span>Join in browser</span>
              </span>
              <dl className="m-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-s3 gap-y-1">
                <dt className="text-muted-foreground">When</dt>
                <dd className="m-0 [overflow-wrap:anywhere]">{preview.when}</dd>
                <dt className="text-muted-foreground">Link</dt>
                <dd className="m-0 font-mono text-13 [overflow-wrap:anywhere]">{preview.link}</dd>
                {preview.dialIn ? (
                  <>
                    <dt className="text-muted-foreground">Dial in</dt>
                    <dd className="m-0 [overflow-wrap:anywhere]">{preview.dialIn}</dd>
                  </>
                ) : null}
                {preview.agents ? (
                  <>
                    <dt className="text-muted-foreground">Agents</dt>
                    <dd className="m-0 [overflow-wrap:anywhere]">{preview.agents}</dd>
                  </>
                ) : null}
              </dl>
              {preview.description ? (
                <p className="line-clamp-3 [overflow-wrap:anywhere]">{preview.description}</p>
              ) : null}
              <p className="text-muted-foreground">{preview.notices}</p>
            </div>
          </div>
        </div>
        <div className="grid content-start gap-s2">
          <PageEyebrow className="text-muted-foreground">SMS via Telnyx</PageEyebrow>
          <div className="grid gap-s2 rounded-base bg-card p-s4">
            <p className="max-w-full justify-self-start rounded-[18px_18px_18px_4px] bg-muted px-3.5 py-2.5 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
              {preview.sms}
            </p>
            <span className="text-xs text-muted-foreground">{preview.smsMeta}</span>
          </div>
        </div>
      </section>
    </aside>
  );
}
