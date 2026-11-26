# Browser-local speech asset notices

The versioned asset directory contains the desktop Chromium WebGPU profile.
Its manifest and relative file inventory are bound to the app. The app loads
these assets after the requester opts in. Captured speech and transcript text
stay in the browser.

- **Transformers.js 3.8.1** is Apache 2.0. The packaged browser bundle changes
  two import specifiers to point to local ONNX Runtime modules. It embeds
  **Hugging Face Jinja 0.5.3**, covered by the included MIT license.
  [Transformers.js release](https://github.com/huggingface/transformers.js/releases/tag/3.8.1)
  · [Jinja package](https://registry.npmjs.org/@huggingface/jinja/-/jinja-0.5.3.tgz)
- **ONNX Runtime Web and Common 1.22.0-dev.20250409-89f8206ba4** are MIT with
  the included Microsoft third-party notices. The WebGPU module and JSEP
  JavaScript and Wasm come from the matching release. Mozilla retains the
  exact upstream source commit and pins the same Wasm.
  [Source and notices](https://github.com/mozilla/onnxruntime/tree/89f8206ba4f1c22c39e0297fb55272e8ce8cd7d0)
  · [Firefox Wasm pin](https://raw.githubusercontent.com/mozilla-firefox/firefox/main/taskcluster/kinds/fetch/onnxruntime-web-fetch.yml)
- **Xenova Whisper Tiny.en** is an Apache 2.0 conversion of OpenAI Whisper
  Tiny.en. The FP32 encoder, Q4 decoder with cross-attention outputs, and
  tokenizer files come from revision `79fb389fc764e7c395bd330e9531d9d32ada7049`.
  The original OpenAI MIT license is also included.
  [Pinned model and conversion attribution](https://huggingface.co/Xenova/whisper-tiny.en/tree/79fb389fc764e7c395bd330e9531d9d32ada7049)

License text, original model README, and third-party notices are preserved
under the versioned directory's `vendor/notices` path.
