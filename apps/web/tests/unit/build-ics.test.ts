// TJ-ARCH-MOB-001 compliant
// c13 security review L5: RFC 5545 encoding of untrusted invite fields.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildIcs,
  escapeText,
  httpsUrl,
  type IcsEvent,
  quoteParam,
} from "../../src/presentation/join/application/build-ics.ts";

const BASE: IcsEvent = {
  uid: "m1",
  title: "Weekly sync",
  start: new Date("2026-11-12T15:00:00Z"),
  end: new Date("2026-11-12T15:30:00Z"),
  stamp: new Date("2026-11-12T10:00:00Z"),
  url: "https://meet.example/join#invite?code=ABC",
  description: "Join in your browser",
  organizer: { name: "Avery Chen", email: "avery@example.com" },
};

/** Unfolds continuation lines and splits into logical content lines. */
function contentLines(ics: string): string[] {
  return ics
    .replace(/\r\n /g, "")
    .split("\r\n")
    .filter((line) => line !== "");
}

test("escapeText escapes TEXT specials and every kind of line break", () => {
  assert.equal(escapeText("a\\b;c,d"), String.raw`a\\b\;c\,d`);
  assert.equal(escapeText("1\r\n2\n3\r4"), "1\\n2\\n3\\n4");
  assert.equal(escapeText("x\u0000\u001by\tz"), "xy\tz");
});

test("quoteParam DQUOTE-quotes and drops characters a parameter cannot carry", () => {
  assert.equal(quoteParam("Avery Chen"), '"Avery Chen"');
  assert.equal(quoteParam('Eve";X-INJECT=1:mailto:a@b.c'), '"Eve;X-INJECT=1:mailto:a@b.c"');
  assert.equal(quoteParam("a\r\nb\rc"), '"a b c"');
});

test("httpsUrl accepts https only", () => {
  assert.equal(httpsUrl("https://meet.example/j"), "https://meet.example/j");
  for (const value of [
    "http://meet.example/j",
    "javascript:alert(1)",
    "data:text/html,x",
    "https://user:pw@meet.example/",
    "not a url",
  ]) {
    assert.equal(httpsUrl(value), null, value);
  }
});

test("a hostile title, name and description cannot inject a property", () => {
  const ics = buildIcs({
    ...BASE,
    title: "Sync\rATTACH:https://evil.example/x",
    description: "line1\nEND:VEVENT\r\nBEGIN:VEVENT",
    organizer: { name: 'Eve"\r\nATTENDEE:mailto:x@evil.example', email: "eve@example.com" },
  });
  const lines = contentLines(ics);
  assert.equal(lines.filter((l) => l.startsWith("ATTACH")).length, 0);
  assert.equal(lines.filter((l) => l.startsWith("ATTENDEE")).length, 0);
  assert.equal(lines.filter((l) => l === "BEGIN:VEVENT").length, 1);
  assert.ok(
    lines.includes('ORGANIZER;CN="Eve ATTENDEE:mailto:x@evil.example":mailto:eve@example.com'),
  );
  assert.ok(!/\r(?!\n)|(?<!\r)\n/.test(ics), "only CRLF line endings");
});

test("a non-https URL is left out; an https URL is written", () => {
  assert.ok(contentLines(buildIcs(BASE)).includes("URL:https://meet.example/join#invite?code=ABC"));
  const lines = contentLines(buildIcs({ ...BASE, url: "javascript:alert(1)" }));
  assert.equal(lines.filter((l) => l.startsWith("URL:") || l.startsWith("LOCATION:")).length, 0);
});

test("an organizer email that is not a plain address is left out", () => {
  const ics = buildIcs({ ...BASE, organizer: { name: "X", email: "a@b.c:evil;x" } });
  assert.equal(contentLines(ics).filter((l) => l.startsWith("ORGANIZER")).length, 0);
});

test("lines fold at 75 octets without splitting a character", () => {
  const ics = buildIcs({ ...BASE, title: "é".repeat(100) });
  const encoder = new TextEncoder();
  for (const physical of ics.split("\r\n")) {
    assert.ok(encoder.encode(physical).length <= 75, physical);
    assert.ok(!physical.includes("�"));
  }
  assert.ok(contentLines(ics).includes(`SUMMARY:${"é".repeat(100)}`));
});
