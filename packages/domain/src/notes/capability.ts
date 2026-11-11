/** An entry in a capability registry (static web asset or host-provided). */
export interface Capability {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
}

/**
 * Merges capability lists by id. Order follows first appearance; when two
 * sources share an id, the later source's entry wins.
 */
export function mergeCapabilities(...sources: ReadonlyArray<readonly Capability[]>): Capability[] {
  const byId = new Map<string, Capability>();
  for (const source of sources) {
    for (const capability of source) byId.set(capability.id, capability);
  }
  return [...byId.values()];
}
