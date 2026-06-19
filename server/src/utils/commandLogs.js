import { readJSONFile, writeJSONFile } from './jsonFile.js';

const LOGS_FILE = 'command-logs.json';
const MAX_LOG_LINES = 500;

let logsCache = {};

export function getCommandLogs(refresh = false) {
  // if (!refresh && logsCache) return logsCache;
  // // logsCache = readJSONFile(LOGS_FILE, {});
  // logsCache={};
  return logsCache;
}

function persistLogs() {
  // writeJSONFile(LOGS_FILE, logsCache || {});
}

export function clearCommandLog(key, command) {
  if (logsCache?.[key]?.[command]) {
    logsCache[key][command].logs = [];
  }
}

export function appendCommandLog(projectPath, command, entry) {
  const logs = getCommandLogs();
  if (!logs[projectPath]) logs[projectPath] = {};
  if (!logs[projectPath][command]) logs[projectPath][command] = { logs: [] };

  logs[projectPath][command].logs.push(entry);
  while (logs[projectPath][command].logs.length > MAX_LOG_LINES) {
    logs[projectPath][command].logs.shift();
  }

  return logs;
}

export function ensureCommandLog(projectPath, command) {
  const logs = getCommandLogs();
  if (!logs[projectPath]) logs[projectPath] = {};
  if (!logs[projectPath][command]) logs[projectPath][command] = { logs: [] };
  return logs;
}
