import pool from '../../db/logDb.js';
import { getConfig } from '../../utils/jsonFile.js';
import { getClientIp } from '../../middleware/access.js';
import { auditLog } from '../../middleware/auth.js';

/**
 * Prefer app's org/project; api_key_id = first active key of that project, else config fallback.
 * Same log.query permission covers these rows when filtered by org/project.
 */
async function resolveLogIds(app) {
  const orgId = app?.orgId != null ? Number(app.orgId) : null;
  const projectId = app?.projectId != null ? Number(app.projectId) : null;

  let apiKeyId = null;
  if (projectId) {
    try {
      const [rows] = await pool.execute(
        'SELECT id FROM sys_api_key WHERE project_id = ? AND status = 1 ORDER BY id ASC LIMIT 1',
        [projectId],
      );
      apiKeyId = rows[0]?.id ?? null;
    } catch {
      /* ignore */
    }
  }

  if (apiKeyId != null && orgId != null && projectId != null) {
    return { apiKeyId, orgId, projectId };
  }

  const config = getConfig() || {};
  const logCfg = config.appStoreLog && typeof config.appStoreLog === 'object'
    ? config.appStoreLog
    : {};
  return {
    apiKeyId: apiKeyId ?? logCfg.apiKeyId ?? config.appStoreLogApiKeyId ?? null,
    orgId: orgId ?? logCfg.orgId ?? config.appStoreLogOrgId ?? null,
    projectId: projectId ?? logCfg.projectId ?? config.appStoreLogProjectId ?? null,
  };
}

/**
 * Record an appStore publish into sys_log under the app's org/project.
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
    orgId: payloadOrgId,
    projectId: payloadProjectId,
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
    orgId: payloadOrgId ?? null,
    projectId: payloadProjectId ?? null,
    uploader: uploader || {
      userId: req.user?.id ?? null,
      username: req.user?.username || '',
    },
    clientIp: clientIp || '',
    channel: channel || req.channel || '',
    uploadedAt: uploadedAt || Date.now(),
  };

  const content = JSON.stringify(contentObj);
  const logTitle = `应用发布 ${appName || appSlug}@${version}`;
  const userAgent = String(req.headers?.['user-agent'] || '').slice(0, 500);
  const { apiKeyId, orgId, projectId } = await resolveLogIds({
    orgId: payloadOrgId,
    projectId: payloadProjectId,
  });

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
