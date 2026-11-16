// TJ-ARCH-MOB-001 compliant
import type { RoomCredentials } from "@know-meet/application";
import { parseRoomCode, toParticipantIdentity, type RoomCode } from "@know-meet/domain";

/**
 * Trust-boundary decoding for the token service's `{ ok: true, data }` envelope
 * (tests/release/src/api-contract.ts). Each decoder returns null for anything the contract
 * does not allow, so a bad server value never becomes a domain value.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function dataOf(body: unknown): Record<string, unknown> | null {
  if (!isRecord(body) || body["ok"] !== true) return null;
  const data = body["data"];
  return isRecord(data) ? data : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** The media server URL: `wss://` in production; `ws://` is allowed for a local server. */
function mediaUrl(value: unknown): string | null {
  const text = nonEmptyString(value);
  if (text === null) return null;
  try {
    const { protocol } = new URL(text);
    return protocol === "wss:" || protocol === "ws:" ? text : null;
  } catch {
    return null;
  }
}

function positiveSeconds(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/** The room code from `POST /api/meetings`. */
export function decodeCreatedMeeting(body: unknown): RoomCode | null {
  const data = dataOf(body);
  return data === null ? null : parseRoomCode(data["code"]);
}

/** Credentials from `POST /api/token`; `room` must equal the code that was requested. */
export function decodeCredentials(body: unknown, requested: RoomCode): RoomCredentials | null {
  const data = dataOf(body);
  if (data === null) return null;
  const url = mediaUrl(data["url"]);
  const token = nonEmptyString(data["token"]);
  const identity = nonEmptyString(data["identity"]);
  const room = parseRoomCode(data["room"]);
  const expiresIn = positiveSeconds(data["expiresIn"]);
  if (url === null || token === null || identity === null || expiresIn === null) return null;
  if (room === null || room !== requested) return null;
  return { url, token, identity: toParticipantIdentity(identity), room, expiresIn };
}

/** Whole seconds from a `Retry-After` header; null when absent or not a plain number. */
export function parseRetryAfter(header: string | null): number | null {
  if (header === null) return null;
  const text = header.trim();
  return /^\d+$/.test(text) ? Number(text) : null;
}
