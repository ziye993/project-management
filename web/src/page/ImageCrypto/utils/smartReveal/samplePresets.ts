import type { RevealParams } from '../algorithms/mirage';
import type { ImageCryptoSettings } from '@/type/imageCryptoSettings';

export interface RevealBounds {
  levelMin: [number, number];
  levelMax: [number, number];
  contrast: [number, number];
  gamma: [number, number];
}

export interface SamplePresetsOptions {
  roundIndex?: number;
  /** 首轮默认 true：各维度独立采样并偏向极值，便于肉眼区分 */
  aggressive?: boolean;
}

/** 首轮探针模板（归一化 0~1），刻意拉开色阶/对比度/伽马组合 */
const AGGRESSIVE_TEMPLATES: [number, number, number, number][] = [
  [0, 1, 0, 0],
  [1, 0, 1, 1],
  [0, 0, 1, 1],
  [1, 1, 0, 0],
  [0, 1, 1, 0],
  [1, 0, 0, 1],
  [0.15, 0.85, 0.5, 0.35],
  [0.85, 0.15, 0.5, 1.65],
  [0, 0.5, 1, 0.5],
  [1, 0.5, 0, 1.5],
  [0.5, 1, 0, 2],
  [0.5, 0, 1, 0.5],
];

const HALTON_BASE = { levelMin: 2, levelMax: 3, contrast: 5, gamma: 7 } as const;

export function boundsFromSettings(settings: ImageCryptoSettings): RevealBounds {
  return {
    levelMin: [settings.revealLevelMin, settings.revealLevelMax],
    levelMax: [settings.revealLevelHighMin, settings.revealLevelHighMax],
    contrast: [settings.revealContrastMin, settings.revealContrastMax],
    gamma: [settings.revealGammaMin, settings.revealGammaMax],
  };
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function halton(index: number, base: number): number {
  let f = 1;
  let r = 0;
  let i = index + 1;
  while (i > 0) {
    f /= base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r;
}

function snapExtreme(t: number, groupIndex: number, dim: number): number {
  const mode = (groupIndex + dim) % 4;
  if (mode === 0) return t * t;
  if (mode === 1) return 1 - (1 - t) ** 2;
  if (mode === 2) return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) ** 2;
  return t;
}

function mapNorm(
  norm: number,
  range: [number, number],
  asGamma: boolean,
): number {
  const v = lerp(range[0], range[1], Math.max(0, Math.min(1, norm)));
  return asGamma ? Number(v.toFixed(2)) : Math.round(v);
}

function fromTemplate(
  template: [number, number, number, number],
  bounds: RevealBounds,
): RevealParams {
  const params: RevealParams = {
    levelMin: mapNorm(template[0], bounds.levelMin, false),
    levelMax: mapNorm(template[1], bounds.levelMax, false),
    contrast: mapNorm(template[2], bounds.contrast, false),
    gamma: mapNorm(template[3], bounds.gamma, true),
  };
  return normalizeRevealParams(params, bounds);
}

function fromHalton(
  groupIndex: number,
  bounds: RevealBounds,
  aggressive: boolean,
): RevealParams {
  const dims: (keyof typeof HALTON_BASE)[] = ['levelMin', 'levelMax', 'contrast', 'gamma'];
  const norms = dims.map((key, dim) => {
    let t = halton(groupIndex + dim * 17, HALTON_BASE[key]);
    if (aggressive) t = snapExtreme(t, groupIndex, dim);
    return t;
  });
  const params: RevealParams = {
    levelMin: mapNorm(norms[0]!, bounds.levelMin, false),
    levelMax: mapNorm(norms[1]!, bounds.levelMax, false),
    contrast: mapNorm(norms[2]!, bounds.contrast, false),
    gamma: mapNorm(norms[3]!, bounds.gamma, true),
  };
  return normalizeRevealParams(params, bounds);
}

function normalizeRevealParams(params: RevealParams, bounds: RevealBounds): RevealParams {
  let { levelMin, levelMax, contrast, gamma } = params;
  levelMin = Math.max(bounds.levelMin[0], Math.min(bounds.levelMin[1], levelMin));
  levelMax = Math.max(bounds.levelMax[0], Math.min(bounds.levelMax[1], levelMax));
  contrast = Math.max(bounds.contrast[0], Math.min(bounds.contrast[1], contrast));
  gamma = Number(Math.max(bounds.gamma[0], Math.min(bounds.gamma[1], gamma)).toFixed(2));

  if (levelMax <= levelMin) {
    const mid = (bounds.levelMin[0] + bounds.levelMax[1]) / 2;
    if (levelMin <= mid) {
      levelMax = Math.min(bounds.levelMax[1], levelMin + Math.max(24, (bounds.levelMax[1] - bounds.levelMin[0]) * 0.35));
    } else {
      levelMin = Math.max(bounds.levelMin[0], levelMax - Math.max(24, (bounds.levelMax[1] - bounds.levelMin[0]) * 0.35));
    }
  }

  return { levelMin, levelMax, contrast, gamma };
}

function presetKey(p: RevealParams) {
  return `${p.levelMin}|${p.levelMax}|${p.contrast}|${p.gamma}`;
}

export function samplePresets(
  bounds: RevealBounds,
  groupCount: number,
  options?: SamplePresetsOptions,
): RevealParams[] {
  const roundIndex = options?.roundIndex ?? 0;
  const aggressive = options?.aggressive ?? roundIndex === 0;
  const presets: RevealParams[] = [];
  const seen = new Set<string>();

  const push = (p: RevealParams) => {
    const key = presetKey(p);
    if (seen.has(key)) return;
    seen.add(key);
    presets.push(p);
  };

  if (aggressive) {
    for (let i = 0; i < AGGRESSIVE_TEMPLATES.length && presets.length < groupCount; i++) {
      push(fromTemplate(AGGRESSIVE_TEMPLATES[i]!, bounds));
    }
  }

  let haltonIndex = 0;
  while (presets.length < groupCount) {
    push(fromHalton(haltonIndex, bounds, aggressive));
    haltonIndex += 1;
    if (haltonIndex > groupCount * 8) break;
  }

  return presets.slice(0, groupCount);
}

export function refineBounds(
  bounds: RevealBounds,
  presets: RevealParams[],
  selectedIndex: number,
  groupCount: number,
  globalBounds?: RevealBounds,
): RevealBounds {
  const halfWidth = (key: keyof RevealBounds) =>
    (bounds[key][1] - bounds[key][0]) / (2 * groupCount);

  const selected = presets[selectedIndex]!;
  const next: RevealBounds = { ...bounds };
  const clampGlobal = (key: keyof RevealBounds, lo: number, hi: number): [number, number] => {
    const g = globalBounds?.[key] ?? bounds[key];
    return [Math.max(g[0], lo), Math.min(g[1], hi)];
  };

  const refine = (
    key: 'levelMin' | 'levelMax' | 'contrast' | 'gamma',
    value: number,
  ) => {
    const hw = halfWidth(key);
    next[key] = clampGlobal(key, value - hw, value + hw);
  };

  refine('levelMin', selected.levelMin);
  refine('levelMax', selected.levelMax);
  refine('contrast', selected.contrast);
  refine('gamma', selected.gamma);

  return next;
}
