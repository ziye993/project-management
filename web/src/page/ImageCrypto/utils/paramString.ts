import type { BlendMode, BlendParams } from './algorithms/blend';
import type { BlendParamCodes } from '@/type/imageCryptoSettings';

export function formatBlendParamString(params: BlendParams, codes: BlendParamCodes): string {
  const signNum = (code: string, v: number) => {
    if (v >= 0) return `${code}+${v}`;
    return `${code}${v}`;
  };
  return [
    signNum(codes.exposure, params.exposure),
    signNum(codes.contrast, params.contrast),
    signNum(codes.saturation, params.saturation),
    `${codes.opacity}${params.opacity}`,
    `${codes.blendMode}-${params.blendMode}`,
  ].join(' ');
}

const BLEND_MODES: BlendMode[] = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
];

export function parseBlendParamString(
  input: string,
  codes: BlendParamCodes,
  defaults: BlendParams,
): BlendParams | null {
  const result = { ...defaults };
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return null;

  for (const token of tokens) {
    const modeMatch = token.match(new RegExp(`^${codes.blendMode}-(\\w+)$`));
    if (modeMatch) {
      const mode = modeMatch[1] as BlendMode;
      if (BLEND_MODES.includes(mode)) result.blendMode = mode;
      continue;
    }

    const numMatch = token.match(/^([A-Z]+)([+-]?\d+)$/);
    if (!numMatch) continue;
    const [, code, raw] = numMatch;
    const val = Number(raw);
    if (Number.isNaN(val)) continue;

    if (code === codes.exposure) result.exposure = val;
    else if (code === codes.contrast) result.contrast = val;
    else if (code === codes.saturation) result.saturation = val;
    else if (code === codes.opacity) result.opacity = val;
  }

  return result;
}

export function formatRevealParamString(params: {
  levelMin: number;
  levelMax: number;
  contrast: number;
  gamma: number;
}): string {
  return `L${params.levelMin}-${params.levelMax} C${params.contrast >= 0 ? '+' : ''}${params.contrast} G${params.gamma}`;
}
