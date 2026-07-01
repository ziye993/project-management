import app from '../../app.js';
import { spawn } from 'child_process';
import { killChild } from '../../utils/killChild.js';
import getProjectList, {
  addProjects,
  buildSingleProject,
  removeProjectByPath,
  scanWorkspaceFolder,
} from '../../utils/initConfig.js';
import { computeColorGroups, getProjectColorMap } from '../../utils/workspaceColors.js';
import { getColorCache } from '../../utils/jsonFile.js';
import { makeRunKey, parseRunKey } from '../../utils/runKey.js';
import { decodeOutput } from '../../utils/decodeOutput.js';
import { appendCommandLog, ensureCommandLog, getCommandLogs ,clearCommandLog} from '../../utils/commandLogs.js';
import { resolveExistingProjectPath, spawnProjectScript } from '../../utils/projectCommand.js';

let projectList = getProjectList();
let currentChild = {};
const logs = getCommandLogs(true);

export async function cleanupProjectProcesses() {
  const keys = Object.keys(currentChild).filter(k => !!currentChild[k]);
  if (!keys.length) return;

  console.log('\nCleaning up child processes...');
  let successCount = 0;
  for (const key of keys) {
    try {
      const killed = await killChild(currentChild[key], 'SIGTERM');
      if (killed) successCount += 1;
    } catch (error) {
      console.log(error);
    }
  }
  currentChild = {};
  console.log(`Cleanup done: ${successCount}/${keys.length}`);
}

process.on('SIGINT', () => { cleanupProjectProcesses().then(() => process.exit()); });
process.on('SIGTERM', () => { cleanupProjectProcesses().then(() => process.exit()); });

function ok(res, data, msg = '') {
  res.json({ msg, data, success: true, code: 0 });
}

app.post('/api/project/getProjectList', (req, res) => {
  projectList = getProjectList();
  const colorMap = getProjectColorMap();
  const list = projectList.map(p => ({
    ...p,
    color: colorMap[p.path]?.color,
    groupPath: colorMap[p.path]?.parentPath,
  }));
  ok(res, list);
});

app.post('/api/project/getColorGroups', (req, res) => {
  ok(res, getColorCache());
});

app.post('/api/project/refreshColorCache', (req, res) => {
  const cache = computeColorGroups();
  ok(res, cache);
});

app.post('/api/project/getLogs', (req, res) => {
  res.send({ success: true, data: logs, code: 0, msg: '' });
});

app.post('/api/project/forceRefreshList', (req, res) => {
  projectList = getProjectList();
  ok(res, projectList);
});

app.post('/api/project/importWorkspace', async (req, res) => {
  try {
    const folderPath = req.body?.path;
    if (!folderPath) {
      return res.status(400).send({ success: false, code: 1, msg: '请选择文件夹', data: null });
    }
    const entries = scanWorkspaceFolder(folderPath);
    if (!entries.length) {
      return res.status(400).send({ success: false, code: 2, msg: '该文件夹下未找到含 package.json 的子项目', data: null });
    }
    projectList = addProjects(entries);
    ok(res, { added: entries.length, projectList });
  } catch (error) {
    res.status(500).send({ success: false, code: 3, msg: error.message, data: null });
  }
});

app.post('/api/project/importProject', async (req, res) => {
  try {
    const folderPath = req.body?.path;
    if (!folderPath) {
      return res.status(400).send({ success: false, code: 1, msg: '请选择文件夹', data: null });
    }
    const entry = buildSingleProject(folderPath);
    projectList = addProjects([entry]);
    ok(res, { added: 1, project: entry, projectList });
  } catch (error) {
    res.status(500).send({ success: false, code: 3, msg: error.message, data: null });
  }
});

app.post('/api/project/removeProject', (req, res) => {
  const { path: projectPath } = req.body;
  if (!projectPath) {
    return res.status(400).send({ success: false, code: 1, msg: '缺少 path 参数', data: null });
  }
  projectList = removeProjectByPath(projectPath);
  ok(res, projectList);
});

app.post('/api/project/runCommand', (req, res) => {
  const { path: projectPath, value } = req.body;
  if (!value || !projectPath) return res.status(400).send('缺少参数');

  let resolvedPath;
  try {
    resolvedPath = resolveExistingProjectPath(projectPath);
  } catch (error) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const message = error.message || '项目路径无效';
    appendCommandLog(projectPath, value, { text: message, type: 'error' });
    res.write(`[[E]][错误] ${message}`);
    res.end(`\n❌ ${message}`);
    return;
  }

  let child;
  const key = makeRunKey(resolvedPath, value);

  if (!currentChild[key]) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    try {
      child = spawnProjectScript(resolvedPath, value);
    } catch (error) {
      const message = error.message || '进程启动失败';
      appendCommandLog(resolvedPath, value, { text: message, type: 'error' });
      res.write(`[[E]][错误] ${message}`);
      res.end(`\n❌ ${message}`);
      return;
    }
    currentChild[key] = child;
  } else {
    child = currentChild[key];
    child.stdout.removeAllListeners('data');
    child.stderr.removeAllListeners('data');
  }

  if (!logs[resolvedPath]) logs[resolvedPath] = {};
  if (!logs[resolvedPath][value]) logs[resolvedPath][value] = { logs: [] };
  ensureCommandLog(resolvedPath, value);
  if (!child) return;

  const appendLog = (text, type) => {
    appendCommandLog(resolvedPath, value, { text, type });
  };

  child.stdout.on('data', data => {
    const str = decodeOutput(data);
    appendLog(str);
    res.write(str);
  });

  child.stderr.on('data', data => {
    const str = decodeOutput(data);
    appendLog(str, 'error');
    res.write(`[[E]][错误] ${str}`);
  });

  child.on('error', err => {
    appendLog(err.message, 'error');
    res.write(`[[E]][进程启动失败] ${err.message}`);
    res.end();
    currentChild[key] = null;
  });

  child.on('close', code => {
    const message = code === 0
      ? `\n✅ 进程正常退出（退出码 ${code}）`
      : `\n❌ 进程异常退出（退出码 ${code}）`;
    appendLog(message, code === 0 ? undefined : 'error');
    res.end(message);
    currentChild[key] = null;
  });
});

async function terminateRunningCommand(resolvedPath, value) {
  const key = makeRunKey(resolvedPath, value);
  const child = currentChild?.[key];
  if (!child) return { ok: false, key, killed: false };

  let killRes = await killChild(child, 'SIGINT');
  if (!killRes) {
    killRes = await killChild(child, 'SIGTERM');
  }
  if (!killRes) {
    killRes = await killChild(child, 'SIGKILL');
  }
  currentChild[key] = undefined;
  return { ok: true, key, killed: killRes };
}

app.post('/api/project/stopCommand', async (req, res) => {
  const { value, path: projectPath } = req.body;
  if (!value || !projectPath) {
    return res.status(400).send({ success: false, code: 1, msg: '缺少参数', data: null });
  }
  let resolvedPath;
  try {
    resolvedPath = resolveExistingProjectPath(projectPath);
  } catch (error) {
    return res.send({ msg: error.message, code: 1, success: false, data: null });
  }
  const result = await terminateRunningCommand(resolvedPath, value);
  if (!result.ok) {
    return res.send({ msg: '此项目可能未运行或出错', code: 2, success: false, data: result.key });
  }
  appendCommandLog(resolvedPath, value, { text: '\n⏹ 已暂停', type: 'error' });
  res.send({ msg: '', code: 0, success: result.killed, data: result.killed });
});

app.post('/api/project/closeCommand', async (req, res) => {
  const { value, path: projectPath } = req.body;
  if (!value || !projectPath) {
    return res.status(400).send({ success: false, code: 1, msg: '缺少参数', data: null });
  }
  let resolvedPath;
  try {
    resolvedPath = resolveExistingProjectPath(projectPath);
  } catch (error) {
    return res.send({ msg: error.message, code: 1, success: false, data: null });
  }
  const result = await terminateRunningCommand(resolvedPath, value);
  clearCommandLog(resolvedPath, value);
  res.send({ msg: '', code: 0, success: true, data: result.killed });
});

app.post('/api/project/getRunningList', (req, res) => {
  const result = {};
  Object.keys(currentChild).forEach(key => {
    if (!currentChild[key]) return;
    const { projectPath, command } = parseRunKey(key);
    if (!result[projectPath]) result[projectPath] = [];
    result[projectPath].push(command);
  });
  res.send({ success: true, data: result, code: 0, msg: '' });
});

function openExternalEditor(projectPath, editor) {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  let shellCmd;

  if (editor === 'cursor') {
    if (isWin) {
      shellCmd = `cursor "${projectPath}"`;
    } else if (isMac) {
      shellCmd = `cursor "${projectPath}" 2>/dev/null || open -a Cursor "${projectPath}"`;
    } else {
      shellCmd = `cursor "${projectPath}"`;
    }
  } else {
    shellCmd = `code "${projectPath}"`;
  }

  const cmd = isWin ? 'cmd' : 'sh';
  const args = isWin ? ['/c', shellCmd] : ['-c', shellCmd];
  spawn(cmd, args, { detached: true, stdio: 'ignore' });
}

app.post('/api/project/openInVscode', (req, res) => {
  const { path: projectPath } = req.body;
  try {
    openExternalEditor(projectPath, 'vscode');
    ok(res, null);
  } catch (error) {
    res.status(500).send({ success: false, msg: error.message, data: null, code: 1 });
  }
});

app.post('/api/project/openInCursor', (req, res) => {
  const { path: projectPath } = req.body;
  try {
    openExternalEditor(projectPath, 'cursor');
    ok(res, null);
  } catch (error) {
    res.status(500).send({ success: false, msg: error.message, data: null, code: 1 });
  }
});
