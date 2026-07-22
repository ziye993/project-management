export type DownloadShellId =
  | 'linux-curl'
  | 'linux-wget'
  | 'macos-curl'
  | 'win-cmd'
  | 'win-ps'
  | 'win-ps-curl';

export interface DownloadShellOption {
  id: DownloadShellId;
  label: string;
  group: 'Linux' | 'macOS' | 'Windows';
}

export const DOWNLOAD_SHELL_OPTIONS: DownloadShellOption[] = [
  { id: 'linux-curl', label: 'curl', group: 'Linux' },
  { id: 'linux-wget', label: 'wget', group: 'Linux' },
  { id: 'macos-curl', label: 'curl', group: 'macOS' },
  { id: 'win-cmd', label: 'CMD (curl)', group: 'Windows' },
  { id: 'win-ps', label: 'PowerShell', group: 'Windows' },
  { id: 'win-ps-curl', label: 'PowerShell (curl)', group: 'Windows' },
];

function escapeDoubleQuotes(s: string) {
  return s.replace(/"/g, '\\"');
}

function escapePsSingleQuotes(s: string) {
  return s.replace(/'/g, "''");
}

/** Sanitize a suggested local filename (no path segments). */
export function suggestDownloadFilename(opts: {
  appSlug?: string;
  originalName?: string | null;
}): string {
  const raw = (opts.originalName || opts.appSlug || 'package').trim() || 'package';
  const base = raw.split(/[/\\]/).pop() || 'package';
  return base.replace(/[<>:"|?*\x00-\x1f]/g, '_');
}

/**
 * Generate a one-liner clients can paste to pull the latest package
 * from the fixed update URL.
 */
export function buildDownloadCommand(opts: {
  shell: DownloadShellId;
  url: string;
  filename: string;
}): string {
  const url = opts.url.trim();
  const filename = (opts.filename.trim() || 'package').replace(/[/\\]/g, '_');
  if (!url) return '';

  switch (opts.shell) {
    case 'linux-curl':
    case 'macos-curl':
      return `curl -fL --progress-bar -o "${escapeDoubleQuotes(filename)}" "${escapeDoubleQuotes(url)}"`;
    case 'linux-wget':
      return `wget --show-progress -O "${escapeDoubleQuotes(filename)}" "${escapeDoubleQuotes(url)}"`;
    case 'win-cmd':
      // Windows 10+ ships curl.exe
      return `curl -fL -o "${escapeDoubleQuotes(filename)}" "${escapeDoubleQuotes(url)}"`;
    case 'win-ps':
      return `Invoke-WebRequest -Uri '${escapePsSingleQuotes(url)}' -OutFile '${escapePsSingleQuotes(filename)}'`;
    case 'win-ps-curl':
      return `curl.exe -fL -o "${escapeDoubleQuotes(filename)}" "${escapeDoubleQuotes(url)}"`;
    default:
      return `curl -fL -o "${escapeDoubleQuotes(filename)}" "${escapeDoubleQuotes(url)}"`;
  }
}
