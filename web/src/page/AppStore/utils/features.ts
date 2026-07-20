export const APP_STORE_FEATURES = {
  coverUpload: true,
  yankVersion: true,
  branchField: true,
  sha256: false,
  downloadByQueryVersion: false,
};

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

export const APP_STORE_STATIC_PREFIX = '/static/app-store';

export function packageStaticUrl(relativePath?: string | null): string {
  if (!relativePath) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const parts = relativePath.split(/[/\\]/).filter(Boolean).map(encodeURIComponent);
  return `${origin}${APP_STORE_STATIC_PREFIX}/${parts.join('/')}`;
}
