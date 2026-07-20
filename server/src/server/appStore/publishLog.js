import pool from '../../db/logDb.js';
import { getConfig } from '../../utils/jsonFile.js';
import { getClientIp } from '../../middleware/access.js';
import { auditLog } from '../../middleware/auth.js';

/**
 * Resolve org/project/api_key ids for sys_log INSERT.
 * Prefer config.appStoreLog / config.appStore logging ids.
 */
function resolveLogIds() {
  const config = getConfig() || {};
  const logCfg = config.appStoreLog && typeof config.appStoreLog === 'object'
    ? config.appStoreLog
    : {};
  const apiKeyId = logCfg.apiKeyId ?? config.appStoreLogApiKeyId ?? null;
  const orgId = logCfg.orgId ?? config.appStoreLogOrgId ?? null;
  const projectId = logCfg.projectId ?? config.appStoreLogProjectId ?? null;
  return { apiKeyId, orgId, projectId };
}

/**
 * Record an appStore publish into sys_log; fall back to auditLog on failure.
 * content JSON fields per doc §9.
 */
export async function recordAppStorePublish(req, payload) {
  const {
    appId,
    ownerSlug,
    appSlug,
    appName,
    version,
    title,
    changelog,
    branch,
    fileName,
    fileSize,
    mime,
    uploader,
    channel,
    uploadedAt,
  } = payload || {};

  const clientIp = req.clientIp || getClientIp(req);
  const contentObj = {
    action: 'appStore.publish',
    appId: appId || '',
    ownerSlug: ownerSlug || '',
    appSlug: appSlug || '',
    appName: appName || '',
    version: version || '',
    title: title || '',
    changelog: changelog || '',
    branch: branch || '',
    fileName: fileName || '',
    fileSize: Number(fileSize) || 0,
    mime: mime || '',
    uploader: uploader || {
      userId: req.user?.id ?? null,
      username: req.user?.username || '',
    },
    clientIp: clientIp || '',
    channel: channel || req.channel || '',
    uploadedAt: uploadedAt || Date.now(),
  };

  const content = JSON.stringify(contentObj);
  const logTitle = `应用发布 ${ownerSlug}/${appSlug}@${version}`;
  const userAgent = String(req.headers?.['user-agent'] || '').slice(0, 500);
  const { apiKeyId, orgId, projectId } = resolveLogIds();

  // sys_log requires NOT NULL api_key_id/org_id/project_id — attempt INSERT when configured;
  // otherwise / on DB failure, fall back to auditLog (comment: schema forbids null FKs).
  if (apiKeyId != null && orgId != null && projectId != null) {
    try {
      await pool.execute(
        `INSERT INTO sys_log
          (api_key_id, org_id, project_id, level, module, title, content, data, trace_id, client_ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          apiKeyId,
          orgId,
          projectId,
          'INFO',
          'appStore',
          logTitle,
          content,
          null,
          null,
          clientIp || null,
          userAgent || null,
        ],
      );
      return { via: 'sys_log' };
    } catch (err) {
      console.error('[appStore.publishLog] sys_log INSERT failed, fallback auditLog', err);
    }
  }

  await auditLog(req, 'appStore.publish', 'appStore', appId || `${ownerSlug}/${appSlug}`, contentObj);
  return { via: 'auditLog' };
}
