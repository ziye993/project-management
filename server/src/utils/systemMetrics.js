import os from 'os';
import { statfs } from 'fs/promises';
import path from 'path';
import { getDataDir } from '../paths.js';

const startTime = Date.now();
const samples = [];
let prevCpuTimes = null;

function readCpuTimes() {
  return os.cpus().map(cpu => {
    const t = cpu.times;
    return t.user + t.nice + t.sys + t.idle + t.irq;
  });
}

function readCpuIdle() {
  return os.cpus().map(cpu => cpu.times.idle);
}

function calcCpuUsage() {
  const times = readCpuTimes();
  const idles = readCpuIdle();
  if (!prevCpuTimes) {
    prevCpuTimes = { times, idles };
    return 0;
  }
  let totalDiff = 0;
  let idleDiff = 0;
  for (let i = 0; i < times.length; i++) {
    const td = times[i] - prevCpuTimes.times[i];
    const id = idles[i] - prevCpuTimes.idles[i];
    totalDiff += td;
    idleDiff += id;
  }
  prevCpuTimes = { times, idles };
  if (totalDiff === 0) return 0;
  return Math.round((1 - idleDiff / totalDiff) * 1000) / 10;
}

export function recordSample() {
  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const memUsed = memTotal - memFree;
  const sample = {
    ts: Date.now(),
    cpu: calcCpuUsage(),
    memPercent: Math.round((memUsed / memTotal) * 1000) / 10,
    memUsed,
    memTotal,
  };
  samples.push(sample);
  if (samples.length > 720) samples.shift();
  return sample;
}

export function getAverageStats() {
  if (!samples.length) return { cpu: 0, memPercent: 0 };
  const sum = samples.reduce((acc, s) => ({
    cpu: acc.cpu + s.cpu,
    memPercent: acc.memPercent + s.memPercent,
  }), { cpu: 0, memPercent: 0 });
  return {
    cpu: Math.round((sum.cpu / samples.length) * 10) / 10,
    memPercent: Math.round((sum.memPercent / samples.length) * 10) / 10,
  };
}

export async function getDiskStats() {
  const disks = [];
  const targets = process.platform === 'win32'
    ? ['C:\\', 'D:\\', path.parse(getDataDir()).root]
    : ['/', getDataDir()];

  const seen = new Set();
  for (const target of targets) {
    const key = path.normalize(target);
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const stats = await statfs(key);
      const total = stats.bsize * stats.blocks;
      const free = stats.bsize * stats.bavail;
      disks.push({
        path: key,
        total,
        free,
        used: total - free,
        usedPercent: total ? Math.round(((total - free) / total) * 1000) / 10 : 0,
      });
    } catch {
      // statfs may fail on some Windows paths
    }
  }
  return disks;
}

export function getServerStatus() {
  const current = recordSample();
  const avg = getAverageStats();
  const uptime = Date.now() - startTime;

  return {
    current,
    average: avg,
    uptime,
    uptimeText: formatDuration(uptime),
    platform: process.platform,
    arch: os.arch(),
    hostname: os.hostname(),
    cpuCount: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || '',
    nodeVersion: process.version,
    pid: process.pid,
    gpu: {
      available: false,
      note: 'GPU 占用率需系统级驱动工具（如 nvidia-smi），Node 跨平台暂不支持实时 GPU 监控',
    },
    diskIO: {
      available: false,
      note: '磁盘读写速率在 Windows 上需 Performance Counter，当前仅展示磁盘空间占用',
    },
    sampleCount: samples.length,
    sampledSince: startTime,
  };
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}小时${m}分${sec}秒`;
}

export function startMetricsCollector(intervalMs = 5000) {
  recordSample();
  setInterval(recordSample, intervalMs);
}
