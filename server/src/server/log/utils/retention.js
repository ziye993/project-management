import pool from '../../../db/logDb.js';

export async function cleanupOldLogs() {
  const start = Date.now();
  try {
    const [result] = await pool.execute(
      'DELETE FROM sys_log WHERE create_time < DATE_SUB(NOW(), INTERVAL 3 MONTH)',
    );
    const deleted = result.affectedRows ?? 0;
    console.log(`[LogRetention] Deleted ${deleted} logs, took ${Date.now() - start}ms`);
    return deleted;
  } catch (err) {
    console.error('[LogRetention] Failed:', err);
    throw err;
  }
}
