// TJ-ARCH-MOB-001 compliant
import type {
  CreateMeetingError,
  RoomCredentials,
  TokenIssuer,
  TokenRequest,
  TokenRequestError,
} from "@know-meet/application";
import { err, meetingErrors, ok, type Result, type RoomCode } from "@know-meet/domain";
import { decodeCreatedMeeting, decodeCredentials, parseRetryAfter } from "./token-wire.ts";

const MEETINGS_ENDPOINT = "/api/meetings";
const TOKEN_ENDPOINT = "/api/token";

const STATUS_OK = 200;
const STATUS_CREATED = 201;
const STATUS_INVALID_REQUEST = 400;
const STATUS_FORBIDDEN = 403;
const STATUS_NOT_FOUND = 404;
const STATUS_RATE_LIMITED = 429;

export interface HttpTokenIssuerOptions {
  /** Defaults to the global `fetch`, resolved at call time. Tests pass a stub. */
  readonly fetch?: typeof fetch;
}

/** The request left the page and a response came back; null means the network failed. */
async function post(
  fetchFn: typeof fetch,
  url: string,
  body: unknown,
  signal: AbortSignal | undefined,
): Promise<Response | null> {
  try {
    return await fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      ...(signal ? { signal } : {}),
    });
  } catch {
    return null;
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function rateLimited(response: Response) {
  return meetingErrors.rateLimited(parseRetryAfter(response.headers.get("Retry-After")));
}

/** 404 and 400 are not defined for `POST /api/meetings`, so they count as a broken service. */
function createFailure(response: Response | null): CreateMeetingError {
  if (response?.status === STATUS_RATE_LIMITED) return rateLimited(response);
  if (response?.status === STATUS_FORBIDDEN) return meetingErrors.forbidden();
  return meetingErrors.connectionLost();
}

function tokenFailure(response: Response | null): TokenRequestError {
  if (response === null) return meetingErrors.connectionLost();
  switch (response.status) {
    case STATUS_NOT_FOUND:
      return meetingErrors.notFound();
    case STATUS_RATE_LIMITED:
      return rateLimited(response);
    case STATUS_FORBIDDEN:
      return meetingErrors.forbidden();
    case STATUS_INVALID_REQUEST:
      return meetingErrors.invalidRequest();
    default:
      return meetingErrors.connectionLost();
  }
}

/**
 * The token service over same-origin `/api` (wr03). It never throws for an expected failure
 * and never logs a body: the response carries a live access token.
 */
export function createHttpTokenIssuer(options: HttpTokenIssuerOptions = {}): TokenIssuer {
  const fetchFn: typeof fetch = (input, init) => (options.fetch ?? globalThis.fetch)(input, init);

  async function createMeeting(
    signal?: AbortSignal,
  ): Promise<Result<RoomCode, CreateMeetingError>> {
    const response = await post(fetchFn, MEETINGS_ENDPOINT, {}, signal);
    if (response?.status !== STATUS_CREATED) return err(createFailure(response));
    const code = decodeCreatedMeeting(await readJson(response));
    return code === null ? err(meetingErrors.connectionLost()) : ok(code);
  }

  async function requestToken(
    request: TokenRequest,
    signal?: AbortSignal,
  ): Promise<Result<RoomCredentials, TokenRequestError>> {
    const body = { code: request.code, name: request.displayName };
    const response = await post(fetchFn, TOKEN_ENDPOINT, body, signal);
    if (response?.status !== STATUS_OK) return err(tokenFailure(response));
    const credentials = decodeCredentials(await readJson(response), request.code);
    return credentials === null ? err(meetingErrors.connectionLost()) : ok(credentials);
  }

  return { createMeeting, requestToken };
}
