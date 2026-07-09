import { imageDataToInts, intsToImageData, shuffleWithKey } from './pixelPack';
import type { ScrambleAlgorithm } from './types';

function rowTransform(imageData: ImageData, key: string, encrypt: boolean): ImageData {
  const { width: w, height: h } = imageData;
  const pixels = imageDataToInts(imageData);
  const xArray = shuffleWithKey(w, key);
  const total = w * h;
  const newPixels = new Array<number>(total);

  for (let idx = 0; idx < total; idx++) {
    const i = idx % w;
    const j = Math.floor(idx / w);
    const m = xArray[(xArray[j % w]! + i) % w]!;
    if (encrypt) {
      newPixels[idx] = pixels[m + j * w]!;
    } else {
      newPixels[m + j * w] = pixels[idx]!;
    }
  }

  return intsToImageData(newPixels, w, h);
}

export const rowAlgorithm: ScrambleAlgorithm = {
  id: 'row',
  label: '行像素混淆',
  needsKey: true,
  keyType: 'string',
  validateKey: (key) => key.length > 0,
  scramble: (imageData, key) => rowTransform(imageData, String(key), true),
  unscramble: (imageData, key) => rowTransform(imageData, String(key), false),
};
