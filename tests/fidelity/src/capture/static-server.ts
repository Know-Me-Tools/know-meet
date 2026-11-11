import { createReadStream, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize, sep } from "node:path";

const MIME: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

export interface StaticServer {
  readonly origin: string;
  close(): Promise<void>;
}

/**
 * Read-only static server. `/` maps to `root` (docs/design); `/__fonts/` maps
 * to the self-hosted font directory. Only GET and HEAD are answered; paths that
 * escape a root are refused. Nothing is ever written.
 */
export async function startStaticServer(root: string, fontsDir: string): Promise<StaticServer> {
  const server: Server = createServer((request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405).end();
      return;
    }
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://local").pathname);
    const [base, rest] = pathname.startsWith("/__fonts/")
      ? [fontsDir, pathname.slice("/__fonts/".length)]
      : [root, pathname];
    const file = resolveInside(base, rest);
    if (file === null) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(file).pipe(response);
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const { port } = server.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((done) => server.close(() => done())),
  };
}

function resolveInside(base: string, requested: string): string | null {
  const candidate = normalize(join(base, requested));
  if (candidate !== base && !candidate.startsWith(base + sep)) return null;
  try {
    const stat = statSync(candidate);
    if (stat.isDirectory()) {
      const index = join(candidate, "index.html");
      return statSync(index).isFile() ? index : null;
    }
    return stat.isFile() ? candidate : null;
  } catch {
    return null;
  }
}
