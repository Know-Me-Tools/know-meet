/** SSE parser tests: arbitrary chunking, CRLF, comments, ids. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { SseParser } from "../src/infrastructure/sse-parser.ts";

test("frames survive arbitrary chunk boundaries and CRLF", () => {
  const raw = 'id: 1\r\ndata: {"a":1}\r\n\r\n: keep-alive\r\n\r\nid: 2\ndata: line1\ndata: line2\n\n';
  const parser = new SseParser();
  const frames = [...raw].flatMap((ch) => parser.push(ch));
  assert.deepEqual(frames, [
    { id: "1", event: null, data: '{"a":1}' },
    { id: "2", event: null, data: "line1\nline2" },
  ]);
});

test("invalid JSON is still delivered as a frame for the decoder to reject", () => {
  const frames = new SseParser().push("data: {this is not json\n\n");
  assert.equal(frames[0]?.data, "{this is not json");
});
