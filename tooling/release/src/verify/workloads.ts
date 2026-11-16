/**
 * Readiness of Deployments and StatefulSets read from a kubectl List document.
 * Container arguments are kept only so a caller can pick out named flags; they are
 * never printed whole.
 */
import { asArray, asNumber, asString, dig, field, isString, items } from "./json-access.ts";

export interface Workload {
  readonly kind: string;
  readonly name: string;
  readonly images: readonly string[];
  readonly args: readonly string[];
  readonly desired: number;
  readonly ready: number;
}

export function parseWorkloads(list: unknown): Workload[] {
  return items(list).map((item) => {
    const containers = asArray(dig(item, "spec", "template", "spec", "containers"));
    return {
      kind: asString(field(item, "kind")) ?? "Workload",
      name: asString(dig(item, "metadata", "name")) ?? "",
      images: containers.map((container) => field(container, "image")).filter(isString),
      args: containers
        .flatMap((c) => [...asArray(field(c, "command")), ...asArray(field(c, "args"))])
        .filter(isString),
      desired: asNumber(dig(item, "spec", "replicas")),
      ready: asNumber(dig(item, "status", "readyReplicas")),
    };
  });
}

/** Running means at least one replica is wanted and every wanted replica is ready. */
export function isReady(workload: Workload): boolean {
  return workload.desired > 0 && workload.ready >= workload.desired;
}

export function describeWorkload(workload: Workload): string {
  return `${workload.kind} ${workload.name} ${workload.ready}/${workload.desired}`;
}
