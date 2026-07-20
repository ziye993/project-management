import { formatVersion, parseVersion, type ParsedVersion } from '../utils/version';
import styles from './components.module.less';

export interface VersionParts {
  major: number;
  minor: number;
  patch: number;
  build: number;
  suffix: string;
}

interface VersionInputsProps {
  value: VersionParts;
  onChange: (next: VersionParts) => void;
  disabled?: boolean;
}

function clampSeg(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(999, Math.trunc(n)));
}

export function versionPartsFromString(version: string): VersionParts {
  const parsed = parseVersion(version);
  if (!parsed) {
    return { major: 0, minor: 0, patch: 0, build: 1, suffix: '' };
  }
  return {
    major: parsed.major,
    minor: parsed.minor,
    patch: parsed.patch,
    build: parsed.build,
    suffix: parsed.suffix || '',
  };
}

export function versionPartsToString(parts: VersionParts): string {
  const parsed: ParsedVersion = {
    major: clampSeg(parts.major),
    minor: clampSeg(parts.minor),
    patch: clampSeg(parts.patch),
    build: clampSeg(parts.build),
    suffix: parts.suffix.trim() || null,
  };
  return formatVersion(parsed);
}

export default function VersionInputs(props: VersionInputsProps) {
  const { value, onChange, disabled } = props;
  const preview = versionPartsToString(value);

  const setSeg = (key: keyof Omit<VersionParts, 'suffix'>, raw: string) => {
    const n = clampSeg(Number(raw));
    onChange({ ...value, [key]: n });
  };

  return (
    <div className={styles.versionInputs}>
      <div className={styles.versionRow}>
        {([
          ['major', 'MAJOR'],
          ['minor', 'MINOR'],
          ['patch', 'PATCH'],
          ['build', 'BUILD'],
        ] as const).map(([key, label]) => (
          <label key={key} className={styles.versionField}>
            <span>{label}</span>
            <input
              type="number"
              min={0}
              max={999}
              value={value[key]}
              disabled={disabled}
              onChange={(e) => setSeg(key, e.target.value)}
            />
          </label>
        ))}
        <label className={styles.versionField}>
          <span>后缀</span>
          <input
            type="text"
            value={value.suffix}
            placeholder="可选"
            maxLength={32}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, suffix: e.target.value })}
          />
        </label>
      </div>
      <p className={styles.versionPreview}>预览：<code>{preview}</code></p>
    </div>
  );
}
