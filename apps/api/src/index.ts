/**
 * HTTP entry point. Only the AI assistant is served so far; the ledger modules
 * (auth, customers, loans, payments, sync) will mount here as they land.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { chat, chatRequest, describeError } from './modules/ai/assistant.js';

try {
  process.loadEnvFile(new URL('../../../.env', import.meta.url));
} catch {
  // No .env — rely on the real environment.
}

const PORT = Number(process.env.PORT ?? 4000);
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:8081')
  .split(',')
  .map((o) => o.trim());
const MAX_BODY = 512 * 1024;

function cors(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw new Error('Body too large');
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function handleChat(req: IncomingMessage, res: ServerResponse) {
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body' });
  }
  const parsed = chatRequest.safeParse(body);
  if (!parsed.success) return sendJson(res, 400, { error: parsed.error.issues[0]?.message ?? 'Invalid request' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const send = (event: unknown) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  try {
    for await (const event of chat(parsed.data)) {
      if (res.destroyed) break;
      send(event);
    }
  } catch (error) {
    console.error('[ai/chat]', error);
    send({ type: 'error', message: describeError(error) });
  }
  res.end();
}

const server = createServer(async (req, res) => {
  cors(req, res);
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }
  if (req.method === 'GET' && path === '/health') return sendJson(res, 200, { ok: true });
  if (req.method === 'POST' && path === '/ai/chat') return handleChat(req, res);

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
