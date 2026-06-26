import crypto from 'crypto';
import app from '../../app.js';
import { generateResponse } from './generateResponse.js';
import { buildMockBaseUrl, toPublicSession } from './session.js';
import {
  addManySessions,
  addOrUpdateSession,
  listSessions,
  removeSession,
  removeSessionsByFilter,
  restorePersistedSessions,
} from './store.js';
import { shutdownAllPortServers } from './portServer.js';

function sendOk(res, data) {
  res.send({ code: 0, success: true, msg: '', data });
}

function sendErr(res, msg, status = 400) {
  res.status(status).send({ code: 1, success: false, msg, data: null });
}

app.post('/api/mock/start', async (req, res) => {
  try {
    const {
      method,
      path: openApiPath,
      baseUrl,
      sourceUrl = '',
      fieldRules = {},
      arrayLengths = {},
      responseSchema,
    } = req.body ?? {};

    if (!method || !openApiPath || !responseSchema || !baseUrl) {
      return sendErr(res, '缺少 method、path、baseUrl 或 responseSchema');
    }

    const session = await addOrUpdateSession({
      method,
      openApiPath,
      baseUrl,
      sourceUrl,
      fieldRules,
      arrayLengths,
      responseSchema,
    });

    sendOk(res, toPublicSession(session));
  } catch (err) {
    sendErr(res, err instanceof Error ? err.message : '启动 Mock 失败', 500);
  }
});

import {
  buildDefaultFieldRules,
  collectMockableEndpoints,
  endpointRouteKey,
} from './openapi.js';

app.post('/api/mock/startAll', async (req, res) => {
  try {
    const { baseUrl, sourceUrl = '', spec, endpointRules = {} } = req.body ?? {};

    if (!baseUrl || !spec?.paths) {
      return sendErr(res, '缺少 baseUrl 或 spec');
    }

    const mockable = collectMockableEndpoints(spec);
    if (mockable.length === 0) {
      return sendErr(res, '没有可 Mock 的接口');
    }

    const items = mockable.map((ep) => {
      const rulesKey = endpointRouteKey(ep.method, ep.path);
      const custom = endpointRules[rulesKey] ?? {};
      return {
        method: ep.method,
        openApiPath: ep.path,
        baseUrl,
        sourceUrl,
        fieldRules: custom.fieldRules ?? buildDefaultFieldRules(ep.responseSchema),
        arrayLengths: custom.arrayLengths ?? {},
        responseSchema: ep.responseSchema,
      };
    });

    const sessions = await addManySessions(items);
    sendOk(res, {
      count: sessions.length,
      mockBaseUrl: buildMockBaseUrl(baseUrl),
      running: sessions.map(toPublicSession),
    });
  } catch (err) {
    sendErr(res, err instanceof Error ? err.message : '批量启动 Mock 失败', 500);
  }
});

app.post('/api/mock/stop', async (req, res) => {
  try {
    const { mockId } = req.body ?? {};
    if (!mockId) return sendErr(res, '缺少 mockId');

    const stopped = await removeSession(mockId);
    sendOk(res, { stopped });
  } catch (err) {
    sendErr(res, err instanceof Error ? err.message : '停止 Mock 失败', 500);
  }
});

app.post('/api/mock/stopAll', async (req, res) => {
  try {
    const { baseUrl, sourceUrl, mockIds } = req.body ?? {};
    const count = await removeSessionsByFilter({ baseUrl, sourceUrl, mockIds });
    sendOk(res, { stopped: count });
  } catch (err) {
    sendErr(res, err instanceof Error ? err.message : '停止 Mock 失败', 500);
  }
});

app.post('/api/mock/status', (_req, res) => {
  sendOk(res, { running: listSessions() });
});

app.post('/api/mock/preview', (req, res) => {
  const { responseSchema, fieldRules = {}, arrayLengths = {} } = req.body ?? {};
  if (!responseSchema) return sendErr(res, '缺少 responseSchema');
  sendOk(res, { body: generateResponse(responseSchema, { fieldRules, arrayLengths }) });
});

await restorePersistedSessions();

function gracefulShutdown() {
  shutdownAllPortServers();
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('exit', gracefulShutdown);
