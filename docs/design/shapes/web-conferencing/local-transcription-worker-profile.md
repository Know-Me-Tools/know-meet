# Browser-local speech: package handoff

Origin KM-LOCAL-MEETING-CATCHUP, KMT-1 through KMT-3. The hosted web candidate
mounts the separate LiveKit consent port and packages the reviewed browser
worker and English model. The model loads only after explicit opt-in. B4 stopped
at model initialization. The repaired profile requires the packaged B5 run.

- The candidate pins Transformers.js 3.8.1, ONNX Runtime Web/Common
  1.22.0-dev.20250409-89f8206ba4, and the Xenova Whisper Tiny.en ONNX export at
  revision `79fb389fc764e7c395bd330e9531d9d32ada7049`. The SHA-256 of the
  ordered inventory defines asset revision
  `c3ac7eaf209f1fbb10f7edcdd76ae129d488cfd2af53a1df22d8a0a860a83a9c`.
  The app pins a separate manifest SHA-256 and discloses 144,307,324 bytes
  for the manifest, model, and runtime files. See the
  [packaged notices](../../../../apps/web/public/capabilities/local-speech/README.md).
- The FP32 encoder and Q4 decoder with cross-attention produce word intervals.
  A completed capture window yields one searchable span when all word intervals
  are ordered and inside the submitted audio. A window with invalid alignment
  yields no settled text.
- Package approved runtime and model under the existing same-origin public capability directory without changing the build, CSP or verification process. Use a self-contained Transformers browser ESM bundle, reviewed local Wasm dependencies and exact model/tokenizer data. Content from the supplied path is an ordinary public static asset; no dynamic download route or CDN signal.
- Create a static manifest with assetRevision, bundle, modelRoot, modelKey, wasmRoot and an explicit files allowlist. URLs are root-relative below /capabilities/local-speech/<assetRevision>/. Independently calculate its manifest SHA-256 and exact advertised total bytes before offering the settings toggle. Only wire the opt-in once those data are available.
- Match outgoing worker configuration to the allowlist before handling any speech; remote model fetches disabled. No credentials on asset GETs, no redirects; fixed app origin. Existing CSP is not a claim that the worker is a general malicious-code sandbox. Qualify the trusted packaged artifact and independently observe the actual no-content-egress behavior at B4. Never loosen the application's policy to make a fixture pass.
- Optional LiveKit port consumes authenticated participant-session identity and true track incarnation. Peers' capability replies are not consent. UI must display the exact requester and retention prospect; no startup consent or auto-accept. No app calls receive PCM unless the fence minted and still recognizes its exact main-thread lease. Cut local tap and worker promptly on invalidation. Admission is not evidence of actual capture; UI requires an explicit current device/adapter start observation.
- Integrate a requester-only in-call panel and isolated text store only behind the exact admitted feature. Manually describe support/asset/lag fallback with no hosted speech. Actual model timing and consent/capture/storage require the three adopted synthetic cases in the packaged browser.

Primary references:
- https://github.com/huggingface/transformers.js/releases/tag/3.8.1
- https://huggingface.co/Xenova/whisper-tiny.en/tree/79fb389fc764e7c395bd330e9531d9d32ada7049
- https://huggingface.co/docs/transformers.js/api/env
- https://docs.livekit.io/transport/data/packets/
