/**
 * UI state for browser-local speech assets. This function neither downloads nor
 * inspects anything. The browser adapter must verify its local prerequisites
 * and translate the explicit requester action into an actual preparation.
 */
export interface LocalSpeechProfile {
  readonly label: string;
  readonly language: "en";
  readonly manifestDigest: string;
  readonly downloadBytes: number;
}

export type LocalSpeechProblem = "network" | "storage" | "integrity" | "runtime" | "cancelled";

export type LocalSpeechSetupState =
  | {
      readonly kind: "unsupported";
      readonly reason: "browser" | "compute" | "storage";
    }
  | { readonly kind: "choice"; readonly profile: LocalSpeechProfile }
  | {
      readonly kind: "preparing";
      readonly profile: LocalSpeechProfile;
      readonly token: string;
    }
  | { readonly kind: "ready"; readonly profile: LocalSpeechProfile }
  | {
      readonly kind: "failed";
      readonly profile: LocalSpeechProfile;
      readonly problem: LocalSpeechProblem;
    };

export type LocalSpeechSetupEvent =
  | {
      readonly kind: "request-preparation";
      readonly token: string;
      readonly offeredDigest: string;
    }
  | {
      readonly kind: "complete-preparation";
      readonly token: string;
      readonly verifiedDigest: string;
    }
  | {
      readonly kind: "preparation-failed";
      readonly token: string;
      readonly problem: LocalSpeechProblem;
    }
  | { readonly kind: "disable" | "assets-missing" };

/**
 * Each preparation token is unique for the browser adapter lifetime. It must
 * retain the active token locally; never accept a public-worker-supplied token
 * as the adapter's own readiness proof. Completion is not room consent.
 */
export function updateLocalSpeechSetup(
  state: LocalSpeechSetupState,
  event: LocalSpeechSetupEvent,
): LocalSpeechSetupState {
  if (state.kind === "unsupported") return state;
  const { profile } = state;
  switch (event.kind) {
    case "request-preparation":
      if (
        (state.kind !== "choice" && state.kind !== "failed") ||
        event.token === "" ||
        event.offeredDigest !== profile.manifestDigest ||
        !/^[0-9a-f]{64}$/.test(profile.manifestDigest) ||
        !Number.isSafeInteger(profile.downloadBytes) ||
        profile.downloadBytes <= 0
      )
        return state;
      return { kind: "preparing", profile, token: event.token };
    case "complete-preparation":
      if (state.kind !== "preparing" || event.token !== state.token) return state;
      return event.verifiedDigest === profile.manifestDigest
        ? { kind: "ready", profile }
        : { kind: "failed", profile, problem: "integrity" };
    case "preparation-failed":
      if (state.kind !== "preparing" || event.token !== state.token) return state;
      return { kind: "failed", profile, problem: event.problem };
    case "disable":
      return { kind: "choice", profile };
    case "assets-missing":
      return state.kind === "ready" || state.kind === "preparing"
        ? { kind: "failed", profile, problem: "storage" }
        : state;
  }
}
