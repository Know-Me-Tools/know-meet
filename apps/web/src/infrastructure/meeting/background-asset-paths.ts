// TJ-ARCH-MOB-001 compliant
import type { BackgroundAssetPaths } from "@know-meet/realtime";

/**
 * Same-origin locations of the background processor's files (wc07 task 7.1). The WASM set
 * is copied from `@mediapipe/tasks-vision` at build time (scripts/mediapipe-assets-plugin.ts);
 * the model is vendored under public/ (scripts/fetch-segmenter-model.mjs). Root-relative,
 * so the web build and the Tauri host (same bundle) resolve them against their own origin.
 */
export const BACKGROUND_ASSET_PATHS: BackgroundAssetPaths = {
  tasksVisionFileSet: "/mediapipe/wasm",
  modelAssetPath: "/mediapipe/models/selfie-segmenter.tflite",
};
