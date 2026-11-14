// TJ-ARCH-MOB-001 compliant
// c13 security review L4: `next` accepts internal route names only.
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_NEXT, safeNext } from "../../src/presentation/auth/auth-next.ts";

test("keeps internal route names and their hash sub-states", () => {
  for (const value of [
    "dashboard",
    "agents",
    "recordings",
    "settings",
    "notes",
    "agents#registry",
    "agents#detail:iris",
    "recordings#rec-42",
    "settings#calendar-connect:google",
    "settings#templates?tab=sms",
  ]) {
    assert.equal(safeNext(value), value);
  }
});

test("falls back to the default for anything that is not an internal route", () => {
  for (const value of [
    "https://evil.example",
    "//evil.example",
    "/dashboard",
    "javascript:alert(1)",
    "data:text/html,x",
    "auth",
    "join",
    "Dashboard",
    "dashboard/../x",
    "dashboard?x=1",
    "agents#",
    "agents#//evil.example",
    "agents#detail iris",
    "agents#x\nLocation: y",
    "%2F%2Fevil.example",
    " dashboard",
  ]) {
    assert.equal(safeNext(value), DEFAULT_NEXT, value);
  }
});
