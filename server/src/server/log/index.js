import cron from 'node-cron';
import app from '../../app.js';
import './postLog.js';
import './manage/org.js';
import './manage/project.js';
import './manage/key.js';
import './manage/logQuery.js';
import './manage/auditQuery.js';
import { cleanupOldLogs } from './utils/retention.js';
import { fail, ok } from './utils/response.js';
import { authenticateToken, requireRealSuperAdmin } from '../../middleware/auth.js';

cron.schedule('0 0 * * 1', () => {
  cleanupOldLogs().catch(() => {});
});

app.post('/api/log/manage/retention/run', authenticateToken, requireRealSuperAdmin, async (req, res) => {
  try {
    const deleted = await cleanupOldLogs();
    ok(res, { deleted });
  } catch (err) {
    fail(res, 500, 9, err.message || '清理失败');
  }
});

console.log('[LogService] 日志中心模块已注册');
