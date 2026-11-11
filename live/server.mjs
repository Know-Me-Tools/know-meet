#!/usr/bin/env node
// Know Meet Live — local dev server.
// Serves the prototype from this folder and mints short-lived LiveKit access tokens.
// The API secret stays in this process; the browser only ever receives a signed JWT.
//
// Env: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET (required); PORT, HOST (optional).
// No npm dependencies: tokens are HS256 JWTs signed with node:crypto.

import http from 'node:http';
import { createHmac, randomBytes } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || '127.0.0.1';
const TOKEN_TTL_SECONDS = 60 * 60 * 2;
const MAX_BODY_BYTES = 4096;
const CODE_RE = /^km-[a-z0-9]{3}-[a-z0-9]{3}$/;
const NAME_MAX = 60;

const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env;
const missing = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[know-meet] Missing environment variables: ${missing.join(', ')}`);
  console.error('[know-meet] Run ./start.sh (it loads ~/.bash_profile) or export them first.');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};
// Server-only files that must never be served.
const PRIVATE = new Set(['server.mjs', 'start.sh']);

const b64url = (input) => Buffer.from(input).toString('base64url');

function signToken({ identity, name, room, metadata }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iss: LIVEKIT_API_KEY,
    sub: identity,
    name,
    nbf: now - 10,
    exp: now + TOKEN_TTL_SECONDS,
    jti: randomBytes(8).toString('hex'),
    metadata,
    video: {
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    },
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = createHmac('sha256', LIVEKIT_API_SECRET).update(unsigned).digest('base64url');
  return `${unsigned}.${sig}`;
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) { reject(new Error('too-large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function cleanName(v) {
  return String(v || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, NAME_MAX);
}

async function handleToken(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Use POST.' });
  let body;
  try { body = JSON.parse((await readBody(req)) || '{}'); }
  catch { return sendJson(res, 400, { ok: false, error: 'Request body must be JSON under 4 KB.' }); }

  const room = String(body.room || '').trim().toLowerCase();
  const name = cleanName(body.name);
  const role = body.role === 'host' ? 'host' : 'guest';
  if (!CODE_RE.test(room)) return sendJson(res, 400, { ok: false, error: 'Meeting codes look like km-4fq-82x.' });
  if (!name) return sendJson(res, 400, { ok: false, error: 'Enter the name to show on your tile.' });

  const identity = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'guest'}-${randomBytes(3).toString('hex')}`;
  const metadata = JSON.stringify({ role, app: 'know-meet-live' });
  const token = signToken({ identity, name, room, metadata });
  return sendJson(res, 200, { ok: true, data: { url: LIVEKIT_URL, token, identity, room, expiresIn: TOKEN_TTL_SECONDS } });
}

async function handleStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { res.writeHead(400); res.end(); return; }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const filePath = normalize(join(ROOT, pathname));
  const rel = filePath.slice(ROOT.length + 1);
  if (!filePath.startsWith(ROOT + sep) || PRIVATE.has(rel) || rel.split(sep).some((p) => p.startsWith('.'))) {
    res.writeHead(404); res.end('Not found'); return;
  }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not a file');
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(self), microphone=(self), display-capture=(self), geolocation=()',
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/token') return await handleToken(req, res);
    if (url.pathname === '/api/status') {
      return sendJson(res, 200, { ok: true, data: { url: LIVEKIT_URL, keyHint: `${LIVEKIT_API_KEY.slice(0, 4)}…`, tokenTtl: TOKEN_TTL_SECONDS } });
    }
    return await handleStatic(req, res);
  } catch (err) {
    console.error('[know-meet] request failed:', err);
    if (!res.headersSent) sendJson(res, 500, { ok: false, error: 'Server error — see the terminal running start.sh.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[know-meet] Know Meet Live on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`[know-meet] LiveKit server: ${LIVEKIT_URL}`);
});
