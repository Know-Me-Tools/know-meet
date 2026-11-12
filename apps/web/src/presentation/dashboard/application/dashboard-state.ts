// TJ-ARCH-MOB-001 compliant
// The dashboard's session state (dashboard.html `state`): meetings created or
// edited here, cancellations and delivery patches. A pure reducer; nothing is
// sent anywhere (static phase, contract exclusion).
import type { DashboardMeeting, DashboardMeetingStatus, Delivery, PreRead } from "../domain/dashboard";

export interface DashboardState {
  readonly created: readonly DashboardMeeting[];
  readonly createdDeliveries: readonly Delivery[];
  readonly cancelled: readonly string[];
  readonly overrides: Readonly<Record<string, Partial<DashboardMeeting>>>;
  readonly patch: Readonly<Record<string, Partial<Delivery>>>;
  readonly preReads: Readonly<Record<string, readonly PreRead[]>>;
}

export const EMPTY_DASHBOARD_STATE: DashboardState = {
  created: [],
  createdDeliveries: [],
  cancelled: [],
  overrides: {},
  patch: {},
  preReads: {},
};

export type DashboardAction =
  | { readonly type: "create"; readonly meeting: DashboardMeeting; readonly deliveries: readonly Delivery[]; readonly preReads: readonly PreRead[] }
  | { readonly type: "override"; readonly id: string; readonly changes: Partial<DashboardMeeting> }
  | { readonly type: "cancel"; readonly id: string }
  | { readonly type: "patch-delivery"; readonly id: string; readonly changes: Partial<Delivery> }
  | { readonly type: "add-delivery"; readonly delivery: Delivery }
  | { readonly type: "set-pre-reads"; readonly id: string; readonly files: readonly PreRead[] };

export function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case "create":
      return {
        ...state,
        created: [...state.created, action.meeting],
        createdDeliveries: [...state.createdDeliveries, ...action.deliveries],
        preReads: action.preReads.length ? { ...state.preReads, [action.meeting.id]: action.preReads } : state.preReads,
      };
    case "override":
      return { ...state, overrides: { ...state.overrides, [action.id]: { ...state.overrides[action.id], ...action.changes } } };
    case "cancel":
      return { ...state, cancelled: [...state.cancelled, action.id] };
    case "patch-delivery":
      return { ...state, patch: { ...state.patch, [action.id]: { ...state.patch[action.id], ...action.changes } } };
    case "add-delivery":
      return { ...state, createdDeliveries: [...state.createdDeliveries, action.delivery] };
    case "set-pre-reads":
      return { ...state, preReads: { ...state.preReads, [action.id]: action.files } };
  }
}

/** A meeting with this session's overrides, cancellation and pre-reads applied. */
export function selectMeeting(state: DashboardState, base: readonly DashboardMeeting[], id: string): DashboardMeeting | null {
  const found = base.find((m) => m.id === id) ?? state.created.find((m) => m.id === id);
  if (found === undefined) return null;
  return {
    ...found,
    ...state.overrides[id],
    preReads: state.preReads[id] ?? state.overrides[id]?.preReads ?? found.preReads,
    cancelled: state.cancelled.includes(id),
  };
}

export function selectAllMeetings(state: DashboardState, base: readonly DashboardMeeting[]): readonly DashboardMeeting[] {
  return [...base, ...state.created]
    .map((m) => selectMeeting(state, base, m.id))
    .filter((m): m is DashboardMeeting => m !== null)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export function selectDeliveries(
  state: DashboardState,
  base: readonly DashboardMeeting[],
  baseDeliveries: readonly Delivery[],
): readonly Delivery[] {
  return [...baseDeliveries, ...state.createdDeliveries]
    .map((d) => ({ ...d, ...state.patch[d.id] }))
    .filter((d) => {
      const meeting = selectMeeting(state, base, d.meetingId);
      return meeting !== null && !meeting.cancelled;
    });
}

const MINUTE_MS = 60_000;

/** km.js `meetingStatus`, plus cancelled. */
export function statusOf(meeting: DashboardMeeting, now: Date): DashboardMeetingStatus {
  if (meeting.cancelled) return "cancelled";
  const start = new Date(meeting.start).getTime();
  const t = now.getTime();
  if (t < start) return "upcoming";
  return t <= start + meeting.durationMin * MINUTE_MS ? "live" : "ended";
}

export function meetingEndOf(meeting: DashboardMeeting): Date {
  return new Date(new Date(meeting.start).getTime() + meeting.durationMin * MINUTE_MS);
}
