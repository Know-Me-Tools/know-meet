/**
 * The local speech worker has stricter authority than the existing recorder.
 * This class only models the requester's local admission; room facts and
 * participant answers must come from the authenticated realtime adapter.
 */
export interface TranscriptionSource {
  readonly participantSessionId: string;
  readonly trackInstanceId: string;
}

export interface TranscriptionRoster {
  readonly roomEpoch: string;
  /** Increases at each acknowledged room/connection generation. */
  readonly revision: number;
  /** Includes every current person, even before they publish a track. */
  readonly participantSessionIds: readonly string[];
  readonly sources: readonly TranscriptionSource[];
  readonly canAskEveryone: boolean;
}

export interface TranscriptionGrant {
  readonly requestId: string;
  readonly roomEpoch: string;
  readonly rosterRevision: number;
  /** Set from the transport envelope, including current publication lifetime. */
  readonly fromSessionId: string;
  readonly response: "allow" | "decline" | "withdraw";
}

export interface TranscriptionRequest {
  readonly id: string;
  readonly requesterSessionId: string;
  readonly requesterPrincipal: string;
  readonly roomEpoch: string;
  readonly retention: "ephemeral" | "may-save-locally";
}

export interface TranscriptionLease {
  readonly requestId: string;
  readonly roomEpoch: string;
  readonly generation: number;
  readonly source: TranscriptionSource;
  readonly retention: TranscriptionRequest["retention"];
}

export type TranscriptionState =
  | "off"
  | "model-unavailable"
  | "waiting-for-room"
  | "waiting-for-consent"
  | "admitted";

function sameSource(left: TranscriptionSource, right: TranscriptionSource): boolean {
  return (
    left.participantSessionId === right.participantSessionId &&
    left.trackInstanceId === right.trackInstanceId
  );
}

function validRoster(roster: TranscriptionRoster): boolean {
  const participants = new Set(roster.participantSessionIds);
  return (
    roster.roomEpoch !== "" &&
    Number.isSafeInteger(roster.revision) &&
    roster.revision >= 0 &&
    participants.size > 0 &&
    participants.size === roster.participantSessionIds.length &&
    !participants.has("") &&
    roster.sources.every(
      (source, index) =>
        participants.has(source.participantSessionId) &&
        source.trackInstanceId !== "" &&
        roster.sources.findIndex((other) => sameSource(source, other)) === index,
    )
  );
}

/** Room lifecycle, consent & model readiness are independent prerequisites. */
export class LocalTranscriptionFence {
  private request: TranscriptionRequest | null = null;
  private roster: TranscriptionRoster | null = null;
  private latestRevision = -1;
  private generation = 0;
  private granted = new Set<string>();
  private startedIds = new Set<string>();
  private readonly issued = new WeakSet<TranscriptionLease>();
  private ready = false;

  private readonly localPrincipal: string;
  private readonly localSessionId: string;

  constructor(localPrincipal: string, localSessionId: string) {
    this.localPrincipal = localPrincipal;
    this.localSessionId = localSessionId;
  }

  setModelReady(ready: boolean): void {
    if (this.ready === ready) return;
    this.ready = ready;
    // Readiness is not consent. A failed/restarted model never auto-resumes.
    this.stop();
  }

  replaceRoster(roster: TranscriptionRoster): void {
    // Old or ambiguous room events must not reopen a previously closed fence.
    if (!validRoster(roster) || roster.revision < this.latestRevision) {
      this.invalidateRoom();
      return;
    }
    if (roster.revision === this.latestRevision) {
      if (!this.matchesRoster(roster)) this.invalidateRoom();
      return;
    }
    if (this.request !== null && this.request.roomEpoch !== roster.roomEpoch) this.stop();
    this.latestRevision = roster.revision;
    this.roster = {
      roomEpoch: roster.roomEpoch,
      revision: roster.revision,
      participantSessionIds: [...roster.participantSessionIds],
      sources: roster.sources.map((source) => ({ ...source })),
      canAskEveryone: roster.canAskEveryone,
    };
    // Prompt again for any room or source change. The UI must surface paused.
    this.granted.clear();
    this.generation += 1;
  }

  invalidateRoom(): void {
    this.roster = null;
    this.stop();
  }

  begin(request: TranscriptionRequest): boolean {
    if (
      request.id === "" ||
      request.requesterSessionId !== this.localSessionId ||
      request.requesterPrincipal !== this.localPrincipal ||
      request.roomEpoch !== this.roster?.roomEpoch ||
      this.request !== null ||
      this.startedIds.has(request.id) ||
      !this.ready ||
      !this.roomIsEligible()
    )
      return false;
    this.startedIds.add(request.id);
    this.request = { ...request };
    this.granted.clear();
    this.generation += 1;
    return true;
  }

  applyGrant(grant: TranscriptionGrant): void {
    if (
      this.request === null ||
      this.roster === null ||
      grant.requestId !== this.request.id ||
      grant.roomEpoch !== this.roster.roomEpoch ||
      !this.roster.participantSessionIds.includes(grant.fromSessionId)
    )
      return;
    if (grant.response !== "allow") {
      // Honor this person's veto even if it crossed a newer roster snapshot.
      // No delayed positive answer may resume the ended request.
      this.stop();
      return;
    }
    if (grant.rosterRevision === this.roster.revision) {
      this.granted.add(grant.fromSessionId);
    }
  }

  stop(): void {
    this.request = null;
    this.granted.clear();
    this.generation += 1;
  }

  /** Admitted authorizes a source; actual running UI requires the adapter receipt. */
  get state(): TranscriptionState {
    if (!this.ready) return "model-unavailable";
    if (!this.roomIsEligible()) return "waiting-for-room";
    if (this.request === null) return "off";
    return this.roster?.participantSessionIds.every((id) => this.granted.has(id)) === true
      ? "admitted"
      : "waiting-for-consent";
  }

  leaseFor(source: TranscriptionSource): TranscriptionLease | null {
    if (
      this.state !== "admitted" ||
      this.request === null ||
      !this.roster?.sources.some((candidate) => sameSource(candidate, source))
    )
      return null;
    const lease: TranscriptionLease = Object.freeze({
      requestId: this.request.id,
      roomEpoch: this.request.roomEpoch,
      generation: this.generation,
      source: Object.freeze({ ...source }),
      retention: this.request.retention,
    });
    this.issued.add(lease);
    return lease;
  }

  /**
   * Recheck at worker ingress and async result settlement. The main-thread
   * adapter holds the original lease and correlates a worker result by its job
   * ID; a serialized worker message cannot mint or extend a lease.
   */
  isCurrent(lease: TranscriptionLease): boolean {
    return (
      this.issued.has(lease) &&
      this.state === "admitted" &&
      this.request !== null &&
      this.request.id === lease.requestId &&
      this.request.roomEpoch === lease.roomEpoch &&
      this.generation === lease.generation
    );
  }

  private roomIsEligible(): boolean {
    return (
      this.localPrincipal !== "" &&
      this.localSessionId !== "" &&
      this.roster?.canAskEveryone === true &&
      this.roster.participantSessionIds.includes(this.localSessionId)
    );
  }

  private matchesRoster(roster: TranscriptionRoster): boolean {
    const current = this.roster;
    return (
      current !== null &&
      current.roomEpoch === roster.roomEpoch &&
      current.canAskEveryone === roster.canAskEveryone &&
      current.participantSessionIds.length === roster.participantSessionIds.length &&
      current.participantSessionIds.every((session) =>
        roster.participantSessionIds.includes(session),
      ) &&
      current.sources.length === roster.sources.length &&
      current.sources.every((source) => roster.sources.some((other) => sameSource(source, other)))
    );
  }
}
