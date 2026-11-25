import { type BrowserContext, expect, type Page, type TestInfo } from "@playwright/test";
import { attachJson } from "./evidence.ts";
import { findRecordingEgress } from "./wc-network.ts";
import type { Participant } from "./wc-room.ts";

const UPLOAD_PATH = "/__know-meet-rc-5-upload-canary";
const CANARY_LABEL = "rc-5-disposable-recording-canary";
const WEBM_HEADER = [0x1a, 0x45, 0xdf, 0xa3];

interface TrackObservation {
  readonly id: string;
  readonly kind: string;
}

interface RtcWitness {
  readonly dataMessages: number;
  readonly possibleRecordingMessages: readonly { label: string; bytes: number }[];
  readonly recordingTracks: readonly TrackObservation[];
  readonly outboundTracks: readonly TrackObservation[];
  readonly outboundRecordingTracks: readonly TrackObservation[];
  readonly inboundTracks: readonly TrackObservation[];
}

/** Observe native browser boundaries without replacing the normal room transport. */
export async function installRecordingRtcWitness(context: BrowserContext): Promise<void> {
  await context.addInitScript({
    content: `(() => {
      let dataMessages = 0;
      const pending = [];
      const possibleRecordingMessages = [];
      const recordingTracks = new Set();
      const outboundTracks = new Set();
      const inboundTracks = new Set();
      const originalTrack = new WeakMap();
      const describe = (track) => ({ id: track.id, kind: track.kind });

      const start = MediaRecorder.prototype.start;
      MediaRecorder.prototype.start = function (...args) {
        for (const track of this.stream.getTracks()) recordingTracks.add(track);
        return start.apply(this, args);
      };
      const clone = MediaStreamTrack.prototype.clone;
      MediaStreamTrack.prototype.clone = function () {
        const result = clone.call(this);
        originalTrack.set(result, originalTrack.get(this) || this);
        return result;
      };
      const peer = RTCPeerConnection.prototype;
      const addTrack = peer.addTrack;
      peer.addTrack = function (...args) {
        const sender = addTrack.apply(this, args);
        if (sender.track) outboundTracks.add(sender.track);
        return sender;
      };
      const addTransceiver = peer.addTransceiver;
      peer.addTransceiver = function (...args) {
        const transceiver = addTransceiver.apply(this, args);
        if (transceiver.sender.track) outboundTracks.add(transceiver.sender.track);
        return transceiver;
      };
      const replaceTrack = RTCRtpSender.prototype.replaceTrack;
      RTCRtpSender.prototype.replaceTrack = async function (...args) {
        await replaceTrack.apply(this, args);
        if (this.track) outboundTracks.add(this.track);
      };
      const setRemoteDescription = peer.setRemoteDescription;
      const tappedPeers = new WeakSet();
      peer.setRemoteDescription = function (...args) {
        if (!tappedPeers.has(this)) {
          tappedPeers.add(this);
          this.addEventListener("track", (event) => inboundTracks.add(event.track));
        }
        return setRemoteDescription.apply(this, args);
      };

      const webm = ${JSON.stringify(WEBM_HEADER)};
      const cluster = [0x1f, 0x43, 0xb6, 0x75];
      const hasSignature = (bytes, signature) =>
        bytes.some((byte, offset) => byte === signature[0] &&
          signature.every((expected, i) => bytes[offset + i] === expected));
      const observe = (label, bytes, type = "") => {
        if (type.startsWith("video/") || type.startsWith("audio/") ||
            hasSignature(bytes, webm) || hasSignature(bytes, cluster) ||
            bytes.byteLength >= 64 * 1024) {
          possibleRecordingMessages.push({ label, bytes: bytes.byteLength });
        }
      };
      const send = RTCDataChannel.prototype.send;
      RTCDataChannel.prototype.send = function (body) {
        const result = send.call(this, body);
        dataMessages += 1;
        if (body instanceof Blob) {
          pending.push(body.arrayBuffer().then(
            (buffer) => observe(this.label, new Uint8Array(buffer), body.type),
          ));
        } else if (typeof body === "string") {
          observe(this.label, new TextEncoder().encode(body));
        } else if (ArrayBuffer.isView(body)) {
          observe(this.label, new Uint8Array(body.buffer, body.byteOffset, body.byteLength));
        } else if (body instanceof ArrayBuffer) {
          observe(this.label, new Uint8Array(body));
        }
        return result;
      };

      window.__kmReadRecordingRtc = async () => {
        await Promise.all(pending);
        const recordingRoots = new Set([...recordingTracks].map((track) => originalTrack.get(track) || track));
        return {
          dataMessages,
          possibleRecordingMessages,
          recordingTracks: [...recordingTracks].map(describe),
          outboundTracks: [...outboundTracks].map(describe),
          outboundRecordingTracks: [...outboundTracks].filter((track) =>
            recordingRoots.has(originalTrack.get(track) || track),
          ).map(describe),
          inboundTracks: [...inboundTracks].map(describe),
        };
      };
    })()`,
  });
}

async function readRtcWitness(page: Page): Promise<RtcWitness> {
  return page.evaluate<RtcWitness>("window.__kmReadRecordingRtc()");
}

export async function readPeerRecordingPublications(
  page: Page,
): Promise<readonly TrackObservation[]> {
  return (await readRtcWitness(page)).inboundTracks;
}

export async function assertNoRtcRecordingEgress(
  recorder: Participant,
  peer: Participant,
  peerBaseline: readonly TrackObservation[],
  testInfo: TestInfo,
): Promise<void> {
  const fromRecorder = await readRtcWitness(recorder.page);
  const atPeer = await readRtcWitness(peer.page);
  await attachJson(testInfo, "rc-5-rtc-witness.json", {
    fromRecorder,
    atPeer,
    peerBaseline,
    scope:
      "Main-page RTCDataChannel payload signatures and size, MediaRecorder stream identity, RTP sender assignments, and remote track events. Transformed payloads without a signature and worker-only calls lie outside the browser witness.",
  });
  expect(fromRecorder.recordingTracks.map((track) => track.kind).sort()).toEqual([
    "audio",
    "video",
  ]);
  expect(fromRecorder.outboundTracks.map((track) => track.kind)).toEqual(
    expect.arrayContaining(["audio", "video"]),
  );
  expect(
    fromRecorder.dataMessages + atPeer.dataMessages,
    "room data sends are observed",
  ).toBeGreaterThan(0);
  expect(fromRecorder.possibleRecordingMessages, "no recording-shaped sends by A").toEqual([]);
  expect(atPeer.possibleRecordingMessages, "no recording-shaped sends by B").toEqual([]);
  expect(fromRecorder.outboundRecordingTracks, "no compositor or mixer output is sent").toEqual([]);
  // The native track event also reports negotiated receiver slots. The live meeting media is
  // verified independently by WC-8; use the original receiver identities to detect extra tracks.
  expect(
    peerBaseline.map((track) => track.kind),
    "B's baseline includes audio and video",
  ).toEqual(expect.arrayContaining(["audio", "video"]));
  expect(atPeer.inboundTracks, "B never receives an additional publication").toEqual(peerBaseline);
}

export async function verifyHttpUploadCanary(
  participant: Participant,
  testInfo: TestInfo,
  attachmentName: string,
): Promise<void> {
  const { page, net } = participant;
  await page.goto("/");
  let intercepted = 0;
  await page.route(`**${UPLOAD_PATH}/*`, (route) => {
    intercepted += 1;
    return route.fulfill({ status: 200, body: "intercepted locally" });
  });
  const statuses = await page.evaluate(
    async ({ path, signature }) => {
      const bytes = new Uint8Array(70_004);
      bytes.set(signature);
      // DevTools may omit Blob upload contents from postData, so exercise both representations.
      const responses = await Promise.all([
        fetch(`${path}/blob`, { method: "POST", body: new Blob([bytes], { type: "video/webm" }) }),
        fetch(`${path}/binary`, {
          method: "POST",
          body: bytes,
          headers: { "Content-Type": "video/webm" },
        }),
      ]);
      return responses.map(({ status }) => status);
    },
    { path: UPLOAD_PATH, signature: WEBM_HEADER },
  );
  const flagged = findRecordingEgress(await net.collect()).filter(({ target }) =>
    target.includes(UPLOAD_PATH),
  );
  await attachJson(testInfo, attachmentName, { statuses, intercepted, flagged });
  expect(statuses).toEqual([200, 200]);
  expect(intercepted, "both deliberate HTTP uploads are intercepted locally").toBe(2);
  expect(flagged).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        why: "WebM signature in body",
        target: expect.stringMatching(/\/binary$/),
      }),
      expect.objectContaining({
        why: "media fetch body video/webm",
        target: expect.stringMatching(/\/blob$/),
      }),
    ]),
  );
}

export async function verifyDataChannelCanary(page: Page, testInfo: TestInfo): Promise<void> {
  const receipt = await page.evaluate(
    async ({ label, signature }) => {
      const left = new RTCPeerConnection();
      const right = new RTCPeerConnection();
      const payload = [...signature, ...new TextEncoder().encode(label)];
      const deadline = AbortSignal.timeout(8_000);
      const timedOut = new Promise<never>((_, reject) => {
        deadline.addEventListener("abort", () =>
          reject(new Error("BLOCKED: disposable RTC channel timed out")),
        );
      });
      async function localDescription(
        peer: RTCPeerConnection,
        offerOrAnswer: RTCSessionDescriptionInit,
      ) {
        await peer.setLocalDescription(offerOrAnswer);
        if (peer.iceGatheringState !== "complete") {
          const gathered = new Promise<void>((resolve) => {
            peer.addEventListener("icegatheringstatechange", () => {
              if (peer.iceGatheringState === "complete") resolve();
            });
          });
          await Promise.race([gathered, timedOut]);
        }
        if (peer.localDescription === null)
          throw new Error("BLOCKED: disposable RTC description unavailable");
        return peer.localDescription;
      }
      try {
        const received = new Promise<number[]>((resolve) => {
          right.ondatachannel = ({ channel }) => {
            channel.binaryType = "arraybuffer";
            channel.onmessage = ({ data }: MessageEvent<ArrayBuffer>) =>
              resolve([...new Uint8Array(data)]);
          };
        });
        const channel = left.createDataChannel(label);
        const open = new Promise<void>((resolve) => {
          channel.onopen = () => resolve();
        });
        const offer = await localDescription(left, await left.createOffer());
        await right.setRemoteDescription(offer);
        const answer = await localDescription(right, await right.createAnswer());
        await left.setRemoteDescription(answer);
        await Promise.race([open, timedOut]);
        channel.send(new Uint8Array(payload));
        return { payload, observed: await Promise.race([received, timedOut]) };
      } finally {
        left.close();
        right.close();
      }
    },
    { label: CANARY_LABEL, signature: WEBM_HEADER },
  );
  const sent = await readRtcWitness(page);
  await attachJson(testInfo, "rc-5-rtc-canary.json", { receipt, sent });
  expect(receipt.observed, "the paired peer received the exact marked payload").toEqual(
    receipt.payload,
  );
  expect(
    sent.possibleRecordingMessages,
    "the data-channel observer detects the recording probe",
  ).toEqual([{ label: CANARY_LABEL, bytes: receipt.payload.length }]);
}
