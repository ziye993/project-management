import { imageDataToInts, intsToImageData, shuffleWithKey } from './pixelPack';
import type { ScrambleAlgorithm } from './types';

function pixelTransform(imageData: ImageData, key: string, encrypt: boolean): ImageData {
  const { width: w, height: h } = imageData;
  const pixels = imageDataToInts(imageData);
  const xArray = shuffleWithKey(w, key);
  const yArray = shuffleWithKey(h, key);
  const total = w * h;
  const newPixels = new Array<number>(total);

  for (let idx = 0; idx < total; idx++) {
    const i = idx % w;
    const j = Math.floor(idx / w);
    const m = xArray[(xArray[j % w]! + i) % w]!;
    const n = yArray[(yArray[m % h]! + j) % h]!;
    if (encrypt) {
      newPixels[idx] = pixels[m + n * w]!;
    } else {
      newPixels[m + n * w] = pixels[idx]!;
    }
  }

  return intsToImageData(newPixels, w, h);
}

export const pixelAlgorithm: ScrambleAlgorithm = {
  id: 'pixel',
  label: '逐像素混淆',
  needsKey: true,
  keyType: 'string',
  validateKey: (key) => key.length > 0,
  scramble: (imageData, key) => pixelTransform(imageData, String(key), true),
  unscramble: (imageData, key) => pixelTransform(imageData, String(key), false),
};
