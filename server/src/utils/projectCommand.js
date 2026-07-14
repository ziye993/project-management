import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export function resolveExistingProjectPath(projectPath) {
  if (!projectPath || typeof projectPath !== 'string') {
    throw new Error('无效的项目路径');
  }

  const normalized = path.normalize(projectPath.trim());
  const resolved = path.isAbsolute(normalized)
    ? normalized
    : path.resolve(normalized);

  if (!fs.existsSync(resolved)) {
    throw new Error(`项目路径不存在: ${resolved}`);
  }

  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`项目路径不是文件夹: ${resolved}`);
  }

  return resolved;
}

/**
 * systemd / GUI 启动时 PATH 通常不含 nvm，导致 pnpm/npm 找不到。
 * 把当前 node 所在目录（同目录一般有 npm、pnpm、corepack）前置到 PATH。
 */
function buildChildEnv() {
  const env = { ...process.env };
  const pathKey = process.platform === 'win32' ? 'Path' : 'PATH';
  const nodeBin = path.dirname(process.execPath);
  const parts = (env[pathKey] || '').split(path.delimiter).filter(Boolean);
  if (!parts.includes(nodeBin)) {
    env[pathKey] = [nodeBin, ...parts].join(path.delimiter);
  }
  return env;
}

export function spawnProjectScript(projectPath, scriptName) {
  const cwd = resolveExistingProjectPath(projectPath);

  const isWin = process.platform === 'win32';
  return spawn('npm', ['run', scriptName], {
    cwd,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    env: buildChildEnv(),
    detached: !isWin,
  });
}

export function spawnCustomShellCommand(projectPath, command) {
  const cwd = resolveExistingProjectPath(projectPath);
  const isWin = process.platform === 'win32';
  return spawn(command, [], {
    cwd,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    env: buildChildEnv(),
    detached: !isWin,
  });
}
