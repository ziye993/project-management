import path from 'path';
import express from 'express';
import app from './app.js';
import server from './serverHttp.js';
import openUrl from './utils/openUrl.js';
import cache from './cache.js';
import { getHtmlDir } from './paths.js';
import { initDataStorage } from './initDataStorage.js';
import { startMetricsCollector } from './utils/systemMetrics.js';
import { SERVER_PORT } from './const.js';

initDataStorage();
startMetricsCollector(5000);
cache.flushAll();

await import('./server/index.js');

app.use(express.static(getHtmlDir()));

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(getHtmlDir(), 'index.html'));
});

server.listen(SERVER_PORT, '0.0.0.0', () => {
  console.log(`Project management running at http://localhost:${SERVER_PORT}`);
  openUrl(SERVER_PORT);
});
