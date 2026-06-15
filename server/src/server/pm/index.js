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

let projectList = getProjectList();
let currentChild = {};
let logs = {};

const cleanup = () => {
  const keys = Object.keys(currentChild).filter(k => !!currentChild[k]);
  if (!keys.length) return;

  console.log('\nCleaning up child processes...');
  let successCount = 0;
  for (const key of keys) {
    try {
      currentChild[key].kill('SIGTERM');
      successCount += 1;
    } catch (error) {
      console.log(error);
    }
  }
  currentChild = {};
  console.log(`Cleanup done: ${successCount}/${keys.length}`);
};

process.on('SIGINT', () => { cleanup(); process.exit(); });
process.on('SIGTERM', () => { cleanup(); process.exit(); });

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

  let child;
  const key = makeRunKey(projectPath, value);

  if (!currentChild[key]) {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'cmd' : 'sh';
    const args = isWin
      ? ['/c', `cd /d "${projectPath}" && npm run ${value}`]
      : ['-c', `cd "${projectPath}" && npm run ${value}`];
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    child = spawn(cmd, args, { detached: !isWin, stdio: ['ignore', 'pipe', 'pipe'] });
    currentChild[key] = child;
  } else {
    child = currentChild[key];
    child.stdout.removeAllListeners('data');
    child.stderr.removeAllListeners('data');
  }

  if (!logs[projectPath]) logs[projectPath] = {};
  if (!logs[projectPath][value]) logs[projectPath][value] = { logs: [] };
  if (!child) return;

  const appendLog = (text, type) => {
    logs[projectPath][value].logs.push({ text, type });
    if (logs[projectPath][value].logs.length > 100) {
      logs[projectPath][value].logs.shift();
    }
  };

  child.stdout.on('data', data => {
    const str = Buffer.from(data).toString();
    appendLog(str);
    res.write(data);
  });

  child.stderr.on('data', data => {
    const str = Buffer.from(data).toString();
    appendLog(str, 'error');
    res.write(`[[E]][错误] ${data}`);
  });

  child.on('error', err => {
    appendLog(err.message, 'error');
    res.write(`[[E]][进程启动失败] ${err.message}`);
    res.end();
    currentChild[key] = null;
  });

  child.on('close', code => {
    if (code === 0) {
      res.end(`\n✅ 进程正常退出（退出码 ${code}）`);
    } else {
      res.end(`\n❌ 进程异常退出（退出码 ${code}）`);
    }
    currentChild[key] = null;
  });
});

app.post('/api/project/stopCommand', async (req, res) => {
  const { value, path: projectPath } = req.body;
  if (!value || !projectPath) {
    return res.status(400).send({ success: false, code: 1, msg: '缺少参数', data: null });
  }
  const key = makeRunKey(projectPath, value);
  if (currentChild?.[key]) {
    let killRes = await killChild(currentChild[key], 'SIGINT');
    if (!killRes) {
      killRes = await killChild(currentChild[key], 'SIGTERM');
    }
    if (logs[projectPath]) logs[projectPath][value] = undefined;
    currentChild[key] = undefined;
    res.send({ msg: '', code: 0, success: killRes, data: killRes });
  } else {
    res.send({ msg: '此项目可能未运行或出错', code: 2, success: false, data: key });
  }
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

app.post('/api/project/openInVscode', (req, res) => {
  const { path: projectPath } = req.body;
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'cmd' : 'sh';
  const args = isWin ? ['/c', `code "${projectPath}"`] : ['-c', `code "${projectPath}"`];
  try {
    spawn(cmd, args, { detached: true, stdio: 'ignore' });
    ok(res, null);
  } catch (error) {
    res.status(500).send({ success: false, msg: error.message, data: null, code: 1 });
  }
});
