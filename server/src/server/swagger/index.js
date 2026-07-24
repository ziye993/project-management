import app from '../../app.js';
import { readJSONFile, writeJSONFile } from '../../utils/jsonFile.js';
import { ok, fail } from '../../utils/httpResponse.js';

const SWAGGER_CONFIG_FILE = 'swagger-config.json';

function emptyConfig() {
  return {
    version: 1,
    updatedAt: null,
    tabs: [],
    activeTabId: null,
  };
}

function loadSwaggerConfig() {
  const data = readJSONFile(SWAGGER_CONFIG_FILE, null);
  if (!data || typeof data !== 'object' || !Array.isArray(data.tabs)) {
    return emptyConfig();
  }
  return {
    version: typeof data.version === 'number' ? data.version : 1,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : null,
    tabs: data.tabs,
    activeTabId: typeof data.activeTabId === 'string' ? data.activeTabId : null,
  };
}

function normalizeIncomingTabs(tabs) {
  if (!Array.isArray(tabs)) return null;
  return tabs.filter(
    (tab) =>
      tab &&
      typeof tab === 'object' &&
      typeof tab.sourceUrl === 'string' &&
      tab.spec &&
      typeof tab.spec === 'object',
  );
}

app.post('/api/swagger/getConfig', (_req, res) => {
  ok(res, loadSwaggerConfig());
});

app.post('/api/swagger/setConfig', (req, res) => {
  const { tabs, activeTabId } = req.body ?? {};
  const normalizedTabs = normalizeIncomingTabs(tabs);
  if (!normalizedTabs) {
    return fail(res, 400, 1, 'tabs 格式无效');
  }

  const payload = {
    version: 1,
    updatedAt: Date.now(),
    tabs: normalizedTabs,
    activeTabId: typeof activeTabId === 'string' ? activeTabId : null,
  };

  try {
    writeJSONFile(SWAGGER_CONFIG_FILE, payload);
    ok(res, payload);
  } catch (err) {
    fail(res, 500, 1, err instanceof Error ? err.message : '保存失败');
  }
});
