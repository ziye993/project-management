import crypto from 'crypto';
import app from '../../app.js';
import { SERVER_PORT } from '../../const.js';
import { generateResponse } from './generateResponse.js';
import {
  buildExamplePath,
  buildMockPath,
  buildPathRegex,
  clearActiveSession,
  extractContextPath,
  getActiveSession,
  setActiveSession,
} from './session.js';

function sendOk(res, data) {
  res.send({ code: 0, success: true, msg: '', data });
}

function sendErr(res, msg, status = 400) {
  res.status(status).send({ code: 1, success: false, msg, data: null });
}

app.post('/api/mock/start', (req, res) => {
  const {
    method,
    path: openApiPath,
    baseUrl,
    fieldRules = {},
    arrayLengths = {},
    responseSchema,
  } = req.body ?? {};

  if (!method || !openApiPath || !responseSchema) {
    return sendErr(res, '缺少 method、path 或 responseSchema');
  }

  const contextPath = extractContextPath(baseUrl || '');
  const mockPath = buildMockPath(contextPath, openApiPath);
  const mockId = crypto.randomBytes(6).toString('hex');

  clearActiveSession();
  setActiveSession({
    mockId,
    method: String(method).toLowerCase(),
    openApiPath,
    contextPath,
    mockPath,
    pathRegex: buildPathRegex(mockPath),
    fieldRules,
    arrayLengths,
    responseSchema,
    startedAt: Date.now(),
  });

  const host = req.get('host') || `localhost:${SERVER_PORT}`;
  const protocol = req.protocol || 'http';
  const examplePath = buildExamplePath(mockPath);
  const mockUrl = `${protocol}://${host}${examplePath}`;

  sendOk(res, {
    mockId,
    mockUrl,
    method: String(method).toLowerCase(),
    mockPath,
  });
});

app.post('/api/mock/stop', (req, res) => {
  const { mockId } = req.body ?? {};
  const session = getActiveSession();

  if (!session) {
    return sendOk(res, { stopped: false });
  }

  if (mockId && session.mockId !== mockId) {
    return sendErr(res, 'Mock 会话不存在或已停止');
  }

  clearActiveSession();
  sendOk(res, { stopped: true });
});

app.post('/api/mock/status', (_req, res) => {
  const session = getActiveSession();
  if (!session) {
    return sendOk(res, { running: [] });
  }

  const { mockId, method, openApiPath, mockPath, startedAt } = session;
  sendOk(res, {
    running: [{ mockId, method, path: openApiPath, mockPath, startedAt }],
  });
});

// Intercept mock requests at the same path as the real API (before SPA fallback).
app.use((req, res, next) => {
  const session = getActiveSession();
  if (!session) return next();

  if (req.method.toLowerCase() !== session.method) return next();
  if (!session.pathRegex.test(req.path)) return next();

  const body = generateResponse(session.responseSchema, {
    fieldRules: session.fieldRules,
    arrayLengths: session.arrayLengths,
  });

  res.json(body);
});
