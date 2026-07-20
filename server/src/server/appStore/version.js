const VERSION_RE =
  /^(?:0|[1-9]\d{0,2})\.(?:0|[1-9]\d{0,2})\.(?:0|[1-9]\d{0,2})\.(?:0|[1-9]\d{0,2})(?:-[A-Za-z0-9][A-Za-z0-9._-]{0,31})?$/;

/**
 * @param {string} version
 * @returns {{ major: number, minor: number, patch: number, build: number, suffix: string|null } | null}
 */
export function parseVersion(version) {
  if (typeof version !== 'string' || !VERSION_RE.test(version)) return null;
  const dash = version.indexOf('-');
  const core = dash === -1 ? version : version.slice(0, dash);
  const suffix = dash === -1 ? null : version.slice(dash + 1);
  const parts = core.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 999)) {
    return null;
  }
  const [major, minor, patch, build] = parts;
  if (major === 0 && minor === 0 && patch === 0 && build === 0) return null;
  return { major, minor, patch, build, suffix };
}

/**
 * @param {{ major: number, minor: number, patch: number, build: number, suffix?: string|null }} parsed
 */
export function formatVersion(parsed) {
  if (!parsed) return '';
  const core = `${parsed.major}.${parsed.minor}.${parsed.patch}.${parsed.build}`;
  return parsed.suffix ? `${core}-${parsed.suffix}` : core;
}

export function isValidVersion(version) {
  return parseVersion(version) != null;
}

function normalizeCompareInput(input) {
  if (typeof input === 'string') {
    return { parsed: parseVersion(input), createdAt: 0 };
  }
  if (input && typeof input === 'object') {
    const version = input.version != null ? input.version : input;
    const parsed = input.parsed || (typeof version === 'string' ? parseVersion(version) : null);
    return {
      parsed,
      createdAt: Number(input.createdAt) || 0,
    };
  }
  return { parsed: null, createdAt: 0 };
}

/**
 * Compare two versions. Positive if a > b, negative if a < b, 0 if equal.
 * Order: MAJOR→MINOR→PATCH→BUILD; same tuple: no suffix > with suffix; then createdAt.
 */
export function compareVersions(a, b) {
  const left = normalizeCompareInput(a);
  const right = normalizeCompareInput(b);
  if (!left.parsed && !right.parsed) return 0;
  if (!left.parsed) return -1;
  if (!right.parsed) return 1;

  const keys = ['major', 'minor', 'patch', 'build'];
  for (const key of keys) {
    const diff = left.parsed[key] - right.parsed[key];
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

/**
 * Suggest next version for an app. No suffix. Throws if MAJOR would exceed 999.
 * @param {{ versions?: Record<string, { status?: string, createdAt?: number }> }} app
 */
export function suggestNext(app) {
  const versions = app?.versions && typeof app.versions === 'object' ? app.versions : {};
  const published = Object.values(versions).filter(
    v => v && v.status === 'published' && isValidVersion(v.version),
  );

  if (!published.length) {
    return '0.0.0.1';
  }

  published.sort((a, b) => compareVersions(b, a));
  const top = parseVersion(published[0].version);
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

/** Major version: no suffix && PATCH===0 && BUILD===0 */
export function isMajorVersion(version) {
  const parsed = typeof version === 'string' ? parseVersion(version) : version;
  if (!parsed) return false;
  return !parsed.suffix && parsed.patch === 0 && parsed.build === 0;
}
