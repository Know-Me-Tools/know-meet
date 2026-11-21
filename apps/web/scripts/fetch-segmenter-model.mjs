// TJ-ARCH-MOB-001 compliant
// One-time, operator-run fetch of the selfie segmentation model (wc07 task 7.1, WC-10).
// It is NOT part of any build: the app serves the file from public/ on its own origin, so
// the browser never contacts Google storage. Run it by hand, review the printed hash, then
// commit the model and the pin file together.
//
//   node scripts/fetch-segmenter-model.mjs --record   first time: write the pin file
//   node scripts/fetch-segmenter-model.mjs            later: refetch and verify against the pin
//
// The URL is the one @livekit/track-processors 0.8.3 uses by default, except that the
// version segment is pinned (`/1/`) instead of `/latest/`.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite";
const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const modelPath = here("../public/mediapipe/models/selfie-segmenter.tflite");
const pinPath = here("./segmenter-model.sha256");

const record = process.argv.includes("--record");
if (!record && !existsSync(pinPath)) {
  process.stderr.write("No pin file. Fetch once with --record, review the hash, commit both.\n");
  process.exit(1);
}

const response = await fetch(MODEL_URL);
if (!response.ok) {
  process.stderr.write(`Download failed: HTTP ${response.status}\n`);
  process.exit(1);
}
const bytes = Buffer.from(await response.arrayBuffer());
const sha256 = createHash("sha256").update(bytes).digest("hex");

if (record) {
  writeFileSync(pinPath, `${sha256}\n`);
} else if (readFileSync(pinPath, "utf8").trim() !== sha256) {
  process.stderr.write(`Hash mismatch: got ${sha256}\n`);
  process.exit(1);
}
mkdirSync(dirname(modelPath), { recursive: true });
writeFileSync(modelPath, bytes);
process.stdout.write(`${modelPath}\n${bytes.length} bytes\nsha256 ${sha256}\n`);
