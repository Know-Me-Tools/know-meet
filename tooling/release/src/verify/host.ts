/**
 * `--host` is one bare DNS hostname: no scheme, path, port, credentials, query, trailing
 * dot, IP literal or single label. The tool connects only to the name it was given.
 */
import { UsageError } from "./report.ts";

/** Two or more labels; the last starts with a letter, so an IPv4 literal cannot match. */
const HOST_PATTERN =
  /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;

export function parseHost(text: string): string {
  const host = text.toLowerCase();
  if (!HOST_PATTERN.test(host)) {
    throw new UsageError(
      "ERROR usage --host must be one bare hostname, for example meet.know-me.tools " +
        "(no scheme, path, port or credentials)",
    );
  }
  return host;
}
