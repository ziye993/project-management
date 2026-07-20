export const VERSION_INVALID_MSG =
  '版本号须为 0~999 四段，可选 -特殊值；不能为 0.0.0.0，最低 0.0.0.1。';

const VERSION_RE =
  /^(?:0|[1-9]\d{0,2})\.(?:0|[1-9]\d{0,2})\.(?:0|[1-9]\d{0,2})\.(?:0|[1-9]\d{0,2})(?:-[A-Za-z0-9][A-Za-z0-9._-]{0,31})?$/;

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  build: number;
  suffix: string | null;
}

export function parseVersion(version: string): ParsedVersion | null {
  if (typeof version !== 'string' || !VERSION_RE.test(version)) return null;
  const dash = version.indexOf('-');
  const core = dash === -1 ? version : version.slice(0, dash);
  const suffix = dash === -1 ? null : version.slice(dash + 1);
  const parts = core.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 999)) {
    return null;
  }
  const [major, minor, patch, build] = parts;
  if (major === 0 && minor === 0 && patch === 0 && build === 0) return null;
  return { major, minor, patch, build, suffix };
}

export function formatVersion(parsed: Partial<ParsedVersion> | null | undefined): string {
  if (!parsed) return '';
  const major = Number(parsed.major) || 0;
  const minor = Number(parsed.minor) || 0;
  const patch = Number(parsed.patch) || 0;
  const build = Number(parsed.build) || 0;
  const core = `${major}.${minor}.${patch}.${build}`;
  return parsed.suffix ? `${core}-${parsed.suffix}` : core;
}

export function isValidVersion(version: string): boolean {
  return parseVersion(version) != null;
}

function normalizeCompareInput(input: unknown): { parsed: ParsedVersion | null; createdAt: number } {
  if (typeof input === 'string') {
    return { parsed: parseVersion(input), createdAt: 0 };
  }
  if (input && typeof input === 'object') {
    const obj = input as { version?: string; parsed?: ParsedVersion; createdAt?: number };
    const version = obj.version != null ? obj.version : input;
    const parsed = obj.parsed || (typeof version === 'string' ? parseVersion(version) : null);
    return {
      parsed,
      createdAt: Number(obj.createdAt) || 0,
    };
  }
  return { parsed: null, createdAt: 0 };
}

/** Positive if a > b, negative if a < b, 0 if equal. */
export function compareVersions(a: unknown, b: unknown): number {
  const left = normalizeCompareInput(a);
  const right = normalizeCompareInput(b);
  if (!left.parsed && !right.parsed) return 0;
  if (!left.parsed) return -1;
  if (!right.parsed) return 1;

  const keys: Array<keyof ParsedVersion> = ['major', 'minor', 'patch', 'build'];
  for (const key of keys) {
    const diff = Number(left.parsed[key]) - Number(right.parsed[key]);
    if (diff !== 0) return diff;
  }

  const leftHasSuffix = !!left.parsed.suffix;
  const rightHasSuffix = !!right.parsed.suffix;
  if (leftHasSuffix !== rightHasSuffix) {
    return leftHasSuffix ? -1 : 1;
  }
  if (left.parsed.suffix !== right.parsed.suffix) {
    return String(left.parsed.suffix || '').localeCompare(String(right.parsed.suffix || ''));
  }

  return left.createdAt - right.createdAt;
}

/** Client-side suggest from a version string (no suffix). Empty/invalid → 0.0.0.1 */
export function suggestNextFromVersion(latest: string | null | undefined): string {
  if (!latest) return '0.0.0.1';
  const top = parseVersion(latest);
  if (!top) return '0.0.0.1';

  let { major, minor, patch, build } = top;
  build += 1;
  if (build > 999) {
    build = 0;
    patch += 1;
  }
  if (patch > 999) {
    patch = 0;
    minor += 1;
  }
  if (minor > 999) {
    minor = 0;
    major += 1;
  }
  if (major > 999) {
    throw new Error('版本号已达上限');
  }
  return formatVersion({ major, minor, patch, build, suffix: null });
}

export function isMajorVersion(version: string | ParsedVersion | null | undefined): boolean {
  const parsed = typeof version === 'string' ? parseVersion(version) : version;
  if (!parsed) return false;
  return !parsed.suffix && parsed.patch === 0 && parsed.build === 0;
}
