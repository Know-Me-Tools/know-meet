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

/** The web app and both agentic-ui spikes. */
export const ENTITY_GRAPH_IMPORTERS: readonly string[] = [
  "apps/web",
  "spikes/agentic-ui/own",
  "spikes/agentic-ui/hybrid",
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

/** Problems with the lockfile; empty when every importer resolves 5.0.1 from npm with an integrity hash. */
export function lockfileProblems(lock: string): string[] {
  const problems: string[] = [];
  const pins = importerPins(lock);
  for (const importer of ENTITY_GRAPH_IMPORTERS) {
    for (const name of ENTITY_GRAPH_PACKAGES) {
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
  }
  const packages = resolvedPackages(lock);
  for (const name of ENTITY_GRAPH_PACKAGES) {
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

/** Problems with tooling/versions.toml: every entity-graph or entity-management pin must be 5.0.1. */
export function versionsTomlProblems(toml: string): string[] {
  const lines = toml
    .split("\n")
    .filter(
      (line) => /entity[-_]?(graph|management)/i.test(line) && !line.trimStart().startsWith("#"),
    );
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
