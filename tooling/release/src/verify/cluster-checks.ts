/**
 * Platform checks of verify-cluster: API reachability, Gateway API, Envoy Gateway,
 * the two ClusterIssuers, external-dns and Argo CD. Every read is `kubectl get` or
 * `kubectl api-versions`; none of the objects read here holds a Secret value.
 */
import {
  ARGOCD_NAMESPACE,
  CLUSTER_ISSUERS,
  ENVOY_NAMESPACE,
  ENVOY_VERSION,
  EXTERNAL_DNS_NAMESPACE,
  GATEWAY_API_VERSION,
} from "./cluster-facts.ts";
import { asArray, asString, dig, field, items } from "./json-access.ts";
import { failureText, guarded, type Kubectl, nonEmptyLines } from "./kubectl.ts";
import type { Recorder } from "./report.ts";
import { describeWorkload, isReady, parseWorkloads, type Workload } from "./workloads.ts";

/** Reads the served API versions. `null` when the cluster could not be read at all. */
export async function checkApiVersions(
  kc: Kubectl,
  rec: Recorder,
): Promise<readonly string[] | null> {
  try {
    const versions = nonEmptyLines(await kc.run(["api-versions"]));
    if (versions.length === 0) {
      rec.add("cluster-api", "incomplete", "api-versions printed nothing");
      return null;
    }
    const count = `${versions.length} API versions`;
    rec.add("cluster-api", "pass", `context ${kc.context} answers; ${count}`);
    return versions;
  } catch (error) {
    rec.add("cluster-api", "incomplete", failureText(error));
    return null;
  }
}

export function checkGatewayApi(versions: readonly string[], rec: Recorder): void {
  if (versions.includes(GATEWAY_API_VERSION)) {
    rec.add("gateway-api-v1", "pass", `${GATEWAY_API_VERSION} is served`);
  } else {
    rec.add("gateway-api-v1", "fail", `${GATEWAY_API_VERSION} is not served by this cluster`);
  }
}

/** The tag of an `envoyproxy/gateway` image, or undefined for any other image. */
function envoyGatewayTag(images: readonly string[]): string | undefined {
  for (const image of images) {
    const match = /(?:^|\/)envoyproxy\/gateway:([^@\s]+)/.exec(image);
    if (match?.[1] !== undefined) return match[1];
  }
  return undefined;
}

export function checkEnvoyGateway(kc: Kubectl, rec: Recorder): Promise<void> {
  const id = "envoy-gateway-controller";
  return guarded(rec, id, async () => {
    const list = await kc.json(["get", "deployments", "-n", ENVOY_NAMESPACE, "-o", "json"]);
    const found = parseWorkloads(list).flatMap((workload) => {
      const tag = envoyGatewayTag(workload.images);
      return tag === undefined ? [] : [{ workload, tag }];
    });
    const first = found[0];
    if (first === undefined) {
      rec.add(id, "fail", `no Deployment in ${ENVOY_NAMESPACE} runs an envoyproxy/gateway image`);
      return;
    }
    const problems: string[] = [];
    if (!isReady(first.workload)) problems.push("not ready");
    if (first.tag !== ENVOY_VERSION) problems.push(`image tag is not ${ENVOY_VERSION}`);
    const text = `${describeWorkload(first.workload)}, image tag ${first.tag}`;
    rec.add(id, problems.length === 0 ? "pass" : "fail", [text, ...problems].join("; "));
  });
}

function issuerState(issuer: unknown): { ready: boolean; reason: string } {
  const conditions = asArray(dig(issuer, "status", "conditions"));
  const ready = conditions.find((condition) => field(condition, "type") === "Ready");
  return {
    ready: field(ready, "status") === "True",
    reason: asString(field(ready, "reason")) ?? "no Ready condition",
  };
}

export function checkClusterIssuers(kc: Kubectl, rec: Recorder): Promise<void> {
  return guarded(rec, "cluster-issuers", async () => {
    const list = await kc.json(["get", "clusterissuers.cert-manager.io", "-o", "json"]);
    const byName = new Map<string, unknown>(
      items(list).map((item): [string, unknown] => [
        asString(dig(item, "metadata", "name")) ?? "",
        item,
      ]),
    );
    for (const name of CLUSTER_ISSUERS) {
      const id = `cluster-issuer-${name}`;
      const issuer = byName.get(name);
      if (issuer === undefined) {
        rec.add(id, "fail", `ClusterIssuer ${name} does not exist`);
        continue;
      }
      const state = issuerState(issuer);
      const text = `ClusterIssuer ${name} Ready=${state.ready} (${state.reason})`;
      rec.add(id, state.ready ? "pass" : "fail", text);
    }
  });
}

/** `--source=` values of the external-dns container, or null when none can be read. */
function externalDnsSources(workload: Workload): string[] | null {
  const sources = workload.args
    .filter((arg) => arg.startsWith("--source="))
    .map((arg) => arg.slice("--source=".length));
  return sources.length === 0 ? null : sources;
}

export function checkExternalDns(kc: Kubectl, rec: Recorder): Promise<void> {
  const id = "external-dns";
  return guarded(rec, id, async () => {
    const list = await kc.json(["get", "deployments", "-n", EXTERNAL_DNS_NAMESPACE, "-o", "json"]);
    const dns = parseWorkloads(list).find((w) => w.images.some((i) => i.includes("external-dns")));
    if (dns === undefined) {
      rec.add(id, "fail", `no Deployment in ${EXTERNAL_DNS_NAMESPACE} runs an external-dns image`);
      return;
    }
    const ready = isReady(dns);
    rec.add(id, ready ? "pass" : "fail", `${describeWorkload(dns)}${ready ? "" : " is not ready"}`);
    const sources = externalDnsSources(dns);
    const text = sources === null ? "sources not readable from container args" : sources.join(", ");
    const note = "gateway-httproute is the source that creates the record";
    rec.add("external-dns-sources", "info", `watches: ${text} (${note})`);
  });
}

export function checkArgoCd(kc: Kubectl, rec: Recorder): Promise<void> {
  const id = "argocd";
  return guarded(rec, id, async () => {
    const kinds = "deployments,statefulsets";
    const list = await kc.json(["get", kinds, "-n", ARGOCD_NAMESPACE, "-o", "json"]);
    const workloads = parseWorkloads(list);
    if (workloads.length === 0) {
      rec.add(id, "fail", `no Deployment or StatefulSet in ${ARGOCD_NAMESPACE}`);
      return;
    }
    const notReady = workloads.filter((workload) => !isReady(workload));
    const text = `${workloads.length - notReady.length}/${workloads.length} workloads ready`;
    const names = notReady.map(describeWorkload).join(", ");
    if (notReady.length === 0) rec.add(id, "pass", text);
    else rec.add(id, "fail", `${text}; not ready: ${names}`);
  });
}
