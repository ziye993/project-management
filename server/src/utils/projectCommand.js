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

export function spawnProjectScript(projectPath, scriptName) {
  const cwd = resolveExistingProjectPath(projectPath);

  const isWin = process.platform === 'win32';
  return spawn('npm', ['run', scriptName], {
    cwd,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    env: process.env,
    detached: !isWin,
  });
}
