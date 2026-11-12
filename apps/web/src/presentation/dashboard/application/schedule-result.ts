// TJ-ARCH-MOB-001 compliant
// dashboard.html `collectMeeting` / `finishCreate`: the meeting a valid schedule
// form produces, and its invite deliveries (sent now; SMS starts queued in the
// confirmation view). Pure; the caller dispatches the result.
import type { AgentId, Workspace } from "../../workspace/domain/workspace";
import type { DashboardMeeting, Delivery } from "../domain/dashboard";
import { channelsFor } from "../domain/invitee-rules";
import { type ScheduleValues, startOf } from "./schedule-form";

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "meeting"
  );
}

const AGENT_IDS: readonly AgentId[] = ["concierge", "scribe", "researcher", "facilitator", "translator"];

function isAgentId(value: string): value is AgentId {
  return AGENT_IDS.some((id) => id === value);
}

export interface ScheduledOutcome {
  readonly meeting: DashboardMeeting;
  readonly deliveries: readonly Delivery[];
}

export function buildScheduledMeeting(
  values: ScheduleValues,
  editing: DashboardMeeting | null,
  workspace: Workspace,
  now: Date,
): ScheduledOutcome {
  const id = editing?.id ?? `${slug(values.title)}-${values.code.slice(-3)}`;
  const start = startOf(values) ?? now;
  const dialIn = workspace.meetings[0]?.dialIn ?? null;
  const meeting: DashboardMeeting = {
    id,
    title: values.title.trim().slice(0, 120),
    start: start.toISOString(),
    durationMin: Number(values.duration),
    source: values.calendar === "none" ? "knowme" : values.calendar,
    host: editing?.host ?? workspace.user.name,
    invitees: values.invitees.map((i) => i.name),
    dialIn: values.options.dial ? dialIn : null,
    agents: ["concierge", ...values.agents.filter(isAgentId)],
    dots: values.iris ? ["iris"] : [],
    record: values.options.record,
    transcribe: values.options.transcribe,
    sendSummary: values.options.summary,
    waitingRoom: values.options.waiting,
    joinCode: values.code,
    tz: values.tz,
    description: values.description.trim().slice(0, 1000),
    preReads: values.files,
    cancelled: false,
    inviteeContacts: values.invitees,
  };
  const sentAt = now.toISOString();
  const deliveries: Delivery[] = [];
  values.invitees.forEach((inv, index) => {
    for (const channel of channelsFor(inv)) {
      deliveries.push({
        id: `${id}-${index}-${channel}`, meetingId: id, name: inv.name, personId: null, channel,
        to: channel === "sms" ? inv.phone : inv.email, status: "delivered", reason: null, landline: false, sentAt,
      });
    }
    if (values.calendar !== "none" && inv.email) {
      deliveries.push({
        id: `${id}-${index}-calendar`, meetingId: id, name: inv.name, personId: null, channel: "calendar",
        to: inv.email, status: "delivered", reason: null, landline: false, sentAt,
      });
    }
  });
  return { meeting, deliveries };
}
