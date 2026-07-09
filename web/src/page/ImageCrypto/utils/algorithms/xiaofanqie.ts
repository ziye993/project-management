import { gilbert2d } from './gilbert';
import { imageDataToInts, intsToImageData } from './pixelPack';
import type { ScrambleAlgorithm, ScrambleOptions } from './types';
import { validateNumberKey } from './types';

/** 小番茄混淆 — Gilbert 曲线，参考 pyscramble / PicEncrypt */
function tomatoTransform(
  imageData: ImageData,
  key: number,
  encrypt: boolean,
): ImageData {
  const { width, height } = imageData;
  const pixels = imageDataToInts(imageData);
  const pixelCount = width * height;
  const offset = Math.round(((Math.sqrt(5) - 1) / 2) * pixelCount * key) % pixelCount;
  const positions = gilbert2d(width, height);
  const loopPosition = pixelCount - offset;
  const newPixels = new Array<number>(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    if (encrypt) {
      if (i < loopPosition) {
        newPixels[positions[i + offset]] = pixels[positions[i]!];
      } else {
        newPixels[positions[i - loopPosition]!] = pixels[positions[i]!];
      }
    } else if (i < loopPosition) {
      newPixels[positions[i]!] = pixels[positions[i + offset]!];
    } else {
      newPixels[positions[i]!] = pixels[positions[i - loopPosition]!];
    }
  }

  return intsToImageData(newPixels, width, height);
}

export const xiaofanqieAlgorithm: ScrambleAlgorithm = {
  id: 'xiaofanqie',
  label: '小番茄混淆',
  needsKey: true,
  keyType: 'number',
  keyRange: { min: 0, max: 1.618, open: true },
  validateKey: (key) => validateNumberKey(key, 0, 1.618, true),
  scramble: (imageData, key, _options?: ScrambleOptions) =>
    tomatoTransform(imageData, Number(key), true),
  unscramble: (imageData, key, _options?: ScrambleOptions) =>
    tomatoTransform(imageData, Number(key), false),
};
