import {
  err,
  meetingErrors,
  ok,
  parseRoomCode,
  type RoomCode,
  toParticipantIdentity,
} from "@know-meet/domain";
import type { CreateMeetingError, TokenIssuer, TokenRequest, TokenRequestError } from "../ports.ts";

/** An in-memory TokenIssuer for tests and offline development. Issues no real token. */
export interface FakeTokenIssuer extends TokenIssuer {
  /** Codes this issuer created or was seeded with. Only these get tokens. */
  issued(): readonly RoomCode[];
  /** Every token request received, in order. */
  tokenRequests(): readonly TokenRequest[];
  /** Makes the next `createMeeting` fail with this error. */
  failNextCreate(error: CreateMeetingError): void;
  /** Makes the next `requestToken` fail with this error. */
  failNextToken(error: TokenRequestError): void;
}

export interface FakeTokenIssuerOptions {
  /** Codes that exist before the first call, as if created earlier. */
  readonly seededCodes?: readonly RoomCode[];
  /** The media server URL put into credentials. */
  readonly url?: string;
}

const FAKE_URL = "wss://media.fake.invalid";
const FAKE_TOKEN_LIFETIME_SECONDS = 600;

export function createFakeTokenIssuer(options: FakeTokenIssuerOptions = {}): FakeTokenIssuer {
  const url = options.url ?? FAKE_URL;
  let issued: readonly RoomCode[] = options.seededCodes ?? [];
  let tokenRequests: readonly TokenRequest[] = [];
  let nextCreateFailure: CreateMeetingError | null = null;
  let nextTokenFailure: TokenRequestError | null = null;
  return {
    issued: () => issued,
    tokenRequests: () => tokenRequests,
    failNextCreate: (error) => {
      nextCreateFailure = error;
    },
    failNextToken: (error) => {
      nextTokenFailure = error;
    },
    createMeeting: async () => {
      const failure = nextCreateFailure;
      nextCreateFailure = null;
      if (failure !== null) return err(failure);
      const code = parseRoomCode(fakeCode(issued.length + 1));
      if (code === null) return err(meetingErrors.connectionLost());
      issued = [...issued, code];
      return ok(code);
    },
    requestToken: async (request) => {
      tokenRequests = [...tokenRequests, request];
      const failure = nextTokenFailure;
      nextTokenFailure = null;
      if (failure !== null) return err(failure);
      if (!issued.includes(request.code)) return err(meetingErrors.notFound());
      const sequence = tokenRequests.length;
      return ok({
        url,
        token: `fake-token-${sequence}`,
        identity: toParticipantIdentity(`guest-${sequence}`),
        room: request.code,
        expiresIn: FAKE_TOKEN_LIFETIME_SECONDS,
      });
    },
  };
}

/** Sequential codes in the service's shape: 1 becomes `km-000-001`. */
function fakeCode(sequence: number): string {
  const digits = sequence.toString().padStart(6, "0");
  return `km-${digits.slice(0, 3)}-${digits.slice(3, 6)}`;
}
