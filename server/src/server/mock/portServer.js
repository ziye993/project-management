import http from 'http';
import express from 'express';
import cors from 'cors';
import { generateResponse } from './generateResponse.js';
import { getMockGlobalDefaults } from './mockConfig.js';

/** 同端口共用一个 HTTP 服务（进程内，非 fork 子进程）；主进程退出时统一关闭。 */
const portServers = new Map();

function createPortApp(port, matchSession) {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  // Express 5 不支持 '*' 通配路由，用无 path 的中间件兜底
  app.use((req, res) => {
    const session = matchSession(port, req.method, req.path);
    if (!session) {
      return res.status(404).json({ code: 404, success: false, msg: 'mock route not found', data: null });
    }
    const body = generateResponse(session.responseSchema, {
      fieldRules: session.fieldRules,
      arrayLengths: session.arrayLengths,
      globalDefaults: getMockGlobalDefaults(),
    });
    res.json(body);
  });

  return app;
}

export function getActivePorts() {
  return [...portServers.keys()];
}

export async function ensurePortServer(port, matchSession) {
  if (portServers.has(port)) return portServers.get(port);

  const app = createPortApp(port, matchSession);
  const server = http.createServer(app);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve());
  });

  const entry = { port, server, app };
  portServers.set(port, entry);
  console.log(`[mock] listening on http://127.0.0.1:${port}`);
  return entry;
}

export async function releasePortIfIdle(port, hasSessionsOnPort) {
  if (hasSessionsOnPort(port)) return;
  const entry = portServers.get(port);
  if (!entry) return;

  await new Promise((resolve) => {
    entry.server.close(() => resolve());
  });
  portServers.delete(port);
  console.log(`[mock] stopped port ${port}`);
}

export function shutdownAllPortServers() {
  for (const [port, entry] of portServers.entries()) {
    try {
      entry.server.close();
    } catch {
      /* ignore */
    }
    portServers.delete(port);
    console.log(`[mock] shutdown port ${port}`);
  }
}
