export const PATH_MODULE_MAP: Record<string, string> = {
  '/': 'home',
  '/project': 'project',
  '/project/home': 'project',
  '/image': 'image',
  '/image/home': 'image',
  '/television': 'television',
  '/television/home': 'television',
  '/config': 'config',
  '/config/home': 'config',
  '/serverInfo': 'serverInfo',
  '/serverInfo/home': 'serverInfo',
  '/LANSharing': 'LANSharing',
  '/LANSharing/home': 'LANSharing',
  '/swagger': 'swagger',
  '/swagger/home': 'swagger',
  '/dataMock': 'dataMock',
  '/dataMock/home': 'dataMock',
  '/game': 'game',
  '/game/home': 'game',
  '/game/sudoku': 'game',
  '/game/gomoku': 'game',
  '/localChat': 'localChat',
  '/localChat/home': 'localChat',
  '/localChat/profile': 'localChat',
  '/log': 'log',
  '/log/home': 'log',
  '/log/query': 'log',
  '/log/tenants': 'log',
  '/log/workspace': 'log',
  '/planeEditor': 'planeEditor',
  '/planeEditor/home': 'planeEditor',
  '/auth': 'auth',
  '/auth/home': 'auth',
  '/auth/home/detail': 'auth',
};

export function resolveModuleKey(pathname: string): string | null {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (PATH_MODULE_MAP[normalized]) return PATH_MODULE_MAP[normalized];
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length >= 1) {
    const base = `/${segments[0]}`;
    if (PATH_MODULE_MAP[base]) return PATH_MODULE_MAP[base];
  }
  return null;
}
