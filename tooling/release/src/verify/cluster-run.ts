/**
 * Runs every verify-cluster check in a fixed order. A check that cannot be completed
 * is recorded as `incomplete`; the run goes on so one report names every problem, except
 * when the cluster API itself cannot be read (nothing else could be answered).
 */
import {
  checkApiVersions,
  checkArgoCd,
  checkClusterIssuers,
  checkEnvoyGateway,
  checkExternalDns,
  checkGatewayApi,
} from "./cluster-checks.ts";
import { checkExistingRouting } from "./cluster-routing.ts";
import { checkNamespaceAndSecret } from "./cluster-secret.ts";
import type { Kubectl } from "./kubectl.ts";
import type { Recorder } from "./report.ts";

export async function runClusterChecks(kc: Kubectl, rec: Recorder): Promise<void> {
  const versions = await checkApiVersions(kc, rec);
  if (versions === null) {
    rec.add("cluster-checks", "skipped", "not run: the cluster API could not be read");
    return;
  }
  checkGatewayApi(versions, rec);
  await checkEnvoyGateway(kc, rec);
  await checkClusterIssuers(kc, rec);
  await checkExternalDns(kc, rec);
  await checkArgoCd(kc, rec);
  await checkNamespaceAndSecret(kc, rec);
  await checkExistingRouting(kc, rec);
}
