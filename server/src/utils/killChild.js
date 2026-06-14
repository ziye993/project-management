import { platform } from 'os';
import kill from 'tree-kill';

/**
 * 通用安全杀进程函数
 * @param {ChildProcess} child 要杀掉的子进程对象
 * @param {string} signal 信号类型（默认 SIGINT）
 * @returns {Promise<boolean>} 是否成功杀掉
 */
export async function killChild(child, signal = 'SIGINT') {
    return new Promise((resolve) => {
        if (!child || !child.pid) return resolve(false);
        // 判断平台
        const isWin = platform() === 'win32';
        if (isWin) {
            // Windows 用 tree-kill
            kill(child.pid, signal, async (err) => {
                resolve(!err);
            });
        } else {
            try {
                // 尝试杀整个进程组（避免 npm 子进程残留）
                process.kill(-child.pid, signal);
                resolve(true);
            } catch {
                // 如果失败就杀单个
                try {
                    process.kill(child.pid, signal);
                    resolve(true);
                } catch {
                    resolve(false);
                }
            }
        }
    });
}