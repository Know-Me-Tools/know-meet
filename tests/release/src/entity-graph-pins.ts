/**
 * WC-11: entity graph 5.0.1 from npm in the web app and both spikes. Pure
 * checks over pnpm-lock.yaml and tooling/versions.toml text, so the oracle is
 * the committed resolution, not a claim. The negative control feeds the same
 * checks a lockfile that still pins 4.3.0 or 5.0.0 and requires a problem.
 */

export const EXPECTED_ENTITY_GRAPH_VERSION = "5.0.1";

export const ENTITY_GRAPH_PACKAGES: readonly string[] = [
  "@prometheus-ags/entity-graph-core",
  "@prometheus-ags/entity-graph-react",
];

/** One lockfile importer whose entity-graph pins WC-11 checks. */
export interface EntityGraphLockTarget {
  /** Lockfile path relative to the repo root. */
  readonly lockfile: string;
  /** Importer key inside that lockfile. */
  readonly importer: string;
  /** The entity-graph packages this importer depends on. */
  readonly packages: readonly string[];
}

/**
 * The web app (root workspace) and both agentic-ui spikes. The spikes are
 * standalone, outside the root workspace, so each has its own lockfile with
 * the importer "."; the hybrid spike depends on the core package only.
 */
export const ENTITY_GRAPH_LOCK_TARGETS: readonly EntityGraphLockTarget[] = [
  { lockfile: "pnpm-lock.yaml", importer: "apps/web", packages: ENTITY_GRAPH_PACKAGES },
  {
    lockfile: "spikes/agentic-ui/own/pnpm-lock.yaml",
    importer: ".",
    packages: ENTITY_GRAPH_PACKAGES,
  },
  {
    lockfile: "spikes/agentic-ui/hybrid/pnpm-lock.yaml",
    importer: ".",
    packages: ["@prometheus-ags/entity-graph-core"],
  },
];

interface ImporterPin {
  readonly importer: string;
  readonly name: string;
  readonly specifier: string;
  readonly version: string;
}

function importerPins(lock: string): ImporterPin[] {
  const pins: ImporterPin[] = [];
  let inImporters = false;
  let importer = "";
  let name = "";
  let specifier = "";
  for (const line of lock.split("\n")) {
    if (/^\S/.test(line)) inImporters = line.startsWith("importers:");
    if (!inImporters) continue;
    const importerMatch = /^ {2}(\S[^:]*):$/.exec(line);
    if (importerMatch !== null) {
      importer = importerMatch[1] ?? "";
      continue;
    }
    const nameMatch = /^ {6}'?(@?[^':]+)'?:$/.exec(line);
    if (nameMatch !== null) {
      name = nameMatch[1] ?? "";
      specifier = "";
      continue;
    }
    const specifierMatch = /^ {8}specifier: (.+)$/.exec(line);
    if (specifierMatch !== null) specifier = specifierMatch[1] ?? "";
    const versionMatch = /^ {8}version: (.+)$/.exec(line);
    if (versionMatch !== null && ENTITY_GRAPH_PACKAGES.includes(name)) {
      pins.push({ importer, name, specifier, version: versionMatch[1] ?? "" });
    }
  }
  return pins;
}

interface ResolvedPackage {
  readonly name: string;
  readonly version: string;
  readonly resolution: string;
}

function resolvedPackages(lock: string): ResolvedPackage[] {
  const out: ResolvedPackage[] = [];
  const lines = lock.split("\n");
  let inPackages = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (/^\S/.test(line)) inPackages = line.startsWith("packages:");
    if (!inPackages) continue;
    const match = /^ {2}'(@prometheus-ags\/entity-graph-(?:core|react))@([^':(]+)':$/.exec(line);
    if (match === null) continue;
    const next = lines[i + 1] ?? "";
    out.push({
      name: match[1] ?? "",
      version: match[2] ?? "",
      resolution: /^ {4}resolution: (.+)$/.exec(next)?.[1] ?? "",
    });
  }
  return out;
}

/**
 * Problems with one lockfile; empty when the importer resolves 5.0.1 from npm
 * with an integrity hash for every package it depends on.
 */
export function lockfileProblems(
  lock: string,
  importer = "apps/web",
  names: readonly string[] = ENTITY_GRAPH_PACKAGES,
): string[] {
  const problems: string[] = [];
  const pins = importerPins(lock);
  for (const name of names) {
    const pin = pins.find((p) => p.importer === importer && p.name === name);
    if (pin === undefined) {
      problems.push(`${importer}: ${name} is not an importer dependency`);
      continue;
    }
    const resolved = pin.version.split("(")[0] ?? "";
    if (pin.specifier !== EXPECTED_ENTITY_GRAPH_VERSION) {
      problems.push(`${importer}: ${name} specifier ${pin.specifier}`);
    }
    if (resolved !== EXPECTED_ENTITY_GRAPH_VERSION) {
      problems.push(`${importer}: ${name} resolves ${resolved}`);
    }
  }
  const packages = resolvedPackages(lock);
  for (const name of names) {
    const versions = packages.filter((p) => p.name === name);
    if (versions.length === 0) problems.push(`${name}: no resolved package`);
    for (const resolved of versions) {
      if (resolved.version !== EXPECTED_ENTITY_GRAPH_VERSION) {
        problems.push(`${name}: resolved package ${resolved.version} remains`);
      } else if (
        !/integrity: sha512-/.test(resolved.resolution) ||
        /tarball:|repo:|link:/.test(resolved.resolution)
      ) {
        problems.push(`${name}@${resolved.version}: not an npm registry integrity resolution`);
      }
    }
  }
  return problems;
}

/**
 * Problems with tooling/versions.toml: every entity-graph pin must be 5.0.1.
 * The separate prometheus_entity_management pin (generated shells) is not part
 * of WC-11 and is not checked.
 */
export function versionsTomlProblems(toml: string): string[] {
  const lines = toml
    .split("\n")
    .filter((line) => /^\s*entity[-_]?graph\b/i.test(line) && !line.trimStart().startsWith("#"));
  if (lines.length === 0) return ["tooling/versions.toml: no entity graph pin"];
  const problems: string[] = [];
  for (const line of lines) {
    const version = /=\s*"([^"]+)"/.exec(line)?.[1];
    if (version !== EXPECTED_ENTITY_GRAPH_VERSION) {
      problems.push(
        `tooling/versions.toml: "${line.trim()}" is not ${EXPECTED_ENTITY_GRAPH_VERSION}`,
      );
    }
  }
  return problems;
}
