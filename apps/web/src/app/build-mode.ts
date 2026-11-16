// TJ-ARCH-MOB-001 compliant
// The one place the hosted flag is read. vite.config.ts defines __KM_HOSTED__ from
// KM_BUILD_MODE (scripts/build-mode.ts): true only for build:hosted. Everything
// else in the app asks this constant, never the environment.

/** True in the hosted (public-site) build: home, join and meeting room only. */
export const HOSTED_BUILD: boolean = __KM_HOSTED__;
