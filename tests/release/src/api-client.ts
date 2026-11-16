/**
 * Thin client for the token service contract (api-contract.ts). Uses
 * Playwright's APIRequestContext so requests appear in the trace.
 */
import { expect, type APIRequestContext, type APIResponse } from "@playwright/test";
import { API, isCreateMeetingResponse, ROOM_CODE_PATTERN, STATUS } from "./api-contract.ts";

export interface PostOptions {
  /** Origin header to send; the site origin unless a test overrides it. */
  readonly origin: string;
}

export async function postJson(
  request: APIRequestContext,
  path: string,
  body: unknown,
  options: PostOptions,
): Promise<APIResponse> {
  return request.post(path, {
    data: body,
    headers: { "Content-Type": "application/json", Origin: options.origin },
    failOnStatusCode: false,
  });
}

export async function createMeeting(
  request: APIRequestContext,
  options: PostOptions,
): Promise<APIResponse> {
  return postJson(request, API.createMeeting, {}, options);
}

export async function requestToken(
  request: APIRequestContext,
  code: string,
  name: string,
  options: PostOptions,
): Promise<APIResponse> {
  return postJson(request, API.token, { code, name }, options);
}

/** Creates a meeting and returns its code, asserting the contract on the way. */
export async function issuedCode(
  request: APIRequestContext,
  options: PostOptions,
): Promise<string> {
  const response = await createMeeting(request, options);
  expect(response.status(), "POST /api/meetings status").toBe(STATUS.created);
  const body: unknown = await response.json();
  expect(isCreateMeetingResponse(body), "create-meeting body matches the contract").toBe(true);
  return (body as { data: { code: string } }).data.code;
}

const CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomGroup(): string {
  let out = "";
  for (let i = 0; i < 3; i += 1) {
    out += CODE_ALPHABET.charAt(Math.floor(Math.random() * CODE_ALPHABET.length));
  }
  return out;
}

/**
 * A well-formed code the service did not issue. Random per run, so a fixed
 * room can never make the negative control pass by accident; the probability
 * of colliding with a live code is about one in two billion per live meeting.
 */
export function unissuedCode(): string {
  const code = `km-${randomGroup()}-${randomGroup()}`;
  if (!ROOM_CODE_PATTERN.test(code)) throw new Error(`generated code ${code} is malformed`);
  return code;
}

export interface JwtClaims {
  readonly [claim: string]: unknown;
}

/** Decodes the payload of a JWT. The signature is dropped and never recorded. */
export function decodeJwtClaims(token: string): JwtClaims {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[1] === undefined) throw new Error("token is not a JWT");
  const json = Buffer.from(parts[1], "base64url").toString("utf8");
  const claims: unknown = JSON.parse(json);
  if (typeof claims !== "object" || claims === null) {
    throw new Error("JWT payload is not an object");
  }
  return claims as JwtClaims;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}
