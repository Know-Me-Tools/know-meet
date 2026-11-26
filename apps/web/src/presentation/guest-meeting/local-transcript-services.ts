import type { TranscriptionRequest } from "@know-meet/domain";

export type LocalTranscriptState =
  | "off"
  | "preparing"
  | "ready"
  | "waiting-for-consent"
  | "waiting-for-audio"
  | "capturing"
  | "paused"
  | "unavailable";

export interface LocalTranscriptPeer {
  readonly key: string;
  readonly displayName: string;
  readonly fromSessionId: string;
  readonly requestId: string;
  readonly roomEpoch: string;
  readonly revision: number;
  readonly retention: TranscriptionRequest["retention"];
  readonly state: "pending" | "allowed" | "running" | "withdrawing";
}

export interface LocalTranscriptLine {
  readonly id: number;
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
  readonly gap: boolean;
  readonly speaker: string | null;
}

export interface LocalTranscriptEntry {
  readonly id: string;
  readonly label: string;
  readonly savedAt: string;
  readonly incomplete: boolean;
}

export interface LocalTranscriptView {
  readonly state: LocalTranscriptState;
  readonly peers: readonly LocalTranscriptPeer[];
  readonly roomReady: boolean;
  readonly roomSupportsConsent: boolean;
  readonly localCaptureSupported: boolean;
  readonly lines: readonly LocalTranscriptLine[];
  readonly omittedLines: boolean;
  readonly canKeep: boolean;
  readonly saveStatus: "unsaved" | "saving" | "saved" | "unconfirmed";
}

export interface LocalTranscriptServices {
  readonly downloadBytes: number;
  readonly getSnapshot: () => LocalTranscriptView;
  readonly subscribe: (change: () => void) => () => void;
  readonly prepare: () => Promise<boolean>;
  readonly cancelPrepare: () => void;
  readonly request: (retention: TranscriptionRequest["retention"]) => Promise<boolean>;
  readonly answer: (key: string, response: "allow" | "decline" | "withdraw") => Promise<boolean>;
  readonly pause: () => void;
  readonly canOfferRetention: () => boolean;
  readonly searchLive: (query: string) => Promise<readonly number[]>;
  readonly save: () => Promise<void>;
  readonly saved: {
    readonly list: () => Promise<readonly LocalTranscriptEntry[]>;
    readonly open: (id: string) => Promise<readonly LocalTranscriptLine[]>;
    readonly search: (id: string, query: string) => Promise<readonly number[]>;
    readonly remove: (id: string) => Promise<void>;
  };
}
