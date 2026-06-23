import kill from 'tree-kill';

/**
 * 通用安全杀进程函数（含子进程树）
 * @param {import('child_process').ChildProcess} child 要杀掉的子进程对象
 * @param {string} signal 信号类型（默认 SIGINT）
 * @returns {Promise<boolean>} 是否成功杀掉
 */
export async function killChild(child, signal = 'SIGINT') {
    if (!child || !child.pid) return false;
    if (child.killed || child.exitCode !== null) return true;

    const exited = new Promise((resolve) => {
        const onExit = () => resolve(true);
        child.once('exit', onExit);
        child.once('close', onExit);
        setTimeout(() => resolve(false), 5000);
    });

    const signaled = await new Promise((resolve) => {
        kill(child.pid, signal, (err) => {
            resolve(!err);
        });
    });

    if (signaled) return exited;
    if (child.killed || child.exitCode !== null) return true;
    return exited;
}
