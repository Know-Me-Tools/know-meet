/**
 * Existing Gateway API and Certificate objects, and hostname conflicts.
 *
 * Reported as information: every GatewayClass, Gateway, HTTPRoute and Certificate that
 * already exists. Reported as a failure (the stop condition "the cluster differs from
 * the recorded facts in a way the manifests depend on"), when the apply would collide:
 *   1. main-gateway already exists with a listener hostname other than meet.know-me.tools,
 *      or a listener with no hostname (it matches every host);
 *   2. another Gateway has a listener whose hostname covers meet.know-me.tools;
 *   3. an HTTPRoute outside namespace know-meet carries a hostname that covers it;
 *   4. an HTTPRoute that is in know-meet, or attached to main-gateway, carries any other
 *      hostname, or an HTTPRoute outside know-meet attached to main-gateway has none.
 * Routes of other applications on other Gateways with other hostnames are not conflicts.
 */
import { APP_NAMESPACE, GATEWAY_NAME, GATEWAY_NAMESPACE, HOSTNAME } from "./cluster-facts.ts";
import { asArray, asString, dig, field, items } from "./json-access.ts";
import { guarded, type Kubectl, tryRead } from "./kubectl.ts";
import type { Recorder } from "./report.ts";

export interface GatewayInfo {
  readonly ns: string;
  readonly name: string;
  /** One entry per listener; `null` is a listener without a hostname. */
  readonly hostnames: readonly (string | null)[];
}

interface ParentRef {
  readonly ns: string;
  readonly name: string;
}

export interface RouteInfo {
  readonly ns: string;
  readonly name: string;
  readonly hostnames: readonly string[];
  readonly parents: readonly ParentRef[];
}

function nameOf(item: unknown): { ns: string; name: string } {
  return {
    ns: asString(dig(item, "metadata", "namespace")) ?? "",
    name: asString(dig(item, "metadata", "name")) ?? "",
  };
}

export function parseGateways(list: unknown): GatewayInfo[] {
  return items(list).map((item) => ({
    ...nameOf(item),
    hostnames: asArray(dig(item, "spec", "listeners")).map(
      (listener) => asString(field(listener, "hostname")) ?? null,
    ),
  }));
}

export function parseRoutes(list: unknown): RouteInfo[] {
  return items(list).map((item) => {
    const id = nameOf(item);
    return {
      ...id,
      hostnames: asArray(dig(item, "spec", "hostnames")).flatMap((h) => asString(h) ?? []),
      parents: asArray(dig(item, "spec", "parentRefs")).map((parent) => ({
        name: asString(field(parent, "name")) ?? "",
        ns: asString(field(parent, "namespace")) ?? id.ns,
      })),
    };
  });
}

/** Gateway API hostname matching: an exact name, or `*.suffix` covering one or more labels. */
export function hostCovers(pattern: string, host: string): boolean {
  const p = pattern.toLowerCase();
  const h = host.toLowerCase();
  if (p === h) return true;
  return p.startsWith("*.") && h.endsWith(p.slice(1)) && h.length > p.length - 1;
}

function gatewayConflicts(gateways: readonly GatewayInfo[], host: string): string[] {
  const out: string[] = [];
  for (const gateway of gateways) {
    const id = `Gateway ${gateway.ns}/${gateway.name}`;
    const ours = gateway.ns === GATEWAY_NAMESPACE && gateway.name === GATEWAY_NAME;
    for (const hostname of gateway.hostnames) {
      if (ours && hostname !== host) {
        const what = hostname === null ? "no hostname (matches all)" : `hostname ${hostname}`;
        out.push(`${id} already exists with a listener with ${what}`);
      } else if (!ours && hostname !== null && hostCovers(hostname, host)) {
        out.push(`${id} has a listener with hostname ${hostname}, which covers ${host}`);
      }
    }
  }
  return out;
}

function routeConflicts(routes: readonly RouteInfo[], host: string): string[] {
  const out: string[] = [];
  for (const route of routes) {
    const id = `HTTPRoute ${route.ns}/${route.name}`;
    const ours = route.ns === APP_NAMESPACE;
    const attached = route.parents.some(
      (parent) => parent.name === GATEWAY_NAME && parent.ns === GATEWAY_NAMESPACE,
    );
    if (!ours && route.hostnames.some((name) => hostCovers(name, host))) {
      out.push(`${id} has a hostname covering ${host} outside namespace ${APP_NAMESPACE}`);
    }
    const others = route.hostnames.filter((name) => name !== host);
    if ((ours || attached) && others.length > 0) {
      out.push(`${id} carries hostname ${others.join(", ")}`);
    }
    if (attached && !ours && route.hostnames.length === 0) {
      out.push(`${id} is attached to ${GATEWAY_NAME} with no hostname (matches every host)`);
    }
  }
  return out;
}

export function findConflicts(
  gateways: readonly GatewayInfo[],
  routes: readonly RouteInfo[],
  host: string,
): string[] {
  return [...gatewayConflicts(gateways, host), ...routeConflicts(routes, host)];
}

const SHOWN = 8;

function summarise(names: readonly string[]): string {
  if (names.length === 0) return "none";
  const more = names.length > SHOWN ? ` (+${names.length - SHOWN} more)` : "";
  return `${names.length}: ${names.slice(0, SHOWN).join(", ")}${more}`;
}

async function readGatewayClasses(kc: Kubectl, rec: Recorder): Promise<void> {
  const list = await kc.json(["get", "gatewayclasses.gateway.networking.k8s.io", "-o", "json"]);
  const names = items(list).map((item) => {
    const controller = asString(dig(item, "spec", "controllerName")) ?? "unknown controller";
    return `${nameOf(item).name} (${controller})`;
  });
  rec.add("existing-gatewayclasses", "info", `${summarise(names)}; none is required before apply`);
}

async function readCertificates(kc: Kubectl, rec: Recorder): Promise<void> {
  const list = await kc.json(["get", "certificates.cert-manager.io", "-A", "-o", "json"]);
  const names = items(list).map((item) => {
    const id = nameOf(item);
    const issuer = asString(dig(item, "spec", "issuerRef", "name")) ?? "?";
    return `${id.ns}/${id.name} (issuer ${issuer})`;
  });
  rec.add("existing-certificates", "info", summarise(names));
}

async function readGateways(kc: Kubectl, rec: Recorder): Promise<GatewayInfo[]> {
  const list = await kc.json(["get", "gateways.gateway.networking.k8s.io", "-A", "-o", "json"]);
  const gateways = parseGateways(list);
  rec.add("existing-gateways", "info", summarise(gateways.map((g) => `${g.ns}/${g.name}`)));
  return gateways;
}

async function readRoutes(kc: Kubectl, rec: Recorder): Promise<RouteInfo[]> {
  const list = await kc.json(["get", "httproutes.gateway.networking.k8s.io", "-A", "-o", "json"]);
  const routes = parseRoutes(list);
  rec.add("existing-httproutes", "info", summarise(routes.map((r) => `${r.ns}/${r.name}`)));
  return routes;
}

export async function checkExistingRouting(kc: Kubectl, rec: Recorder): Promise<void> {
  await guarded(rec, "existing-gatewayclasses", () => readGatewayClasses(kc, rec));
  const gateways = await tryRead(rec, "existing-gateways", () => readGateways(kc, rec));
  const routes = await tryRead(rec, "existing-httproutes", () => readRoutes(kc, rec));
  await guarded(rec, "existing-certificates", () => readCertificates(kc, rec));
  if (gateways === null || routes === null) {
    rec.add("hostname-conflicts", "skipped", "not checked: Gateways or HTTPRoutes were not read");
    return;
  }
  const conflicts = findConflicts(gateways, routes, HOSTNAME);
  if (conflicts.length === 0) {
    rec.add("hostname-conflicts", "pass", `no existing object conflicts with ${HOSTNAME}`);
  } else {
    rec.add("hostname-conflicts", "fail", conflicts.join("; "));
  }
}
