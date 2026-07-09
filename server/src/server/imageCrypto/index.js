import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import app from '../../app.js';
import { getDataDir } from '../../paths.js';
import { getConfig } from '../../utils/jsonFile.js';
import { ok, fail } from '../../utils/httpResponse.js';
import { normalizeImageCryptoSettings } from './normalizeSettings.js';

const META_DIR = path.join(getDataDir(), 'imageCrypto', 'meta');
const SESSION_DIR = path.join(getDataDir(), 'imageCrypto', 'sessions');
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function metaPath(storedName) {
  const safe = path.basename(storedName);
  return path.join(META_DIR, `${safe}.json`);
}

function sessionPath(sessionId) {
  const safe = sessionId.replace(/[^a-zA-Z0-9-]/g, '');
  return path.join(SESSION_DIR, `${safe}.json`);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function purgeExpiredSessions() {
  ensureDir(SESSION_DIR);
  const now = Date.now();
  for (const name of fs.readdirSync(SESSION_DIR)) {
    if (!name.endsWith('.json')) continue;
    const full = path.join(SESSION_DIR, name);
    try {
      const data = readJson(full);
      if (!data?.savedAt || now - data.savedAt > SESSION_TTL_MS) {
        fs.unlinkSync(full);
      }
    } catch {
      try { fs.unlinkSync(full); } catch { /* ignore */ }
    }
  }
}

function samplePresets(bounds, groupCount) {
  const lerp = (a, b, t) => a + (b - a) * t;
  const presets = [];
  for (let g = 0; g < groupCount; g++) {
    const t = groupCount <= 1 ? 0.5 : g / (groupCount - 1);
    presets.push({
      levelMin: Math.round(lerp(bounds.levelMin[0], bounds.levelMin[1], t)),
      levelMax: Math.round(lerp(bounds.levelMax[0], bounds.levelMax[1], t)),
      contrast: Math.round(lerp(bounds.contrast[0], bounds.contrast[1], t)),
      gamma: Number(lerp(bounds.gamma[0], bounds.gamma[1], t).toFixed(2)),
    });
  }
  return presets;
}

function boundsFromSettings(settings) {
  return {
    levelMin: [settings.revealLevelMin, settings.revealLevelMax],
    levelMax: [settings.revealLevelHighMin, settings.revealLevelHighMax],
    contrast: [settings.revealContrastMin, settings.revealContrastMax],
    gamma: [settings.revealGammaMin, settings.revealGammaMax],
  };
}

function refineBounds(bounds, presets, selectedIndex, groupCount) {
  const half = (key) => (bounds[key][1] - bounds[key][0]) / (2 * groupCount);
  const selected = presets[selectedIndex];
  if (!selected) return bounds;
  const next = { ...bounds };
  const refine = (key, value, global) => {
    const hw = half(key);
    next[key] = [Math.max(global[0], value - hw), Math.min(global[1], value + hw)];
  };
  refine('levelMin', selected.levelMin, bounds.levelMin);
  refine('levelMax', selected.levelMax, bounds.levelMax);
  refine('contrast', selected.contrast, bounds.contrast);
  refine('gamma', selected.gamma, bounds.gamma);
  return next;
}

app.post('/api/imageCrypto/saveMeta', (req, res) => {
  try {
    const { storedName, kind, params, paramString } = req.body ?? {};
    if (!storedName) return fail(res, 400, 1, 'storedName 不能为空');
    const record = {
      storedName: path.basename(storedName),
      kind: kind ?? 'generic',
      params: params ?? null,
      paramString: paramString ?? '',
      savedAt: Date.now(),
    };
    writeJson(metaPath(record.storedName), record);
    ok(res, { ok: true });
  } catch (error) {
    fail(res, 500, 1, error.message || '保存元数据失败');
  }
});

app.post('/api/imageCrypto/getMeta', (req, res) => {
  try {
    const { storedName } = req.body ?? {};
    if (!storedName) return fail(res, 400, 1, 'storedName 不能为空');
    const record = readJson(metaPath(storedName));
    if (!record) return fail(res, 404, 1, '未找到元数据');
    ok(res, {
      kind: record.kind,
      params: record.params,
      paramString: record.paramString,
      savedAt: record.savedAt,
    });
  } catch (error) {
    fail(res, 500, 1, error.message || '读取元数据失败');
  }
});

app.post('/api/imageCrypto/session/create', (req, res) => {
  try {
    purgeExpiredSessions();
    const { imageBase64 } = req.body ?? {};
    if (!imageBase64) return fail(res, 400, 1, 'imageBase64 不能为空');
    const settings = normalizeImageCryptoSettings(getConfig(true)?.imageCryptoSettings);
    const globalBounds = boundsFromSettings(settings);
    const presets = samplePresets(globalBounds, settings.presetGroupCount);
    const sessionId = randomUUID();
    const session = {
      sessionId,
      imageBase64,
      globalBounds,
      settings,
      rounds: [{
        roundIndex: 0,
        bounds: globalBounds,
        presets,
      }],
      savedAt: Date.now(),
    };
    writeJson(sessionPath(sessionId), session);
    ok(res, {
      sessionId,
      firstRound: session.rounds[0],
    });
  } catch (error) {
    fail(res, 500, 1, error.message || '创建会话失败');
  }
});

app.post('/api/imageCrypto/session/refine', (req, res) => {
  try {
    const { sessionId, roundIndex, selectedPresetIndex } = req.body ?? {};
    if (!sessionId) return fail(res, 400, 1, 'sessionId 不能为空');
    const session = readJson(sessionPath(sessionId));
    if (!session) return fail(res, 404, 1, '会话不存在或已过期');
    if (Date.now() - session.savedAt > SESSION_TTL_MS) {
      return fail(res, 410, 1, '会话已过期');
    }

    const round = session.rounds[roundIndex];
    if (!round) return fail(res, 400, 1, '轮次无效');

    round.selectedIndex = selectedPresetIndex;
    session.rounds = session.rounds.slice(0, roundIndex + 1);
    session.rounds[roundIndex] = round;

    const refinedBounds = refineBounds(
      round.bounds,
      round.presets,
      selectedPresetIndex,
      session.settings?.presetGroupCount ?? 4,
    );
    const nextRound = {
      roundIndex: roundIndex + 1,
      bounds: refinedBounds,
      presets: samplePresets(refinedBounds, session.settings?.presetGroupCount ?? 4),
    };
    session.rounds.push(nextRound);
    session.savedAt = Date.now();
    writeJson(sessionPath(sessionId), session);

    ok(res, {
      nextRound,
      done: session.rounds.length - 1 >= (session.settings?.minRefineRounds ?? 3),
    });
  } catch (error) {
    fail(res, 500, 1, error.message || '收窄失败');
  }
});

app.post('/api/imageCrypto/session/history', (req, res) => {
  try {
    const { sessionId } = req.body ?? {};
    if (!sessionId) return fail(res, 400, 1, 'sessionId 不能为空');
    const session = readJson(sessionPath(sessionId));
    if (!session) return fail(res, 404, 1, '会话不存在或已过期');
    ok(res, { rounds: session.rounds });
  } catch (error) {
    fail(res, 500, 1, error.message || '读取历史失败');
  }
});
