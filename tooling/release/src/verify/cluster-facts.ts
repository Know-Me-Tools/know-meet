/**
 * The cluster facts the Know Meet manifests depend on. Source of every value:
 * .kbd-orchestrator/phases/web-release/cluster-check.md (read-only check of 2026-11-15)
 * and the adopted contract's boundary packet. A name here is a name, never a value.
 */
export const HOSTNAME = "meet.know-me.tools";

export const APP_NAMESPACE = "know-meet";
export const SECRET_NAME = "know-meet-livekit";
/** Key names only. The values are never read. */
export const SECRET_KEYS: readonly string[] = [
  "LIVEKIT_URL",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
];

export const ENVOY_NAMESPACE = "envoy-gateway-system";
/** The image tag of the Envoy Gateway controller the manifests were written against. */
export const ENVOY_VERSION = "v1.10.0";

export const GATEWAY_API_VERSION = "gateway.networking.k8s.io/v1";
export const GATEWAY_NAME = "main-gateway";
export const GATEWAY_NAMESPACE = ENVOY_NAMESPACE;

export const CLUSTER_ISSUERS: readonly string[] = ["letsencrypt-staging", "letsencrypt-prod"];
export const EXTERNAL_DNS_NAMESPACE = "external-dns";
export const ARGOCD_NAMESPACE = "argocd";
