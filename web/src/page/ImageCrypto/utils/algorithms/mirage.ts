/** 幻影坦克合成与分离 — 参考 Mirage_Decode (MIT/GPL) */

export interface MirageEncodeConfig {
  innerThreshold: number;
  coverThreshold: number;
  slope: number;
  gap: number;
  isRow: boolean;
  isReverse: boolean;
}

export interface RevealParams {
  levelMin: number;
  levelMax: number;
  contrast: number;
  gamma: number;
}

export const DEFAULT_MIRAGE_ENCODE: MirageEncodeConfig = {
  innerThreshold: 32,
  coverThreshold: 64,
  slope: 0,
  gap: 1,
  isRow: true,
  isReverse: false,
};

function encodeIsCover(
  x: number,
  y: number,
  slope: number,
  gap: number,
  isRow: boolean,
): boolean {
  if (slope === 0) {
    return (isRow ? y : x) % (gap + 1) < gap;
  }
  if (isRow) {
    return (y / slope + x) % (gap + 1) < gap;
  }
  return (x / slope + y) % (gap + 1) < gap;
}

function alignSize(surface: ImageData, inner: ImageData): { surface: ImageData; inner: ImageData } {
  const w = Math.min(surface.width, inner.width);
  const h = Math.min(surface.height, inner.height);
  if (surface.width === w && surface.height === h && inner.width === w && inner.height === h) {
    return { surface, inner };
  }
  const crop = (src: ImageData) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    const tmp = document.createElement('canvas');
    tmp.width = src.width;
    tmp.height = src.height;
    tmp.getContext('2d')!.putImageData(src, 0, 0);
    ctx.drawImage(tmp, 0, 0, w, h, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  };
  return { surface: crop(surface), inner: crop(inner) };
}

export function synthesizeMirage(
  surfaceData: ImageData,
  innerData: ImageData,
  config: MirageEncodeConfig = DEFAULT_MIRAGE_ENCODE,
): ImageData {
  const { surface, inner } = alignSize(surfaceData, innerData);
  const { innerThreshold, coverThreshold, slope, gap, isRow, isReverse } = config;
  const result = new ImageData(surface.width, surface.height);
  const width = surface.width;

  const scaleInner = (v: number, t: number) =>
    Math.floor(
      isReverse ? 255 - t + (v * t) / 255 : (v * t) / 255,
    );
  const scaleCover = (v: number, t: number) =>
    Math.floor(
      isReverse ? (v * (255 - t)) / 255 : t + (v * (255 - t)) / 255,
    );

  const isCoverPixel = (x: number, y: number) => encodeIsCover(x, y, slope, gap, isRow);

  for (let i = 0, x = 0, y = 0; i < result.data.length; i += 4) {
    if (isCoverPixel(x, y)) {
      result.data[i] = scaleCover(surface.data[i]!, coverThreshold);
      result.data[i + 1] = scaleCover(surface.data[i + 1]!, coverThreshold);
      result.data[i + 2] = scaleCover(surface.data[i + 2]!, coverThreshold);
      result.data[i + 3] = surface.data[i + 3]!;
    } else {
      result.data[i] = scaleInner(inner.data[i]!, innerThreshold);
      result.data[i + 1] = scaleInner(inner.data[i + 1]!, innerThreshold);
      result.data[i + 2] = scaleInner(inner.data[i + 2]!, innerThreshold);
      result.data[i + 3] = inner.data[i + 3]!;
    }
    x += 1;
    if (x >= width) {
      x = 0;
      y += 1;
    }
  }

  return result;
}

function adjustLuminance(l: number, params: RevealParams): number {
  let v = Math.max(0, Math.min(l, 255));
  v = Math.pow(v / 255, params.gamma) * 255;
  v = (v - 128) * (1 + params.contrast / 100) + 128;
  return Math.max(0, Math.min(v, 255));
}

export function revealMirage(
  imageData: ImageData,
  params: RevealParams,
  background: 'light' | 'dark',
): ImageData {
  const { levelMin, levelMax } = params;
  const out = new ImageData(imageData.width, imageData.height);
  const data = imageData.data;
  const newData = out.data;

  if (levelMax <= levelMin) {
    const fill = background === 'light' ? 255 : 0;
    for (let i = 0; i < newData.length; i += 4) {
      newData[i] = fill;
      newData[i + 1] = fill;
      newData[i + 2] = fill;
      newData[i + 3] = data[i + 3]!;
    }
    return out;
  }

  const scaleRatio = 255 / (levelMax - levelMin);
  const scale = (v: number) => Math.max(0, Math.min((v - levelMin) * scaleRatio, 255));
  const bg = background === 'light' ? 255 : 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    let l = r * 0.299 + g * 0.587 + b * 0.114;
    l = adjustLuminance(l, params);

    if (l >= levelMin && l <= levelMax) {
      newData[i] = scale(r);
      newData[i + 1] = scale(g);
      newData[i + 2] = scale(b);
      newData[i + 3] = data[i + 3]!;
    } else {
      newData[i] = bg;
      newData[i + 1] = bg;
      newData[i + 2] = bg;
      newData[i + 3] = 255;
    }
  }

  return out;
}
