/**
 * A persistent browser profile for the history scenario (WC-7): the same user
 * data directory is the same device. A different directory is a fresh profile.
 */
import type { BrowserContext, BrowserType, LaunchOptions } from "@playwright/test";

export interface ProfileOptions {
  readonly baseURL: string | undefined;
  readonly launchOptions: LaunchOptions;
  readonly browserName: string;
  /** Path for a HAR of this profile's traffic; omit for none. */
  readonly harPath?: string;
}

export async function launchProfile(
  browserType: BrowserType,
  userDataDir: string,
  options: ProfileOptions,
): Promise<BrowserContext> {
  const chromium = options.browserName === "chromium";
  return browserType.launchPersistentContext(userDataDir, {
    ...options.launchOptions,
    baseURL: options.baseURL ?? "",
    ...(chromium ? { permissions: ["camera", "microphone"] } : {}),
    ...(options.harPath === undefined
      ? {}
      : { recordHar: { path: options.harPath, content: "omit" as const } }),
  });
}
