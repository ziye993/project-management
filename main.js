import path from 'path';
import { fileURLToPath } from 'url';
import { setRootDir } from './server/src/paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
setRootDir(__dirname);

await import('./server/src/bootstrap.js');
