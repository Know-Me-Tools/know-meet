// TJ-ARCH-MOB-001 compliant
// Build-time mode switch for the web bundle. Node runs this file directly (type
// stripping), so it uses erasable TypeScript only. vite.config.ts and
// scripts/build-hosted.ts both resolve the mode here, so the flag, its default and
// the hosted prerequisites are defined once.
import { LIVEKIT_URL_ENV, livekitOrigins, MEDIA_ORIGINS_ENV } from "./content-security-policy.ts";

/** `hosted` selects the public-site build. Unset or empty is the default build. */
export const BUILD_MODE_ENV = "KM_BUILD_MODE";

export type BuildMode = "default" | "hosted";

/** Global constant vite.config.ts defines; src/app/build-mode.ts is the only reader. */
export const HOSTED_DEFINE = "__KM_HOSTED__";

/** Output directory of the hosted bundle, relative to apps/web. The default build keeps `dist`. */
export const HOSTED_OUT_DIR = "dist-hosted";

export type BuildEnv = Readonly<Record<string, string | undefined>>;

export interface BuildInputs {
  readonly mode: BuildMode;
  readonly hosted: boolean;
  readonly livekitUrl: string | undefined;
  readonly mediaOrigins: string | undefined;
}

export function parseBuildMode(raw: string | undefined): BuildMode {
  const value = raw?.trim() ?? "";
  if (value === "") return "default";
  if (value === "hosted") return "hosted";
  throw new Error(`${BUILD_MODE_ENV} must be "hosted" or unset; got "${value}"`);
}

/**
 * Reads the mode and the CSP inputs from the environment. A hosted build also needs
 * the public LiveKit signalling URL: the browser connects to it from the page, so
 * without it in connect-src every meeting would be blocked. The URL is a public
 * hostname, not a secret. LiveKit API credentials are never read here.
 */
export function resolveBuildInputs(env: BuildEnv): BuildInputs {
  const mode = parseBuildMode(env[BUILD_MODE_ENV]);
  const livekitUrl = env[LIVEKIT_URL_ENV];
  const mediaOrigins = env[MEDIA_ORIGINS_ENV];
  if (mode === "hosted") {
    if (livekitUrl === undefined || livekitUrl.trim() === "") {
      throw new Error(
        `The hosted build needs ${LIVEKIT_URL_ENV}: the public LiveKit signalling URL, ` +
          `for example wss://livekit.example.com. It is not a secret. ` +
          `Without it the Content-Security-Policy would block every meeting connection.`,
      );
    }
    // Throws on anything but a bare wss:// origin.
    livekitOrigins(livekitUrl);
  }
  return { mode, hosted: mode === "hosted", livekitUrl, mediaOrigins };
}

/** vite `define` entries for a build. Only a boolean enters the bundle. */
export function buildDefines(inputs: BuildInputs): Record<string, string> {
  return { [HOSTED_DEFINE]: JSON.stringify(inputs.hosted) };
}

/** Output directory override: hosted only, so the default build config is unchanged. */
export function outDirOverride(inputs: BuildInputs): { readonly outDir?: string } {
  return inputs.hosted ? { outDir: HOSTED_OUT_DIR } : {};
}
