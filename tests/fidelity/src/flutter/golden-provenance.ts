import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { BaselineManifest } from "../capture/baseline-manifest.ts";
import { listFiles, sha256File } from "../support/digests.ts";
import { TOKENS_JSON } from "../support/repo-paths.ts";

/** One approval entry (tests/fidelity/oracle/flutter-golden-provenance.json, entryShape). */
export interface GoldenApproval {
  readonly golden: string;
  readonly goldenSha256: string;
  readonly stateId: string;
  readonly theme: "dark" | "light";
  readonly prototypeBaseline: string;
  readonly prototypeBaselineSha256: string;
  readonly tokensSha256: string;
  readonly decision: "approved" | "rejected";
  readonly decidedBy: string;
  readonly decidedAt: string;
}

export interface ProvenanceFinding {
  readonly golden: string;
  readonly problem: string;
}

/**
 * Checks every golden PNG under `goldensDir` against its approvals record:
 * approved by design-lead, golden bytes unchanged since approval, prototype
 * baseline and tokens.json digests still current. Returns one finding per
 * problem; an empty list means the goldens may serve as the VS-3 oracle.
 */
export function checkGoldenProvenance(
  goldensDir: string,
  repoRelDir: string,
  manifest: BaselineManifest,
  tokensPath: string = TOKENS_JSON,
): ProvenanceFinding[] {
  const approvalsPath = join(goldensDir, "approvals.json");
  if (!existsSync(approvalsPath))
    return [{ golden: "(all)", problem: `missing approvals record ${approvalsPath}` }];
  const approvals = (
    JSON.parse(readFileSync(approvalsPath, "utf8")) as { approvals: GoldenApproval[] }
  ).approvals;
  const baselineDigests = new Map(
    manifest.baselines.map((b) => [`tests/fidelity/baselines/${b.path}`, b.sha256]),
  );
  const tokensSha = sha256File(tokensPath);
  const findings: ProvenanceFinding[] = [];
  const goldens = listFiles(goldensDir).filter((path) => path.endsWith(".png"));
  if (goldens.length === 0) findings.push({ golden: "(all)", problem: "no golden images found" });
  for (const file of goldens) {
    const golden = `${repoRelDir}/${file}`;
    const sha = sha256File(join(goldensDir, file));
    const approval = approvals.find((a) => a.golden === golden && a.goldenSha256 === sha);
    if (approval === undefined) {
      findings.push({ golden, problem: `no approval for its current bytes (sha256 ${sha})` });
      continue;
    }
    if (approval.decision !== "approved")
      findings.push({ golden, problem: `decision is ${approval.decision}` });
    if (approval.decidedBy !== "design-lead")
      findings.push({ golden, problem: `approved by ${approval.decidedBy}, not design-lead` });
    if (baselineDigests.get(approval.prototypeBaseline) !== approval.prototypeBaselineSha256) {
      findings.push({
        golden,
        problem: `prototype baseline ${approval.prototypeBaseline} changed since approval`,
      });
    }
    if (approval.tokensSha256 !== tokensSha)
      findings.push({ golden, problem: "docs/design/tokens.json changed since approval" });
  }
  return findings;
}

/** Hex colour tokens ("#RRGGBB") as Dart ARGB literals ("0xFFRRGGBB"). */
export function dartColourLiteral(hex: string): string | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  return match?.[1] === undefined ? null : `0xFF${match[1].toUpperCase()}`;
}
