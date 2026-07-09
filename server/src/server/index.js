import { isLogServer } from '../config/deployment.js';
import './openapiProxy/index.js';
import './mock/index.js';
import './proxyStatic/index.js';
import './pm/index.js';
import './localhostChat/index.js';
import './gomoku/index.js';
import './file/index.js';
import './upload/index.js';
import './upload/chunkUpload.js';
import './config/index.js';
import './imageCrypto/index.js';
import './system/index.js';
import './share/index.js';
import './user/index.js';
import './log/index.js';

if (isLogServer()) {
  await import('./auth/index.js');
}
