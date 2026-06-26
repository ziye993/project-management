import { readJSONFile, writeJSONFile } from '../../utils/jsonFile.js';
import { buildPathRegex } from './session.js';

const MOCK_FILE = 'mock-sessions.json';

export function loadPersistedSessions() {
  const data = readJSONFile(MOCK_FILE, { sessions: [] });
  const list = Array.isArray(data.sessions) ? data.sessions : [];
  return list.map((item) => ({
    ...item,
    pathRegex: buildPathRegex(item.mockPath),
  }));
}

export function savePersistedSessions(sessions) {
  const payload = sessions.map((s) => ({
    mockId: s.mockId,
    method: s.method,
    openApiPath: s.openApiPath,
    baseUrl: s.baseUrl,
    sourceUrl: s.sourceUrl ?? '',
    port: s.port,
    contextPath: s.contextPath,
    mockPath: s.mockPath,
    fieldRules: s.fieldRules ?? {},
    arrayLengths: s.arrayLengths ?? {},
    responseSchema: s.responseSchema,
    startedAt: s.startedAt,
  }));
  writeJSONFile(MOCK_FILE, { sessions: payload });
}
