/**
 * The operator-created Secret, checked by name and key names only.
 *
 * Reads, in order: the namespace list, the Secret list of the namespace (names), then
 * the key names of the one Secret. No value is requested in any output form, and a key
 * name is printed only when it is a legal Secret key name. An empty value therefore
 * cannot be detected: that would need a value or a value length.
 *
 * ORDERING: before the apply, namespace know-meet does not exist (the apply creates it),
 * so this check can pass before the apply only when the operator created the namespace
 * first. The failure text says which of namespace, Secret or key is missing.
 */
import { APP_NAMESPACE, SECRET_KEYS, SECRET_NAME } from "./cluster-facts.ts";
import { guarded, type Kubectl, nonEmptyLines, SECRET_KEYS_TEMPLATE } from "./kubectl.ts";
import type { Recorder } from "./report.ts";

const KEY_NAME = /^[-._a-zA-Z0-9]+$/;

function namesOf(lines: readonly string[]): string[] {
  return lines.map((line) => line.split("/").pop() ?? "");
}

function noNamespace(rec: Recorder): void {
  const missing = `namespace ${APP_NAMESPACE} does not exist`;
  rec.add("namespace-know-meet", "fail", `${missing}; the apply creates it`);
  const order = "the operator must create the namespace, then the Secret, before the apply";
  const cannot = `Secret ${SECRET_NAME} cannot exist: ${missing}`;
  rec.add("secret-know-meet-livekit", "fail", `${cannot}; ${order}`);
  rec.add("secret-keys", "skipped", "not checked: the Secret does not exist");
}

async function checkKeys(kc: Kubectl, rec: Recorder): Promise<void> {
  const out = await kc.run([
    "get",
    "secret",
    SECRET_NAME,
    "-n",
    APP_NAMESPACE,
    "-o",
    "go-template",
    "--template",
    SECRET_KEYS_TEMPLATE,
  ]);
  const found = nonEmptyLines(out).filter((line) => KEY_NAME.test(line));
  const missing = SECRET_KEYS.filter((key) => !found.includes(key));
  if (missing.length > 0) {
    const have = found.length === 0 ? "none" : found.join(", ");
    const lacks = `Secret ${SECRET_NAME} lacks key(s) ${missing.join(", ")}`;
    rec.add("secret-keys", "fail", `${lacks}; key names present: ${have}`);
    return;
  }
  const names = SECRET_KEYS.join(", ");
  rec.add("secret-keys", "pass", `Secret ${SECRET_NAME} has keys ${names} (values not read)`);
  const extra = found.filter((key) => !SECRET_KEYS.includes(key));
  if (extra.length > 0) rec.add("secret-extra-keys", "info", `other keys: ${extra.join(", ")}`);
}

export function checkNamespaceAndSecret(kc: Kubectl, rec: Recorder): Promise<void> {
  return guarded(rec, "secret-know-meet-livekit", async () => {
    const namespaces = namesOf(nonEmptyLines(await kc.run(["get", "namespaces", "-o", "name"])));
    if (!namespaces.includes(APP_NAMESPACE)) {
      noNamespace(rec);
      return;
    }
    rec.add("namespace-know-meet", "pass", `namespace ${APP_NAMESPACE} exists`);
    const listing = await kc.run(["get", "secrets", "-n", APP_NAMESPACE, "-o", "name"]);
    if (!namesOf(nonEmptyLines(listing)).includes(SECRET_NAME)) {
      rec.add(
        "secret-know-meet-livekit",
        "fail",
        `namespace ${APP_NAMESPACE} exists but Secret ${SECRET_NAME} is not in it`,
      );
      rec.add("secret-keys", "skipped", "not checked: the Secret does not exist");
      return;
    }
    rec.add("secret-know-meet-livekit", "pass", `Secret ${SECRET_NAME} exists in ${APP_NAMESPACE}`);
    await checkKeys(kc, rec);
  });
}
