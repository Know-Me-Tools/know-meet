import { expect, type Page } from "@playwright/test";
import { blocked } from "./release-env.ts";

const GROUP = "know-meet-local-transcripts-v1";
const RETAINED = "know-meet-local-transcripts";
const WORKER = /\/local-transcript-worker(?:-[^/]+)?\.(?:js|ts)(?:\?|$)/;

export interface TranscriptStorage {
  readonly entries: number;
  readonly lines: number;
  readonly matching: readonly { readonly text: string; readonly speaker: string | null }[];
  readonly fingerprint: string | null;
}

/**
 * A separate read-only client connects to the real PGlite 0.5.16 leader. It
 * sends a Postgres simple query itself and parses the protocol's DataRow.
 * It does not call the app's library, repository, or saved-text selectors.
 */
export async function readTranscriptStorage(page: Page): Promise<TranscriptStorage> {
  return page.evaluate(async (group): Promise<TranscriptStorage> => {
    const tab = `kmt-observer-${crypto.randomUUID()}`;
    const stage = new AbortController();
    let unlock: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    const ready = new Promise<void>((resolve, reject) => {
      void navigator.locks
        .request(`pglite-tab-close:${tab}`, { signal: stage.signal }, async () => {
          resolve();
          await held;
        })
        .catch(reject);
    });
    const channel = new BroadcastChannel(`pglite-tab:${tab}`);
    const leader = new BroadcastChannel(`pglite-broadcast:${group}`);
    const deadline = AbortSignal.timeout(8_000);

    function receive<T>(selection: (data: Record<string, unknown>) => T | undefined): Promise<T> {
      return new Promise((resolve, reject) => {
        const cleanup = (): void => {
          channel.removeEventListener("message", message);
          deadline.removeEventListener("abort", expired);
        };
        const expired = (): void => {
          cleanup();
          reject(new Error("BLOCKED: independent PGlite observer timed out"));
        };
        const message = (event: MessageEvent<Record<string, unknown>>): void => {
          const result = selection(event.data);
          if (result === undefined) return;
          cleanup();
          resolve(result);
        };
        if (deadline.aborted) {
          expired();
          return;
        }
        deadline.addEventListener("abort", expired, { once: true });
        channel.addEventListener("message", message);
      });
    }

    async function rpc(method: string, args: readonly unknown[] = []): Promise<unknown> {
      const callId = crypto.randomUUID();
      const reply = receive((data) => (data["callId"] === callId ? data : undefined));
      channel.postMessage({ type: "rpc-call", callId, method, args });
      const found = await reply;
      if (found["type"] !== "rpc-return")
        throw new Error("BLOCKED: independent PGlite query failed");
      return found["result"];
    }

    try {
      await ready;
      const connected = receive((data) => (data["type"] === "connected" ? true : undefined));
      leader.postMessage({ type: "tab-here", id: tab });
      await connected;
      // Match the frozen synthetic phrase only. Expose no unrelated profile content.
      const sql = `SELECT json_build_object(
        'entries', (SELECT count(*) FROM speech_entries),
        'lines', (SELECT count(*) FROM speech_lines),
        'matching', (SELECT coalesce(json_agg(json_build_object('text', text, 'speaker', speaker) ORDER BY start_ms, id), '[]'::json)
          FROM speech_lines WHERE lower(text) LIKE '%blue folder%'),
        'fingerprint', (SELECT md5(string_agg(serialized, E'\\n' ORDER BY serialized))
          FROM (SELECT row_to_json(e)::text AS serialized FROM speech_entries e
                UNION ALL SELECT row_to_json(l)::text AS row FROM speech_lines l) all_rows)
      )::text`;
      const body = new TextEncoder().encode(sql);
      const packet = new Uint8Array(body.length + 6);
      packet[0] = 81; // Q, the Postgres simple-query message type.
      new DataView(packet.buffer).setUint32(1, body.length + 5);
      packet.set(body, 5);
      await rpc("_acquireQueryLock");
      let raw: unknown;
      try {
        raw = await rpc("execProtocolRaw", [packet]);
      } finally {
        await rpc("_releaseQueryLock");
      }
      if (!(raw instanceof Uint8Array)) throw new Error("BLOCKED: unexpected PGlite wire result");
      const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
      for (let offset = 0; offset + 5 <= raw.length; ) {
        const frame = view.getUint32(offset + 1);
        if (frame < 4 || offset + 1 + frame > raw.length) break;
        if (raw[offset] === 68 && frame >= 10 && view.getUint16(offset + 5) === 1) {
          const size = view.getInt32(offset + 7);
          if (size >= 0 && offset + 11 + size <= offset + 1 + frame) {
            const receipt = JSON.parse(
              new TextDecoder().decode(raw.subarray(offset + 11, offset + 11 + size)),
            ) as TranscriptStorage;
            if (
              Number.isSafeInteger(receipt.entries) &&
              Number.isSafeInteger(receipt.lines) &&
              Array.isArray(receipt.matching) &&
              (receipt.fingerprint === null || typeof receipt.fingerprint === "string")
            )
              return receipt;
          }
        }
        offset += frame + 1;
      }
      throw new Error("BLOCKED: PGlite read-only observer got no valid data row");
    } finally {
      stage.abort();
      unlock();
      channel.close();
      leader.close();
    }
  }, GROUP);
}

export async function transcriptDatabaseNames(page: Page): Promise<string[]> {
  return page.evaluate(async (group) => {
    if (typeof indexedDB.databases !== "function") {
      throw new Error("BLOCKED: browser IndexedDB inventory is unavailable");
    }
    return (await indexedDB.databases()).flatMap(({ name }) =>
      name?.includes(group) ? [name] : [],
    );
  }, GROUP);
}

export async function denyTranscriptDurability(page: Page): Promise<() => Promise<boolean>> {
  const findRetained = async () => {
    for (const instance of page.workers()) {
      if (WORKER.test(instance.url()) && (await instance.evaluate(() => self.name)) === RETAINED) {
        return instance;
      }
    }
    return undefined;
  };
  await expect
    .poll(async () => !!(await findRetained()), {
      message: "BLOCKED: locate the retained transcript worker before injecting durability failure",
    })
    .toBe(true);
  const worker = await findRetained();
  if (!worker) throw blocked("the transcript storage worker closed before the failure was armed");
  const channel = `kmt-denied-write-${crypto.randomUUID()}`;
  await page.evaluate((name) => {
    const channel = new BroadcastChannel(name);
    channel.addEventListener(
      "message",
      ({ data }) => {
        if (data !== "retained-write-denied") return;
        Object.defineProperty(window, name, { value: true });
        channel.close();
      },
      { once: true },
    );
  }, channel);
  await worker.evaluate(
    ({ group, name }) => {
      const put = IDBObjectStore.prototype.put;
      const channel = new BroadcastChannel(name);
      IDBObjectStore.prototype.put = function (
        this: IDBObjectStore,
        value: unknown,
        key?: IDBValidKey,
      ) {
        if (this.transaction.db.name.includes(group)) {
          channel.postMessage("retained-write-denied");
          throw new DOMException("KMT boundary denied a transcript write", "QuotaExceededError");
        }
        return key === undefined ? put.call(this, value) : put.call(this, value, key);
      };
    },
    { group: GROUP, name: channel },
  );
  return () => page.evaluate((name) => Object.hasOwn(window, name), channel);
}
