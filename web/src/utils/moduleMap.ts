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
  '/server-info': 'serverInfo',
  '/server-info/home': 'serverInfo',
  '/lan-sharing': 'LANSharing',
  '/lan-sharing/home': 'LANSharing',
  '/swagger': 'swagger',
  '/swagger/home': 'swagger',
  '/data-mock': 'dataMock',
  '/data-mock/home': 'dataMock',
  '/game': 'game',
  '/game/home': 'game',
  '/game/sudoku': 'game',
  '/game/gomoku': 'game',
  '/local-chat': 'localChat',
  '/local-chat/home': 'localChat',
  '/local-chat/profile': 'localChat',
  '/log': 'log',
  '/log/home': 'log',
  '/log/query': 'log',
  '/log/tenants': 'log',
  '/log/workspace': 'log',
  '/plane-editor': 'planeEditor',
  '/plane-editor/home': 'planeEditor',
  '/image-crypto': 'imageCrypto',
  '/image-crypto/scramble': 'imageCrypto',
  '/image-crypto/mirage': 'imageCrypto',
  '/image-crypto/smart-reveal': 'imageCrypto',
  '/image-crypto/blend': 'imageCrypto',
  '/auth': 'auth',
  '/auth/home': 'auth',
  '/auth/detail': 'auth',
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
