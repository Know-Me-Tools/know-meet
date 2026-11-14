// TJ-ARCH-MOB-001 compliant
// Screen-level state for the dashboard views: the sample workspace (anchored at
// mount), this session's reducer state, and the simulated delivery actions
// (resend, send email instead). Static phase: actions settle locally after the
// prototype's delay; nothing leaves the page.
import { createContext, type ReactNode, use, useCallback, useMemo, useReducer } from "react";
import type { Workspace } from "../../workspace/domain/workspace";
import { useSampleWorkspace } from "../../workspace/use-workspace";
import {
  baseDashboardMeetings,
  baseDeliveries,
  joinUrl,
  localTimeZone,
} from "../application/dashboard-fixtures";
import {
  type DashboardAction,
  type DashboardState,
  dashboardReducer,
  EMPTY_DASHBOARD_STATE,
  selectAllMeetings,
  selectDeliveries,
  selectMeeting,
} from "../application/dashboard-state";
import { type DashboardMeeting, type Delivery, LANDLINE_REASON } from "../domain/dashboard";

const RESEND_MS = 1100;

export interface DashboardModel {
  readonly workspace: Workspace;
  readonly now: Date;
  readonly localTz: string;
  readonly state: DashboardState;
  readonly dispatch: (action: DashboardAction) => void;
  readonly meetings: readonly DashboardMeeting[];
  readonly deliveries: readonly Delivery[];
  readonly getMeeting: (id: string) => DashboardMeeting | null;
  readonly joinUrlFor: (code: string) => string;
  readonly resend: (delivery: Delivery) => Promise<Delivery>;
  /** Resolves with the email used; rejects with cause-then-fix copy when none is on file. */
  readonly sendEmailInstead: (delivery: Delivery) => Promise<string>;
}

const DashboardContext = createContext<DashboardModel | null>(null);

export function useDashboard(): DashboardModel {
  const model = use(DashboardContext);
  if (model === null) throw new Error("DashboardContext is not provided");
  return model;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function DashboardProvider({ children }: { readonly children: ReactNode }) {
  const { workspace, now } = useSampleWorkspace();
  const localTz = useMemo(() => localTimeZone(), []);
  const base = useMemo(() => baseDashboardMeetings(workspace, localTz), [workspace, localTz]);
  const baseDeliveryList = useMemo(() => baseDeliveries(workspace), [workspace]);
  const [state, dispatch] = useReducer(dashboardReducer, EMPTY_DASHBOARD_STATE);

  const meetings = useMemo(() => selectAllMeetings(state, base), [state, base]);
  const deliveries = useMemo(
    () => selectDeliveries(state, base, baseDeliveryList),
    [state, base, baseDeliveryList],
  );
  const getMeeting = useCallback((id: string) => selectMeeting(state, base, id), [state, base]);
  const joinUrlFor = useCallback((code: string) => joinUrl(code, window.location.origin), []);

  const resend = useCallback(async (delivery: Delivery) => {
    await wait(RESEND_MS);
    const resentAt = new Date().toISOString();
    const changes: Partial<Delivery> = delivery.landline
      ? { status: "failed", reason: LANDLINE_REASON, resentAt }
      : { status: "delivered", reason: null, resentAt };
    dispatch({ type: "patch-delivery", id: delivery.id, changes });
    return { ...delivery, ...changes };
  }, []);

  const sendEmailInstead = useCallback(
    async (delivery: Delivery) => {
      const person = workspace.people.find((p) => p.name === delivery.name);
      if (!person)
        throw new Error(
          `No email address on file for ${delivery.name}. Add one from Schedule → Edit.`,
        );
      await wait(RESEND_MS);
      const existing = deliveries.find(
        (d) =>
          d.meetingId === delivery.meetingId && d.name === delivery.name && d.channel === "email",
      );
      const sentAt = new Date().toISOString();
      if (existing) {
        dispatch({
          type: "patch-delivery",
          id: existing.id,
          changes: { status: "delivered", reason: null, resentAt: sentAt },
        });
      } else {
        dispatch({
          type: "add-delivery",
          delivery: {
            id: `${delivery.meetingId}-${person.id}-email-alt`,
            meetingId: delivery.meetingId,
            name: delivery.name,
            personId: person.id,
            channel: "email",
            to: person.email,
            status: "delivered",
            reason: null,
            landline: false,
            sentAt,
          },
        });
      }
      dispatch({ type: "patch-delivery", id: delivery.id, changes: { resolvedByEmail: true } });
      return person.email;
    },
    [workspace, deliveries],
  );

  const model = useMemo<DashboardModel>(
    () => ({
      workspace,
      now,
      localTz,
      state,
      dispatch,
      meetings,
      deliveries,
      getMeeting,
      joinUrlFor,
      resend,
      sendEmailInstead,
    }),
    [
      workspace,
      now,
      localTz,
      state,
      meetings,
      deliveries,
      getMeeting,
      joinUrlFor,
      resend,
      sendEmailInstead,
    ],
  );
  return <DashboardContext value={model}>{children}</DashboardContext>;
}
