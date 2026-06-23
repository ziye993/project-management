import os from 'os';
import app from '../../app.js';
import server from '../../serverHttp.js';
import { io } from '../socketIo.js';
import { cleanupProjectProcesses } from '../pm/index.js';
import { getLanAddresses, buildAccessLinks } from '../../utils/accessLinks.js';
import { getServerStatus, getDiskStats } from '../../utils/systemMetrics.js';
import { getConfig } from '../../utils/jsonFile.js';

app.post('/api/system/getLanAddresses', (req, res) => {
  res.json({ success: true, code: 0, data: getLanAddresses(), msg: '' });
});

app.post('/api/system/getServerStatus', async (req, res) => {
  try {
    const status = getServerStatus();
    const disks = await getDiskStats();
    res.json({ success: true, code: 0, data: { ...status, disks }, msg: '' });
  } catch (e) {
    res.status(500).json({ success: false, code: 1, msg: e.message, data: null });
  }
});

app.post('/api/system/getConfig', (req, res) => {
  const config = getConfig(true);
  res.json({
    success: true, code: 0,
    data: {
      publicBaseUrl: config.publicBaseUrl || '',
      hostname: os.hostname(),
    },
    msg: '',
  });
});

app.post('/api/system/shutdown', (req, res) => {
  res.json({ success: true, code: 0, msg: '服务正在关闭', data: null });

  setTimeout(async () => {
    console.log('\nShutting down server...');
    await cleanupProjectProcesses();
    io.close();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 3000);
  }, 200);
});
