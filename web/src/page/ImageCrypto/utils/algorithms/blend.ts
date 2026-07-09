export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten';

export interface BlendParams {
  exposure: number;
  contrast: number;
  saturation: number;
  opacity: number;
  blendMode: BlendMode;
}

export const DEFAULT_BLEND_PARAMS: BlendParams = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  opacity: 100,
  blendMode: 'normal',
};

function clamp(v: number) {
  return Math.max(0, Math.min(255, v));
}

function applyExposureContrastSaturation(
  r: number,
  g: number,
  b: number,
  params: BlendParams,
): [number, number, number] {
  let rf = r;
  let gf = g;
  let bf = b;

  const exp = params.exposure / 100;
  rf = rf * (1 + exp);
  gf = gf * (1 + exp);
  bf = bf * (1 + exp);

  const c = 1 + params.contrast / 100;
  rf = (rf - 128) * c + 128;
  gf = (gf - 128) * c + 128;
  bf = (bf - 128) * c + 128;

  const gray = 0.299 * rf + 0.587 * gf + 0.114 * bf;
  const s = 1 + params.saturation / 100;
  rf = gray + (rf - gray) * s;
  gf = gray + (gf - gray) * s;
  bf = gray + (bf - gray) * s;

  return [clamp(rf), clamp(gf), clamp(bf)];
}

function blendChannel(a: number, b: number, mode: BlendMode): number {
  const af = a / 255;
  const bf = b / 255;
  switch (mode) {
    case 'multiply':
      return clamp(af * bf * 255);
    case 'screen':
      return clamp((1 - (1 - af) * (1 - bf)) * 255);
    case 'overlay':
      return clamp((af < 0.5 ? 2 * af * bf : 1 - 2 * (1 - af) * (1 - bf)) * 255);
    case 'darken':
      return clamp(Math.min(a, b));
    case 'lighten':
      return clamp(Math.max(a, b));
    default:
      return b;
  }
}

export function blendImages(base: ImageData, overlay: ImageData, params: BlendParams): ImageData {
  const w = Math.min(base.width, overlay.width);
  const h = Math.min(base.height, overlay.height);
  const out = new ImageData(w, h);
  const alpha = params.opacity / 100;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const bi = (y * base.width + x) * 4;
      const oi = (y * overlay.width + x) * 4;

      const [br, bg, bb] = applyExposureContrastSaturation(
        base.data[bi]!,
        base.data[bi + 1]!,
        base.data[bi + 2]!,
        { ...params, exposure: 0, contrast: 0, saturation: 0 },
      );
      const [or, og, ob] = applyExposureContrastSaturation(
        overlay.data[oi]!,
        overlay.data[oi + 1]!,
        overlay.data[oi + 2]!,
        params,
      );

      const cr = blendChannel(br, or, params.blendMode);
      const cg = blendChannel(bg, og, params.blendMode);
      const cb = blendChannel(bb, ob, params.blendMode);

      out.data[i] = clamp(br * (1 - alpha) + cr * alpha);
      out.data[i + 1] = clamp(bg * (1 - alpha) + cg * alpha);
      out.data[i + 2] = clamp(bb * (1 - alpha) + cb * alpha);
      out.data[i + 3] = 255;
    }
  }

  return out;
}
